/*
 * once activated, detect voice onset & offset 
 */


function SpeechDetectionSrv(FileSystemSrv, InitAppSrv, ErrorSrv, $q)
{
    // reference to the plugin js interface
    pluginInterfaceName   = InitAppSrv.getPluginName();
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
    // 1) take the values defined in InitAppSrv (according to config.json)
    // 2) overwrite with possible controllers defaults (which are usually tests)
    Cfg                     = {};
    Cfg.captureCfg          = null;
    Cfg.vadCfg              = null;
    Cfg.captureProfile      = null;
    
    lockMode                = LOCK_TYPES.FREE; //determine if the service is already involved in a task (e.g capturing, waiting for callbacks)
    
    _capturestartCB         = null; // used by capture
    _capturestopCB          = null; // used by capture
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

    _clearCounters = function()
    {  
        lastTS             = 0;
        firstTS            = 0;
        firstGetTime       = 0;
        captureElapsedTime = 0;
        
        audioRawDataQueue  = [];
        totalReceivedData  = 0;
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
            Cfg.captureCfg  = InitAppSrv.getCaptureCfg(captureCfg, captureProfile);
            Cfg.vadCfg      = InitAppSrv.getVadCfg(vadCfg);
            return Cfg;
        }
        else
        {
            ErrorSrv.raiseWarning("SpeechDetectionSrv::init service is locked !");
            return null;
        }
    };
    //==========================================================================
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
                if(_capturestopCB !=  null) _capturestopCB  = onstopCB;    
                else
                {
                    ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::startCapture, _capturestopCB is required but is null", e);
                    return false;                    
                }
                    
                if(_capturestartCB !=  null) _capturestartCB = onstartCB;    
                else
                {
                    ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::startCapture, _capturestartCB is required but is null", e);
                    return false;                    
                }   
                _errorCB                            = errorCB;      
                
                if (captureCfg == null) captureCfg  = _getStandardCaptureCfg();

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
                if(_capturestopCB !=  null) _capturestopCB  = onstopCB;    
                else
                {
                    ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::startCapture, _capturestopCB is required but is null", e);
                    return false;                    
                }
                    
                if(_capturestartCB !=  null) _capturestartCB = onstartCB;    
                else
                {
                    ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::startCapture, _capturestartCB is required but is null", e);
                    return false;                    
                }
                    
                _errorCB                    = errorCB;     

                if (captureCfg == null) captureCfg = _getStandardCaptureCfg();
                
                window.addEventListener('audioinput'    , _onAudioRawInputCapture);
                window.addEventListener('pluginError'   , _onAudioInputError);
                window.addEventListener('capturestopped', _onStopCapture);
                window.addEventListener('capturestarted', _onStartCapture);
                
                firstGetTime    = new Date().getTime();
                pluginInterface.startCapture(captureCfg, mfccCfg);
                return true;
            }
            catch (e) 
            {
                ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::startCapture exception", e);
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
        
        window.removeEventListener('audioinput'     , _onAudioRawInputCapture);
        window.removeEventListener('audioinputerror', _onAudioInputError);
        window.removeEventListener('capturestopped' , _onStopCapture);   
        window.removeEventListener('capturestarted' , _onStartCapture);  
        
        _capturestopCB(data);
        
        _captureprogressCB  = null;
        _capturestopCB      = null;
        _errorCB            = null;
        
    };
    
    //Called when a plugin error happens.
    _onAudioInputError = function(error) 
    {
        ErrorSrv.raiseError(_errorCB, "_onAudioInputError event received: ", error, true);
        lockMode = LOCK_TYPES.FREE;
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
                if(_capturestopCB !=  null) _capturestopCB  = onstopCB;    
                else
                {
                    ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::startCapture, _capturestopCB is required but is null", e);
                    return false;                    
                }
                    
                if(_capturestartCB !=  null) _capturestartCB = onstartCB;    
                else
                {
                    ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::startCapture, _capturestartCB is required but is null", e);
                    return false;                    
                }
                
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

                firstGetTime        = new Date().getTime();
                console.log("start Speech Detection");
                
                pluginInterface.startSpeechRecognition(captureCfg, vadCfg, mfccCfg, tfCfg);
                return true;
            }
            catch (e) {
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
        _speechStatusCB(event.data);
    };   
    
    _onSpeechError = function (error) {
        totalNoOfSpeechErrors++;
        ErrorSrv.raiseError(_errorCB, "SpeechDetectionSrv::_onSpeechError", error);
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
        return Obj2ArrJSON(pluginInterface.ENUM.capture.AUDIOSOURCE_TYPE);
    };
    getSamplingFrequencies = function()
    {
        return Obj2ArrJSON(pluginInterface.ENUM.capture.SAMPLERATE);        
    };   
    getCaptureBuffers = function()
    {
        return Obj2ArrJSON(pluginInterface.ENUM.capture.BUFFER_SIZES);        
    };   
    
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                    : init,
        getCfg                  : getCfg, 
        startMicPlayback        : startMicPlayback,
        startRawCapture         : startRawCapture, 
        stopCapture             : stopCapture,
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

