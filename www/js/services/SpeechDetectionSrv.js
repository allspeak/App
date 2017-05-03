/*
 * once activated, detect voice onset & offset 
 */


function SpeechDetectionSrv(FileSystemSrv, InitAppSrv, ErrorSrv, $q)
{
    // reference to the plugin js interface
    pluginInterfaceName   = InitAppSrv.appData.plugin_interface_name;
    pluginInterface       = null;
    
    LOCK_TYPES = {
        FREE    : 0,
        CAPTURE : 1,
        MFCC    : 2
    }; 
    
    AUDIO_RESULT_DESTINATION = {
        VOLATILE: 0,
        WAV_FILE: 1
    };    
    
    // Management of default values:
    // each time I call : init (captureCfg, captureProfile, output_chunks, vadCfg, mfccCfg)
    // 1) take the values defined in pluginInterface (capture) & pluginInterface (vad) & here
    // 2) overwrite with App defaults (according to init.json)
    // 3) overwrite with possible controllers defaults                 
    Cfg                     = {};
    Cfg.captureCfg          = null;
    Cfg.vadCfg              = null;
    Cfg.captureProfile      = null;
    
    // hold standard Capture Configuration (obtained from App json, if not present takes them from pluginInterface & pluginInterface
    standardCaptureCfg      = null;
    standardVadCfg          = null;     
    
    lockMode                = LOCK_TYPES.FREE; //determine if the service is already involved in a task (e.g capturing, waiting for callbacks)
    
    _captureprogressCB      = null; // used by capture
    _errorCB                = null; // used by all the processes
    _speechCapturedCB       = null; // used by vad
    _speechStatusCB         = null; // used by vad
     
    data2bewritten          = 0;
    subsamplingFactor       = 8;
    
    speechChunksFolderRoot  = "";
    speechChunksFilenameRoot= "";
    speechChunksDestination = "";
    saveFullSpeech          = false;

    micGain                 = null; // ref to audioinput._micGainNode
    
    
    _clearCounters = function()
    {  
        lastTS             = 0;
        firstTS            = 0;
        firstGetTime       = 0;
        captureElapsedTime = 0;
        
        audioRawDataQueue  = [];
        totalReceivedData  = 0;
//        totalPlayedData    = 0;    
        packetsNumber      = 0;        
        bitRate            = 0;    
        data2bewritten     = 0;
        
        totalNoOfSpeechEvents   = 0;
        totalNoOfSpeechCaptured = 0;
        totalNoOfSpeechErrors   = 0;
    };  

    _clearCounters();
    
    //==========================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //==========================================================================
    //
    // PUBLIC ********************************************************************************************************
    /*
     * @param {type} captureCfg
     * @param {type} output_chunks
     * @param {type} vadCfg
     * @returns {Cfg}
     * 
     * TODO call it before displaying a page....and prevent the state change
     */
    init = function(captureCfg, captureProfile, output_chunks, vadCfg)
    {   
        pluginInterface = eval(pluginInterfaceName);
        
        if(lockMode == LOCK_TYPES.FREE)
        {
            if (output_chunks != null)
            {
                speechChunksFolderRoot      = output_chunks.output_relpath;
                speechChunksFilenameRoot    = output_chunks.chunks_root_name;
            }
            else
            {
                speechChunksFolderRoot      = "audio_sentences/temp";
                speechChunksFilenameRoot    = "chunk_";          
            }
            _setCaptureCfg(captureCfg, captureProfile);
            _setVadCfg(vadCfg);
            return Cfg;
        }
        else
        {
            ErrorSrv.raiseWarning("SpeechDetectionSrv::init service is locked !");
            return null;
        }
    };
    
    //--------------------------------------------------------------------------
    // receive some cfg params and overwrite the standard values, returns full cfg object    
    _setCaptureCfg = function (captureCfg, captureProfile)
    {
        Cfg.captureCfg = _getStandardCaptureCfg(captureProfile);
        
        if (captureCfg != null)
        {
            for (item in captureCfg)
                Cfg.captureCfg[item] = captureCfg[item];
        }        
        return Cfg.captureCfg;
    };    
    
    _setVadCfg = function (vadCfg)
    {
        Cfg.vadCfg = _getStandardVadCfg();
        
        if (vadCfg != null)
        {
            for (item in vadCfg)
                Cfg.vadCfg[item] = vadCfg[item];
        }        
        return Cfg.vadCfg;
    };    

    //--------------------------------------------------------------------------
    // first defaults from audioinput, then from App json
    _getStandardCaptureCfg = function(profile)
    {
        if(standardCaptureCfg == null)
        {
            standardCaptureCfg = {
                //audioinput JAVA
                nBufferSize             : pluginInterface.ENUM.capture.DEFAULT["BUFFER_SIZE"], 
                nChannels               : pluginInterface.ENUM.capture.DEFAULT["CHANNELS"],
                sFormat                 : pluginInterface.ENUM.capture.DEFAULT["FORMAT"],
                nAudioSourceType        : pluginInterface.ENUM.capture.DEFAULT["AUDIOSOURCE_TYPE"],
                //audioinput JS
                nConcatenateMaxChunks   : pluginInterface.ENUM.capture.DEFAULT["CONCATENATE_MAX_CHUNKS"],
                nNormalize              : pluginInterface.ENUM.capture.DEFAULT["NORMALIZE"],
                dNormalizationFactor    : pluginInterface.ENUM.capture.DEFAULT["NORMALIZATION_FACTOR"],
                bStreamToWebAudio       : pluginInterface.ENUM.capture.DEFAULT["STREAM_TO_WEBAUDIO"],
                bStartMFCC              : pluginInterface.ENUM.capture.DEFAULT["START_MFCC"],
                bStartVAD               : pluginInterface.ENUM.capture.DEFAULT["START_VAD"],
                nDataDest               : pluginInterface.ENUM.capture.DEFAULT["DATA_DEST"]
            }
//                //audioinput extension JAVA
//                nFftLength                : pluginInterface.DEFAULT["FFT_SIZES"],
//                nCaptureMode            : pluginInterface.DEFAULT["CAPTURE_MODES"],

//                //audioinput extension (COMMENTED)
//                nFftWindow              : pluginInterface.DEFAULT["fftWindow"],
//                nFftAvg                 : pluginInterface.DEFAULT["fftAvg"],
//                nFftAvgParams           : pluginInterface.DEFAULT["fftAvgParams"],
        }
        
        // InitAppSrv.appData could be modified at runtime
        if(profile == null) profile = "record";
        if(InitAppSrv.appData.capture_profiles[profile] != null)
        {
            for (var item in InitAppSrv.appData.capture_profiles[profile])
                standardCaptureCfg[item] = InitAppSrv.appData.capture_profiles[profile][item];
        }
        return standardCaptureCfg;
    };
    
    // first defaults from speechcapture, then from App json
    _getStandardVadCfg = function()
    {
        if(standardVadCfg == null)
        {
            if (pluginInterface )
            {        
                standardVadCfg = {
                    nAudioResultType                : pluginInterface.ENUM.vad.DEFAULT["AUDIO_RESULT_TYPE"], // WAV_BLOB
                    nSpeechDetectionThreshold       : pluginInterface.ENUM.vad.DEFAULT["SPEECH_DETECTION_THRESHOLD"],
                    nSpeechDetectionMinimum         : pluginInterface.ENUM.vad.DEFAULT["SPEECH_DETECTION_MIN_LENGTH"],
                    nSpeechDetectionMaximum         : pluginInterface.ENUM.vad.DEFAULT["SPEECH_DETECTION_MAX_LENGTH"],
                    nSpeechDetectionAllowedDelay    : pluginInterface.ENUM.vad.DEFAULT["SPEECH_DETECTION_ALLOWED_DELAY"],
                    nAnalysisChunkLength            : pluginInterface.ENUM.vad.DEFAULT["SPEECH_DETECTION_ANALYSIS_CHUNK_LENGTH"],
                    bCompressPauses                 : pluginInterface.ENUM.vad.DEFAULT["SPEECH_DETECTION_COMPRESS_PAUSES"],
                    bPreferGUM                      : pluginInterface.ENUM.vad.DEFAULT["PREFER_GET_USER_MEDIA"],
                    bDebugAlerts                    : pluginInterface.ENUM.vad.DEFAULT["DEBUG_ALERTS"], // Just for debug
                    bDebugConsole                   : pluginInterface.ENUM.vad.DEFAULT["DEBUG_CONSOLE"], // Just for debug                        
                    bDetectOnly                     : pluginInterface.ENUM.vad.DEFAULT["DETECT_ONLY"]            
                };
            }
            else
                standardVadCfg = {};
        }
        // InitAppSrv.appData could be modified at runtime
        if(InitAppSrv.appData.vad != null)
        {
            for (var item in InitAppSrv.appData.vad)
                standardVadCfg[item] = InitAppSrv.appData.vad[item];
        }        
        return standardVadCfg;
    };    
    
     // PUBLIC *************************************************************************************************
   getCfg = function()
    {
        return Cfg;
    };    
    //  end DEFAULT VALUES MANAGEMENT

    //==========================================================================
    // COMMANDS
    //==========================================================================
    // PUBLIC **************************************************************************************************
    startMicPlayback = function (captureCfg, onstartCB, onstopCB, errorCB) // no need to provide a progress cb
    {
        if(lockMode == LOCK_TYPES.FREE)
        {        
            try{
                _capturestopCB              = onstopCB;    
                _capturestartCB             = onstartCB;    
                _errorCB                    = errorCB;      
                
                if (captureCfg == null)
                    captureCfg = _getStandardCaptureCfg();
                else
                    captureCfg = captureCfg;

                window.addEventListener('audioinput'    , _onAudioRawInputCapture);
                window.addEventListener('pluginError'   , _onAudioInputError);
                window.addEventListener('capturestopped', _onStopCapture);
                window.addEventListener('capturestarted', _onStartCapture);               
                
                pluginInterface.startMicPlayback(captureCfg);                
                return true;
            }
            catch (e) 
            {
                ErrorSrv.raiseError(_errorCB, "startRawPlayback exception", e);
                lockMode    = LOCK_TYPES.FREE;
                micGain     = null;
                return false;
            }            
        }
        else
        {
            ErrorSrv.raiseWarning("SpeechDetectionSrv::startRawPlayback service is locked !");
            return null;
        }
    };
    
    // PUBLIC **************************************************************************************************
    // it expects that the controller already got the default values and overwrote some of them
    startRawCapture = function (captureCfg, captureprogressCB, onstartCB, onstopCB, errorCB, mfccCfg) 
    {
        if(lockMode == LOCK_TYPES.FREE)
        {
            try 
            {
                if(pluginInterface.isCapturing()){
                    ErrorSrv.raiseError(errorCB, "SpeechDetectionServ::startRawCapture.....should never happen FREE(SpeechDetectionServ), but running(audioinput)!!! ");
                    return false;
                }
                _clearCounters();                
                _captureprogressCB          = captureprogressCB;    
                _capturestopCB              = onstopCB;    
                _capturestartCB             = onstartCB;    
                _errorCB                    = errorCB;     

                if (captureCfg == null)
                    captureCfg = _getStandardCaptureCfg();
                
                window.addEventListener('audioinput'    , _onAudioRawInputCapture);
                window.addEventListener('pluginError'   , _onAudioInputError);
                window.addEventListener('capturestopped', _onStopCapture);
                window.addEventListener('capturestarted', _onStartCapture);
                
                pluginInterface.startCapture(captureCfg, mfccCfg);
                
                firstGetTime    = new Date().getTime();
                return true;
            }
            catch (e) 
            {
                ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::startCapture exception", e);
                pluginInterface.stopCapture();
                lockMode = LOCK_TYPES.FREE;
                return false;
            }
        }
        else
        {
            ErrorSrv.raiseWarning("SpeechDetectionSrv::startRawCapture service is locked !", lockMode);
            return false;
        }
    };

    // PUBLIC ***************************************************************************************************
    getCapturedData = function()
    {
        return audioRawDataQueue;
    }; 

    // PUBLIC ****************************************************************************************************
    stopCapture = function () 
    {
        if(lockMode == LOCK_TYPES.CAPTURE)
        {
            try 
            {
                if(!pluginInterface.isCapturing())
                {
                    ErrorSrv.raiseError(_errorCB, "SpeechDetectionServ::stopCapture.....should never happen CAPTURE(SpeechDetectionServ), but not running(audioinput)!!! ");
                    return false;
                }
                pluginInterface.stopCapture();
            }
            catch (e) 
            {
                ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::stopCapture", e);
                lockMode = LOCK_TYPES.FREE;
                return false;
            }
        }
        else
        {
            ErrorSrv.raiseWarning("SpeechDetectionSrv::stopCapture service is not capturing!");
            return null;
        }         
    };   

    //==========================================================================
    // CAPTURE callbacks from plugin
    //==========================================================================
   // Called continuously while Raw Audio Input capture is running.
    _onAudioRawInputCapture = function (evt)
    {
        try {
            if (evt && evt.data) 
            {
                _calculateElapsedTime(evt);

                audioRawDataQueue   = audioRawDataQueue.concat(evt.data);
                var subsampled_data = _subsampleData(evt.data, subsamplingFactor);
                
                if(_captureprogressCB)  _captureprogressCB( totalReceivedData, 
                                                            captureElapsedTime, 
                                                            packetsNumber, 
                                                            bitRate, evt.params, 
                                                            subsampled_data);
            }
        }
        catch (e) {
            ErrorSrv.raiseError(_errorCB, "onAudioRawInputCapture exception", e);
        }
    };  

    _onStopCapture = function(data) // data.datacaptured & data.dataprocessed & data.bytesread
    {
        console.log("Microphone input STOPPED!");
        lockMode = LOCK_TYPES.FREE;
        micGain  = null;
        window.removeEventListener('audioinput'     , _onAudioRawInputCapture);
        window.removeEventListener('audioinputerror', _onAudioInputError);
        window.removeEventListener('capturestopped' , _onStopCapture);   
        window.removeEventListener('capturestarted' , _onStartCapture);  
        
        if(_capturestopCB != null) _capturestopCB(data);
        
        _captureprogressCB  = null;
        _capturestopCB      = null;
        _errorCB            = null;
        
    };
    
    //Called when a plugin error happens.
    _onAudioInputError = function(error) 
    {
        ErrorSrv.raiseError(_errorCB, "_onAudioInputError event received: ", error, true);
        lockMode = LOCK_TYPES.FREE;
        micGain  = null;        
    };     
 
    _onStartCapture = function()
    {
        console.log("Microphone input STARTED!");
        lockMode = LOCK_TYPES.CAPTURE;
        _capturestartCB();
    };

    //==========================================================================
    //==========================================================================
    // GET SPEECH DATA
    //==========================================================================
    //==========================================================================
    // PUBLIC ******************************************************************************************************
    startSpeechRecognition = function (captureCfg, vadCfg, mfccCfg, tfCfg, onstartCB, onstopCB, cbSpeechCaptured, cbSpeechError, cbSpeechStatus, save_full_speech) 
    {
        if(lockMode == LOCK_TYPES.FREE)
        {        
            try {
                if(pluginInterface.isCapturing()){
                    ErrorSrv.raiseError(cbSpeechError, "SpeechDetectionServ::startSpeechDetection.....should never happen FREE(SpeechDetectionServ), but running(audioinput)!!! ");
                    return false;
                }
                _clearCounters();
                _capturestopCB      = onstopCB;    
                _capturestartCB     = onstartCB;                  
                _speechCapturedCB   = cbSpeechCaptured;
                _errorCB            = cbSpeechError;
                _speechStatusCB     = cbSpeechStatus;     

                if(save_full_speech != null)
                    saveFullSpeech      = save_full_speech;
                else
                    saveFullSpeech      = false;     

                totalNoOfSpeechCaptured = 0;                    

                window.addEventListener('audioinput'        , _onAudioRawInputCapture);
                window.addEventListener('pluginError'       , _onAudioInputError);
                window.addEventListener('capturestopped'    , _onStopCapture);
                window.addEventListener('capturestarted'    , _onStartCapture);
                window.addEventListener('speechstatus'      , _onSpeechStatus);

                pluginInterface.startSpeechRecognition(captureCfg, vadCfg, mfccCfg, tfCfg);
                firstGetTime        = new Date().getTime();
                console.log("start Speech Detection");
                return true;
            }
            catch (e) {
                lockMode = LOCK_TYPES.FREE
//                pluginInterface.stopSpeechRecognition();                
//                return $q.reject(error);
                ErrorSrv.raiseError(_errorCB, "startSpeechRecognition exception", e, true);
            }
        }
        else
        {
            ErrorSrv.raiseWarning("SpeechDetectionSrv::startSpeechDetection service is locked!");
            return null;
        }           
    };

    // PUBLIC ***************************************************************************************************
    stopSpeechRecognition = function () 
    {
        if(lockMode == LOCK_TYPES.CAPTURE)
        {
            pluginInterface.stopSpeechRecognition();
            
            if(saveFullSpeech)
            {
                var wavblob     = pluginInterface.getFullSpeechWavData();
                var filename    = speechChunksFolderRoot + "/full_speech.wav";
                return saveBlobWav(wavblob, filename, 1)     
                .then(function(){
                    lockMode = LOCK_TYPES.FREE;
                    if(speechCapturedCB != null)
                        speechCapturedCB(filename, totalNoOfSpeechCaptured, wavblob); 
                })
                .catch(function(error) {
                    ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::stopSpeechCapture", error);
                    lockMode = LOCK_TYPES.FREE;
                });                
            }
            totalNoOfSpeechCaptured = 0;
        }
        else
        {
            ErrorSrv.raiseWarning("SpeechDetectionSrv::stopSpeechDetection service is not on VAD!");
            return null;
        }         
        
    };
    
    // triggered by external js => notify through callback and not $q
    _onSpeechCaptured = function(wavblob, type) {
        
        totalNoOfSpeechCaptured++;
        var filename = speechChunksFolderRoot + "/" + speechChunksFilenameRoot + "_" + totalNoOfSpeechCaptured.toString() + ".wav";
        
        if (type === speechcapture.AUDIO_RESULT_TYPE.WAV_BLOB){
            return FileSystemSrv.saveFile(filename, wavblob, overwrite)
            .then(function(){
                if(_speechCapturedCB != null)
                    _speechCapturedCB(filename, totalNoOfSpeechCaptured, wavblob);
            })
            .catch(function(error) {
                //TODO: decide what to do .... stop capturing ??
//                pluginInterface.stop();
//                lockMode = LOCK_TYPES.FREE;
                if(_onSpeechError != null) _errorCB(error);
            });
        }
        else
        {
            var str = "onSpeechCaptured: unexpected type value (" + type + ")"
            console.log(str);
            _errorCB({"message": str});
        };

    };

    _onSpeechStatus = function(event) {
        totalNoOfSpeechEvents++;

//        switch (event.data) {
//            case pluginInterface.STATUS.ENCODING_ERROR:
//                totalNoOfSpeechErrors++;
//                console.log("Encoding Error!");
//                break;
//            case pluginInterface.STATUS.CAPTURE_ERROR:
//                totalNoOfSpeechErrors++;
//                console.log("Capture Error!");
//                break;
//            case pluginInterface.STATUS.SPEECH_ERROR:
//                totalNoOfSpeechErrors++;
//                console.log("Speech Error!");
//                break;
//        }
        _speechStatusCB(event.data);
    };   
    
    _onSpeechError = function (error) {
        totalNoOfSpeechErrors++;
        ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::_onSpeechError", error);
    };
    //==============================================
    // PUBLIC ***************************************************************************************************
    // SAVE WAVE (don't need Web Audio API support)
    saveData2Wav = function(filename, overwrite, data)
    {
        if (data == null)  data = audioRawDataQueue;

        var blob = _dataArray2BlobWav(Cfg.captureCfg, data);
        return FileSystemSrv.createFile(filename, blob, overwrite)
        .then(function(){
            return true;
        })        
        .catch(function(error) {
            // ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::_saveBlobWav", error); ....exception is managed by the catch
            return $q.reject(error);
        });;
    };

    // returns wav Blob
    _dataArray2BlobWav = function(captureCfg, data_array)
    {
        var encoder = new WavAudioEncoder(captureCfg.nSampleRate, captureCfg.nChannels);
        encoder.encode([data_array]);
        return encoder.finish("audio/wav");        
    };    

    //==========================================================================
    _setSubSamplingFactor = function(factor)
    {
        subsamplingFactor = factor;
    };
    
    _subsampleData = function(data, factor)
    {
        var l       = data.length;
        var result  = [];
        step        = Math.round(l/factor);  // typical 512/8 = 64
        
        for (st=0; st<step; st++)
        {
            var start   = st*factor;
            var end     = start+factor;
            var average = 0;

            for (i=start; i<end; i++)
                average = average + data[i];
            result.push(average/factor);
        }
        return result;
    };
    
    _calculateElapsedTime = function(evt)
    {
        var curr_ts = evt.timeStamp;
        if (!firstTS)
        {
            // first packet !! get elapsed in the "global" TS system
            var now_ts_ms   = new Date().getTime();
            var elapsed     = now_ts_ms - firstGetTime;

            // remove from local (assuming they could be different) TS system
            firstTS = curr_ts - elapsed;
            lastTS = firstTS;
        }

        deltaPackets = curr_ts - lastTS;
        lastTS = curr_ts;

        // time elapsed since capture start
        captureElapsedTime = Math.round (curr_ts - firstTS)/1000;                

        packetsNumber++;
        totalReceivedData += evt.data.length; // in FFT capturing: received packets are N/2 long. so I simulate the real number of data read by 2*data
        bitRate = Math.round((totalReceivedData/captureElapsedTime));

    };

    // PUBLIC ********************************************************************************************
    setPlayBackPercVol = function(newperc)
    {
       // limit between 0-100
       var newperc  = Math.max(newperc, 0); newperc = Math.min(newperc, 100);
        pluginInterface.setPlayBackPercVol(newperc);
    };
    //=============================================   
    // convert  a = {gigi:aaa, bimbo:bbb}  ->  b = [{label:gigi, value:aaa}, {label:bimbo, value:bbb}]
    Obj2ArrJSON = function(obj)
    {
        var arr = [];
        for (item in obj)
            arr.push({label: item, value:obj[item]});
        return arr; 
    };
    // =========================================================================
    // ==  G E T   A U D I O I N P U T     C O N S T A N T S ===================
    // =========================================================================
    getInputSources = function()
    {
        return Obj2ArrJSON(pluginInterface.AUDIOSOURCE_TYPE);
    };
    getSamplingFrequencies = function()
    {
        return Obj2ArrJSON(pluginInterface.SAMPLERATE);        
    };   
    getCaptureBuffers = function()
    {
        return Obj2ArrJSON(pluginInterface.BUFFER_SIZES);        
    };   
    
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                    : init,
        getCfg                  : getCfg, 
        startMicPlayback        : startMicPlayback,
        startRawCapture         : startRawCapture, 
//        startFFTCapture         : startFFTCapture, 
        stopCapture             : stopCapture,
        saveData2Wav            : saveData2Wav,
        startSpeechRecognition  : startSpeechRecognition,
        stopSpeechRecognition   : stopSpeechRecognition,
        setPlayBackPercVol      : setPlayBackPercVol,
        getCapturedData         : getCapturedData,
        getInputSources         : getInputSources,
        getSamplingFrequencies  : getSamplingFrequencies,
        getCaptureBuffers       : getCaptureBuffers
        
    };    
}

