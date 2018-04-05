/*
 * once activated, detect voice onset & offset 
 */


function SpeechDetectionSrv(FileSystemSrv, InitAppSrv)
{
    var service                     = {};
    
    // Management of default values:
    // each time I call : service.init
    // 1) take the values defined in window.audioinput (capture) & window.speechcapture (vad) & here
    // 2) overwrite with App defaults (according to init.json)
    // 3) overwrite with possible controllers defaults                 
    
    service.Cfg                     = {};
    
    service.Cfg.mfccCfg             = {};
    service.Cfg.captureCfg          = {};
     
    // hold standard Capture Configuration (obtained from App defaults, if not present takes them from window.audioinput & window.speechcapture
    service.standardCaptureCfg      = {};
    service.standardMfccCfg         = {};     
    
    // How many data chunks should be joined before playing them
    //service.concatenateMaxChunks   = 10;
    
    service.progressCB              = null;
    service.speechCapturedCB        = null;
    service.speechErrorCB           = null;
    service.speechStatusCB          = null;
    
    service.mfccCB                  = null;
     
    service.data2bewritten          = 0;
    service.subsamplingFactor       = 8;
    
    service.speechChunksFolderRoot  = "";
    service.speechChunksFilenameRoot= "";
    service.speechChunksDestination = "";
    service.saveFullSpeech          = false;
    
    service.AUDIO_RESULT_DESTINATION = {
        VOLATILE: 0,
        WAV_FILE: 1
    };    
                
    service.BUFFER_SIZES = {
        BS_512: 512,
        BS_1024: 1024,
        BS_2048: 2048,
        BS_4096: 4096,
        BS_8192: 8192,
        BS_16384: 16384,
        BS_32768: 32768
    };   
    service.clearCounters = function()
    {  
        service.lastTS             = 0;
        service.firstTS            = 0;
        service.firstGetTime       = 0;
        service.captureElapsedTime = 0;
        
        service.audioRawDataQueue  = [];
        service.totalReceivedData  = 0;
//        service.totalPlayedData    = 0;    
        service.packetsNumber      = 0;        
        service.bitRate            = 0;    
        service.data2bewritten     = 0;
        
        service.totalNoOfSpeechEvents   = 0;
        service.totalNoOfSpeechCaptured = 0;
        service.totalNoOfSpeechErrors   = 0;
    };  

    service.clearCounters();
    
    //====================================================================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //====================================================================================================================
    service.init = function(captureCfg, output_chunks, vadCfg, mfccCfg)
    {    
        if (output_chunks)
        {
            service.speechChunksFolderRoot      = output_chunks.output_relpath;
            service.speechChunksFilenameRoot    = output_chunks.chunks_root_name;
        }
        else
        {
            service.speechChunksFolderRoot      = "audio_sentences/temp";
            service.speechChunksFilenameRoot    = "chunk_";          
        }
        
        service.setCaptureCfg(captureCfg);
        service.setMfccCfg(mfccCfg);
        service.setVadCfg(vadCfg);
        
        return service.Cfg;
    };
    
    // receive some cfg params and overwrite the standard values, returns full cfg object    
    service.setCaptureCfg = function (captureCfg)
    {
        service.Cfg.captureCfg = service.getStandardCaptureCfg();
        
        if (captureCfg != null)
        {
            for (item in captureCfg)
                service.Cfg.captureCfg[item] = captureCfg[item];
        }        
        return service.Cfg.captureCfg;
    };    
    
    service.setMfccCfg = function (mfccCfg)
    {
        service.Cfg.mfccCfg = service.getStandardMfccCfg();
        
        if (mfccCfg != null)
        {
            for (item in mfccCfg)
                service.Cfg.mfccCfg[item] = mfccCfg[item];
        }        
        return service.Cfg.mfccCfg;
    };    
    
    service.setVadCfg = function (vadCfg)
    {
        service.Cfg.vadCfg = service.getStandardVadCfg();
        
        if (vadCfg != null)
        {
            for (item in vadCfg)
                service.Cfg.vadCfg[item] = vadCfg[item];
        }        
        return service.Cfg.vadCfg;
    };    

    // first defaults from audioinput & speechcapture, then from App json
    service.getStandardCaptureCfg = function()
    {
        if (window.audioinput )
        {        
            service.standardCaptureCfg = {
                //audioinput JAVA
                nSampleRate             : window.audioinput.DEFAULT["SAMPLERATE"],
                nBufferSize             : window.audioinput.DEFAULT["BUFFER_SIZE"], 
                nChannels               : window.audioinput.DEFAULT["CHANNELS"],
                sFormat                 : window.audioinput.DEFAULT["FORMAT"],
                nAudioSourceType        : window.audioinput.DEFAULT["AUDIOSOURCE_TYPE"],
                //audioinput JS
                nConcatenateMaxChunks   : window.audioinput.DEFAULT["CONCATENATE_MAX_CHUNKS"],
                nNormalize              : window.audioinput.DEFAULT["NORMALIZE"],
                nNormalizationFactor    : window.audioinput.DEFAULT["NORMALIZATION_FACTOR"],
                bStreamToWebAudio       : window.audioinput.DEFAULT["STREAM_TO_WEBAUDIO"],                   

                //audioinput extension JAVA
                nFftSize                : window.audioinput.DEFAULT["FFT_SIZES"],
                nCaptureMode            : window.audioinput.DEFAULT["CAPTURE_MODES"],
                
                //audioinput extension (COMMENTED)
                nFftWindow              : window.audioinput.DEFAULT["fftWindow"],
                nFftAvg                 : window.audioinput.DEFAULT["fftAvg"],
                nFftAvgParams           : window.audioinput.DEFAULT["fftAvgParams"],
            };
        }
        else
            service.standardCaptureCfg = {};
        
        if(InitAppSrv.appData.capture != null)
        {
            for (var item in InitAppSrv.appData.capture)
                service.standardCaptureCfg[item] = InitAppSrv.appData.capture[item];
        }
        return service.standardCaptureCfg;
    };
    
    // first defaults from audioinput & speechcapture, then from App json
    service.getStandardMfccCfg = function()
    {
        service.standardMfccCfg = {
            nNumberOfMFCCParameters       : 12,
            dSamplingFrequency            : 8000.0,
            nNumberofFilters              : 24,
            nWindowLength                 : 256,
            bIsLifteringEnabled           : true,
            nLifteringCoefficient         : 22,
            bCalculate0ThCoeff            : true,
            nWindowDistance               : 80           
        };

        if(InitAppSrv.appData.mfcc != null)
        {
            for (var item in InitAppSrv.appData.mfcc)
                service.standardMfccCfg[item] = InitAppSrv.appData.mfcc[item];
        }        
        return service.standardMfccCfg;
    };
    
    // first defaults from audioinput & speechcapture, then from App json
    service.getStandardVadCfg = function()
    {
        if (window.audioinput )
        {        
            service.standardVadCfg = {
                nAudioResultType                : window.speechcapture.DEFAULT["AUDIO_RESULT_TYPE"], // WAV_BLOB
                nSpeechDetectionThreshold       : window.speechcapture.DEFAULT["SPEECH_DETECTION_THRESHOLD"],
                nSpeechDetectionMinimum         : window.speechcapture.DEFAULT["SPEECH_DETECTION_MIN_LENGTH"],
                nSpeechDetectionMaximum         : window.speechcapture.DEFAULT["SPEECH_DETECTION_MAX_LENGTH"],
                nSpeechDetectionAllowedDelay    : window.speechcapture.DEFAULT["SPEECH_DETECTION_ALLOWED_DELAY"],
                nAnalysisChunkLength            : window.speechcapture.DEFAULT["SPEECH_DETECTION_ANALYSIS_CHUNK_LENGTH"],
                bCompressPauses                 : window.speechcapture.DEFAULT["SPEECH_DETECTION_COMPRESS_PAUSES"],
                bPreferGUM                      : window.speechcapture.DEFAULT["PREFER_GET_USER_MEDIA"],
                bDebugAlerts                    : window.speechcapture.DEFAULT["DEBUG_ALERTS"], // Just for debug
                bDebugConsole                   : window.speechcapture.DEFAULT["DEBUG_CONSOLE"], // Just for debug                        
                bDetectOnly                     : window.speechcapture.DEFAULT["DETECT_ONLY"]            
            };
        }
        else
            service.standardVadCfg = {};
        
        if(InitAppSrv.appData.vad != null)
        {
            for (var item in InitAppSrv.appData.vad)
                service.standardVadCfg[item] = InitAppSrv.appData.vad[item];
        }        
        return service.standardVadCfg;
    };    
    
    service.getCfg = function()
    {
        return service.Cfg;
    };    
    //  end DEFAULT VALUES MANAGEMENT

    //====================================================================================================================
    // COMMANDS
    //====================================================================================================================    
    service.startRawPlayback = function (captureCfg, progressCB, $window) 
    {
        if (captureCfg == null)
            service.captureCfg = service.getStandardCaptureCfg();
        else
            service.captureCfg = captureCfg;
        
        service.captureCfg.captureMode      = window.audioinput.CAPTURE_MODES.WAAPLAY_MODE;
        service.captureCfg.streamToWebAudio = true;        
        service.startRaw(service.captureCfg, progressCB, $window);
    };
    
    service.startRawCapture = function (captureCfg, progressCB, $window) 
    {
        if (captureCfg == null)
            service.captureCfg = service.getStandardCaptureCfg();
        else
            service.captureCfg = captureCfg;    
        
        service.captureCfg.captureMode      = window.audioinput.CAPTURE_MODES.RAWDATA_MODE;
        service.captureCfg.streamToWebAudio = false;        
        service.startRaw(service.captureCfg, progressCB, $window);
    }    
    
    service.startRaw = function (captureCfg, progressCB, $window) 
    {
        try {
            if (window.audioinput && !window.audioinput.isCapturing()) 
            {
                service.clearCounters();
                service.progressCB = progressCB;    

                $window.addEventListener('audioinput', service.onAudioRawInputCapture, false);
                $window.addEventListener('audioinputerror', service.onAudioInputError, false);

                $window.audioinput.start(captureCfg);
                service.firstGetTime = new Date().getTime();
                console.log("Microphone input started!");
            }
        }
        catch (e) {
            alert("startCapture exception: " + e);
        }
    };

    
    service.startFFTCapture = function (captureCfg, progressCB, $window) 
    {
        if (captureCfg == null)
            service.captureCfg = service.standardCaptureCfg;
        else
            service.captureCfg = captureCfg;
        
        try {
            if (window.audioinput && !window.audioinput.isCapturing()) 
            {
                service.clearCounters();
                service.progressCB = progressCB;    
                
                service.captureCfg.captureMode      = $window.audioinput.CAPTURE_MODES.FFTDATA_MODE;
                service.captureCfg.streamToWebAudio = false;

                $window.addEventListener('audiofftinput', service.onAudioFFTInputCapture, false);
                $window.addEventListener('audioinputerror', service.onAudioInputError, false);

                $window.audioinput.start(captureCfg);
                service.firstGetTime = new Date().getTime();
                console.log("Microphone input started!");
            }
        }
        catch (e) {
            alert("startCapture exception: " + e);
        }
    };

    service.stopCapture = function () 
    {
        try {
            if (window.audioinput && window.audioinput.isCapturing()) 
            {
                window.audioinput.stop();
                console.log("Stopped");
            }
        }
        catch (e) {
            alert("stopCapture exception: " + e);
        }
    };   
    
   // Called continuously while Raw Audio Input capture is running.
    service.onAudioRawInputCapture = function (evt)
    {
        try {
            if (evt && evt.data) 
            {
                service.calculateElapsedTime(evt);

                service.audioRawDataQueue   = service.audioRawDataQueue.concat(evt.data);
                var subsampled_data         = service.subsampleData(evt.data, service.subsamplingFactor);
                
                service.progressCB( service.totalReceivedData, 
                                    service.captureElapsedTime, 
                                    service.packetsNumber, 
                                    service.bitRate, evt.params, subsampled_data);
            }
        }
        catch (ex) {
            alert("onAudioRawInputCapture ex: " + ex);
        }
    };   
 
    // Called continuously while Raw Audio Input capture is running.
    service.onAudioFFTInputCapture = function (evt)
    {
        try {
            if (evt && evt.data) 
            {
                service.calculateElapsedTime(evt);
                
                var subsampled_data = service.subsampleData(evt.data, service.subsamplingFactor);
                service.progressCB( service.totalReceivedData,
                                    service.captureElapsedTime, 
                                    service.packetsNumber,
                                    service.bitRate, evt.params, subsampled_data);
                                                                          
                
            }
        }
        catch (ex) {
            alert("onAudioFFTInputCapture ex: " + ex);
        }
    };   
      
    //====================================================================================
    //====================================================================================
    // V A D 
    //====================================================================================
    //====================================================================================
    service.startSpeechDetection = function (captureCfg, vadCfg, $window, onSpeechCaptured, onSpeechError, onSpeechStatus) 
    {
        try {
            if (window.audioinput && !window.audioinput.isCapturing()) 
            {
                service.clearCounters();
                service.speechCapturedCB    = onSpeechCaptured;
                service.speechErrorCB       = onSpeechError;
                service.speechStatusCB      = onSpeechStatus;                

                $window.speechcapture.start(captureCfg, vadCfg, service.onSpeechCaptured, service.onSpeechError, service.onSpeechStatus);
                service.firstGetTime        = new Date().getTime();
                console.log("start Speech Detection");
            }
        }
        catch (e) {
            alert("startCapture exception: " + e);
        }
    };

    service.onSpeechCaptured = function(wavblob, type) {
        
        service.totalNoOfSpeechCaptured++;
        var filename = service.speechChunksFolderRoot + "/" + service.speechChunksFilenameRoot + "_" + service.totalNoOfSpeechCaptured.toString() + ".wav";
        
        if (type === speechcapture.AUDIO_RESULT_TYPE.WAV_BLOB){
            service.saveBlobWav(wavblob, filename, 1)
            .catch(function(error) {
                alert(error.message);
            });
        }
        else
        {
            alert("onSpeechCaptured: unexpected type value (" + type + ")");
            console.log("onSpeechCaptured: unexpected type value (" + type + ")");
        };

    };

    service.onSpeechStatus = function(code) {
        service.totalNoOfSpeechEvents++;

        switch (code) {
            case speechcapture.STATUS.ENCODING_ERROR:
                service.totalNoOfSpeechErrors++;
                console.log("Encoding Error!");
                break;
            case speechcapture.STATUS.CAPTURE_ERROR:
                service.totalNoOfSpeechErrors++;
                console.log("Capture Error!");
                break;
            case speechcapture.STATUS.SPEECH_ERROR:
                service.totalNoOfSpeechErrors++;
                console.log("Speech Error!");
                break;
        }
        service.speechStatusCB(code);
    };   
    
    service.onSpeechError = function (error) {
        service.totalNoOfSpeechErrors++;
//        alert("onSpeechError event recieved: " + JSON.stringify(error));
        service.speechErrorCB(error);
    };
    //====================================================================================
    //====================================================================================
    // M F C C
    //====================================================================================
    //====================================================================================
    // NOTE : If calculated, the 0-th coefficient is added to the end of the vector (for compatibility with HTK).     

    service.getMFCCFromData = function(cb, filepath_noext, data_array){
        if (data_array == null)
            data_array = service.audioRawDataQueue;
        
        service.mfccCB = cb;
        window.cordova_plugin_mfcc.getCoefficientsFromData(service.onMFCCfromDataSuccess, service.Cfg.mfccCfg, filepath_noext, data_array);
    };
    
    service.getMFCCFromFile = function(cb, relpath){
        // in order to test if calculation from file or from data are the same
        //  service.temp = {};service.temp.out_mfcc_file = out_mfcc_file;service.temp.file_tag = file_tag;
        
        service.mfccCB = cb;
        window.cordova_plugin_mfcc.getCoefficientsFromFile(service.onMFCCfromFileSuccess, service.Cfg.mfccCfg, relpath);
    };
    
    service.getMFCCFromFolder = function(cb, relpath){
        
        service.mfccCB = cb;
        window.cordova_plugin_mfcc.getCoefficientsFromFolder(service.onMFCCfromFolderSuccess, service.Cfg.mfccCfg, relpath);
    };
    
    service.onMFCCfromDataSuccess = function(mfcc){
        service.mfccCB(mfcc);
        service.mfccCB = null;
    };
    
    service.onMFCCfromFileSuccess = function(mfcc){
        // window.cordova_plugin_mfcc.getCoefficientsFromData(service.onMFCCfromDataSuccess, null, service.audioRawDataQueue, service.temp.out_mfcc_file, service.temp.file_tag);
        service.mfccCB(mfcc);
        service.mfccCB = null; // comment to test the two methods
    };
    
    service.onMFCCfromFolderSuccess = function(mfcc){
        service.mfccCB(mfcc);
        service.mfccCB = null; // comment to test the two methods
    };
    //====================================================================================
    //====================================================================================
  
    service.setSubSamplingFactor = function(factor)
    {
        service.subsamplingFactor = factor;
    };
    
    service.subsampleData = function(data, factor)
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
    
    service.calculateElapsedTime = function(evt)
    {
        var curr_ts = evt.timeStamp;
        if (!service.firstTS)
        {
            // first packet !! get elapsed in the "global" TS system
            var now_ts_ms   = new Date().getTime();
            var elapsed     = now_ts_ms - service.firstGetTime;

            // remove from local (assuming they could be different) TS system
            service.firstTS = curr_ts - elapsed;
            service.lastTS = service.firstTS;
        }

        service.deltaPackets = curr_ts - service.lastTS;
        service.lastTS = curr_ts;

        // time elapsed since capture start
        service.captureElapsedTime = Math.round (curr_ts - service.firstTS)/1000;                

        service.packetsNumber++;
        service.totalReceivedData += evt.data.length; // in FFT capturing: received packets are N/2 long. so I simulate the real number of data read by 2*data
        service.bitRate = Math.round((service.totalReceivedData/service.captureElapsedTime));

    };
    
    service.changeVolume = function(newvol)
    {
        if (service.captureCfg.captureMode == 1)
            audioinput._micGainNode.gain.value = newvol;
    };
    
    /**
    * Called when a plugin error happens.
     */
    function onAudioInputError(error) 
    {
        alert("onAudioInputError event received: " + JSON.stringify(error));
    };

    //==============================================
    //==============================================
    // SAVE WAVE (don't need Web Audio API support)
    service.saveData2Wav = function(filename, overwrite, data)
    {
        if (data == null)  data = service.audioRawDataQueue

        var blob = service.dataArray2BlobWav(service.captureCfg, data);
        return FileSystemSrv.createFile(filename, blob, overwrite)
        .then(function(){
            return 1;
        })
        .catch(function(error) {
            alert(error.message);
        });
    };
    // returns wav Blob
    service.dataArray2BlobWav = function(captureCfg, data_array)
    {
        var encoder = new WavAudioEncoder(captureCfg.sampleRate, captureCfg.channels);
        encoder.encode([data_array]);
        return encoder.finish("audio/wav");        
    };
    
    //=============================================   
    // convert  a = {gigi:aaa, bimbo:bbb}  ->  b = [{label:gigi, value:aaa}, {label:bimbo, value:bbb}]
    service.Obj2ArrJSON = function(obj)
    {
        var arr = [];
        for (item in obj)
            arr.push({label: item, value:obj[item]});
        return arr; 
    };
    // ================================================================================
    // ==  G E T   A U D I O I N P U T     C O N S T A N T S ==========================
    // ================================================================================
    // ================================================================================
    service.getCapturedData = function()
    {
        return service.audioRawDataQueue;
    };
    service.getInputSources = function()
    {
        return service.Obj2ArrJSON(window.audioinput.AUDIOSOURCE_TYPE);
    };
    service.getSamplingFrequencies = function()
    {
        return service.Obj2ArrJSON(window.audioinput.SAMPLERATE);        
    };   
    service.getCaptureBuffers = function()
    {
        return service.Obj2ArrJSON(window.audioinput.BUFFER_SIZES);        
    };   
    return service;
    // ================================================================================
}