main_module.service('SpeechDetectionSrv', SpeechDetectionSrv);





































//                
//    BUFFER_SIZES = {
//        BS_512: 512,
//        BS_1024: 1024,
//        BS_2048: 2048,
//        BS_4096: 4096,
//        BS_8192: 8192,
//        BS_16384: 16384,
//        BS_32768: 32768
//    }; 
//    
//    
//    // PUBLIC ***************************************************************************************************
//    startFFTCapture = function (captureCfg, captureprogressCB, errorCB) 
//    {
//        if(lockMode == LOCK_TYPES.FREE)
//        {
//            try {
//                if (!pluginInterface.isCapturing()) 
//                {
//                    if (captureCfg == null)
//                        captureCfg = standardCaptureCfg;
//                    else
//                        captureCfg = captureCfg;
//                    
//                    _clearCounters();
//                    _captureprogressCB          = captureprogressCB;    
//                    _errorCB                    = errorCB;     
//
//                    captureCfg.captureMode      = pluginInterface.CAPTURE_MODES.FFTDATA_MODE;
//                    captureCfg.streamToWebAudio = false;
//
//                    window.addEventListener('audiofftinput', _onAudioFFTInputCapture, false);
//                    window.addEventListener('audioinputerror', _onAudioInputError, false);
//
//                    pluginInterface.startCapture(captureCfg);
//                    firstGetTime = new Date().getTime();
//                    console.log("Microphone input started!");
//                    lockMode = LOCK_TYPES.CAPTURE;
//                    
//                    return true;
//                }
//            }
//            catch (e) {
//                ErrorSrv.raiseError(_errorCB, "startFFTCapture exception", e);
//                return false;
//            }
//        }
//        else
//        {
//            ErrorSrv.raiseWarning("SpeechDetectionSrv::startFFTCapture service is locked !");
//            return null;
//        }            
//    };

 
//    // Called continuously while Raw Audio Input capture is running.
//    _onAudioFFTInputCapture = function (evt)
//    {
//        try {
//            if (evt && evt.data) 
//            {
//                _calculateElapsedTime(evt);
//                
//                var subsampled_data = _subsampleData(evt.data, subsamplingFactor);
//                _captureprogressCB( totalReceivedData,
//                                    captureElapsedTime, 
//                                    packetsNumber,
//                                    bitRate, evt.params, subsampled_data);
//            }
//        }
//        catch (e) {
//            ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::onAudioFFTInputCapture", e);
//        }
//    };   
// 