// main_module.service('cpAISrv', cpAISrv);
 main_module.factory('SpeechDetectionSrv', SpeechDetectionSrv);
 
 
 
 /*
  * 
    
//    // Define function called by getUserMedia 
//    service.onVoiceStart = function()
//    {
//        console.log('voice_start'); 
////        service.controller_scope.vad_status = "ON";
//    };
//    service.onVoiceStop = function()
//    {
//        console.log('voice_stop');
////        service.controller_scope.vad_status = "OFF";
//    };
//    service.onVolumeChange = function(volume)
//    {
//        console.log('volume: '+volume);
//    };
    
//    // in service callback, service is: $window
//    service.startUserMedia = function(stream) 
//    {
//        // Create MediaStreamAudioSourceNode
//        service.audioserver_manager.source = service.audioserver_manager.audiocontext.createMediaStreamSource(stream);
//
//        var options = {};
//        var speech = hark(stream, options);
//        speech.on('speaking', service.audioserver_manager.audioserver.onVoiceStart);
//        speech.on('stopped_speaking', service.audioserver_manager.audioserver.onVoiceStop);          
//        speech.on('volume_change', service.audioserver_manager.audioserver.onVolumeChange);     
//        
//        var options = 
//        {
//            source              : service.audioserver_manager.source,
//            voice_stop          : service.audioserver_manager.audioserver.onVoiceStop, 
//            voice_start         : service.audioserver_manager.audioserver.onVoiceStart,
//            controller_scope    : service.audioserver_manager.controller
//        }; 
//        // Create VAD
//        service.audioserver_manager.vad = new VAD(options);                           
//    };  


  */