/*
 * once activated, detect voice onset & offset 
 */


function SpeechDetectionSrv(FileSystemSrv)
{
    var service = {};

    service.speechChunksFolderRoot      = "";
    service.speechChunksFilenameRoot    = "";
    service.speechChunksDestination     = "";
    
    service.AUDIO_RESULT_DESTINATION = {
            VOLATILE: 0,
            WAV_FILE: 1
        },    
    
    
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
    
    
    service.setCfg = function (captureCfg)
    {
        service.captureCfg = service.getStandardCaptureCfg();
        
        if (captureCfg)
        {
            for (item in captureCfg)
                service.captureCfg[item] = captureCfg[item];
        }        
        return service.captureCfg;
    };
    
    
    service.init = function(captureCfg, output_chunks)
    {    
        service.setCfg(captureCfg);
        
        service.speechChunksFolderRoot      = output_chunks.output_relpath;
        service.speechChunksFilenameRoot    = output_chunks.chunks_root_name;
        service.speechChunksDestination     = output_chunks.chunks_destination;
    }
    // How many data chunks should be joined before playing them
    //service.concatenateMaxChunks   = 10;
    
    service.progressCB             = null;
    service.speechCapturedCB       = null;
    service.speechErrorCB          = null;
    service.speechStatusCB         = null;
     
    service.data2bewritten          = 0;
    service.subsamplingFactor       = 8;
    
    // set standard Capture Configuration
    service.standardCaptureCfg      = {};
    
    
    service.getStandardCaptureCfg = function()
    {
        if (window.audioinput)
        {        
            service.standardCaptureCfg = {
                        //audioinput
                        sampleRate: window.audioinput.SAMPLERATE["TELEPHONE_8000Hz"],
                        bufferSize: 16384, //window.audioinput.DEFAULT["BUFFER_SIZE"], 
                        channels: window.audioinput.DEFAULT["CHANNELS"],
                        format: window.audioinput.DEFAULT["FORMAT"],
                        audioSourceType: window.audioinput.AUDIOSOURCE_TYPE["DEFAULT"],
                        streamToWebAudio: window.audioinput.DEFAULT["STREAM_TO_WEBAUDIO"],
                        
                        //audioinput extension
                        captureMode: window.audioinput.DEFAULT["CAPTURE_MODES"],
                        fftSize: window.audioinput.DEFAULT["FFT_SIZES"],
                        fftWindow: window.audioinput.DEFAULT["fftWindow"],
                        fftAvg: window.audioinput.DEFAULT["fftAvg"],
                        fftAvgParams: window.audioinput.DEFAULT["fftAvgParams"],

                        // speech capture library
                        audioResultType: window.speechcapture.DEFAULT["AUDIO_RESULT_TYPE"], // WAV_BLOB
                        speechDetectionThreshold: window.speechcapture.DEFAULT["SPEECH_DETECTION_THRESHOLD"],
                        speechDetectionMinimum: window.speechcapture.DEFAULT["SPEECH_DETECTION_MIN_LENGTH"],
                        speechDetectionMaximum: window.speechcapture.DEFAULT["SPEECH_DETECTION_MAX_LENGTH"],
                        speechDetectionAllowedDelay: window.speechcapture.DEFAULT["SPEECH_DETECTION_ALLOWED_DELAY"],
                        analysisChunkLength: window.speechcapture.DEFAULT["SPEECH_DETECTION_ANALYSIS_CHUNK_LENGTH"],
                        compressPauses: window.speechcapture.DEFAULT["SPEECH_DETECTION_COMPRESS_PAUSES"],
                        preferGUM: window.speechcapture.DEFAULT["PREFER_GET_USER_MEDIA"],
                        detectOnly: window.speechcapture.DEFAULT["DETECT_ONLY"],
                        debugAlerts: window.speechcapture.DEFAULT["DEBUG_ALERTS"], // Just for debug
                        debugConsole: window.speechcapture.DEFAULT["DEBUG_CONSOLE"] // Just for debug                        
            };
        }
        else
            service.standardCaptureCfg = {}

        return service.standardCaptureCfg;
    }
   
    service.startRawPlayback = function (captureCfg, progressCB, $window) 
    {
        try 
        {
            if (window.audioinput && !window.audioinput.isCapturing()) 
            {        
                service.setCfg(captureCfg);

                service.captureCfg.captureMode      = window.audioinput.CAPTURE_MODES.WAAPLAY_MODE;
                service.captureCfg.streamToWebAudio = true;        
                service.startRaw(service.captureCfg, progressCB, $window);
            }
        }
        catch (e) {
            alert("startCapture exception: " + e);
        }        
    };
    
    service.startRawCapture = function (captureCfg, progressCB, $window) 
    {
        try 
        {
            if (window.audioinput && !window.audioinput.isCapturing()) 
            { 
                service.setCfg(captureCfg);   

                service.captureCfg.captureMode      = window.audioinput.CAPTURE_MODES.RAWDATA_MODE;
                service.captureCfg.streamToWebAudio = false;        
                service.startRaw(service.captureCfg, progressCB, $window);
            }
        } 
        catch (e) {
            alert("startCapture exception: " + e);
        }        
    };
    
    service.startRaw = function (captureCfg, progressCB, $window) 
    {
        service.clearCounters();
        service.progressCB = progressCB;    

        $window.addEventListener('audioinput', service.onAudioRawInputCapture, false);
        $window.addEventListener('audioinputerror', service.onAudioInputError, false);

        $window.audioinput.start(captureCfg);
        service.firstGetTime = new Date().getTime();
        console.log("Microphone input started!");
    };

    service.startFFTCapture = function (captureCfg, progressCB, $window) 
    {
        try 
        {
            if (window.audioinput && !window.audioinput.isCapturing()) 
            {
                service.setCfg(captureCfg);
                service.clearCounters();
                service.progressCB = progressCB;    
                
                service.captureCfg.captureMode      = $window.audioinput.CAPTURE_MODES.FFTDATA_MODE;
                service.captureCfg.streamToWebAudio = false;

                $window.addEventListener('audiofftinput', service.onAudioFFTInputCapture, false);
                $window.addEventListener('audioinputerror', service.onAudioInputError, false);

                $window.audioinput.start(service.captureCfg);
                service.firstGetTime = new Date().getTime();
                console.log("Microphone input started!");
            }
        }
        catch (e) {
            alert("startCapture exception: " + e);
        }
    };

    service.stopRawCapture = function () 
    {
        try {
            if (window.audioinput && window.audioinput.isCapturing()) 
            {
                window.audioinput.stop();
                window.removeEventListener('audioinput', service.onAudioRawInputCapture, false);
                window.removeEventListener('audioinputerror', service.onAudioInputError, false);                 
                console.log("Stopped");
            }
        }
        catch (e) {
            alert("stopCapture exception: " + e);
        }
    };   
    
    service.stopFFTCapture = function () 
    {
        try {
            if (window.audioinput && window.audioinput.isCapturing()) 
            {
                window.removeEventListener('audiofftinput', service.onAudioFFTInputCapture, false);
                window.removeEventListener('audioinputerror', service.onAudioInputError, false);                
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

                service.audioRawDataQueue = service.audioRawDataQueue.concat(evt.data);
                var subsampled_data = service.subsampleData(evt.data, service.subsamplingFactor);
                
                service.progressCB( service.totalReceivedData, 
                                    service.captureElapsedTime, 
                                    service.packetsNumber, 
                                    service.bitRate, evt.params, subsampled_data);
            }
        }
        catch (ex) {
            alert(" onAudioRawInputCapture ex: " + ex);
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
    service.startSpeechDetection = function (captureCfg, $window, onSpeechCaptured, onSpeechError, onSpeechStatus) 
    {
        try 
        {
            if (window.audioinput && !window.audioinput.isCapturing()) 
            {
                service.setCfg(captureCfg);                
                service.clearCounters();
                service.speechCapturedCB       = onSpeechCaptured;
                service.speechErrorCB          = onSpeechError;
                service.speechStatusCB         = onSpeechStatus;                

                $window.speechcapture.start(captureCfg, service.onSpeechCaptured, service.onSpeechError, service.onSpeechStatus);
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
            .catch(function(error){
                
            });
        }
        else
        {
            alert("onSpeechCaptured: unexpected type value (" + type + ")");
            console.log("onSpeechCaptured: unexpected type value (" + type + ")");
        }
            if(service.speechCapturedCB != null)
                service.speechCapturedCB(wavblob);
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
    } ;  
    
    service.onSpeechError = function (error) {
        service.totalNoOfSpeechErrors++;
//        alert("onSpeechError event recieved: " + JSON.stringify(error));
        service.speechErrorCB(error);
    };
    
    service.stopSpeechCapture = function () 
    {
        try {
            speechcapture.stop();
        }
        catch (e) {
            alert("stopCapture exception: " + e);
        }
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
    }
    
    /**
    * Called when a plugin error happens.
     */
    function onAudioInputError(error) 
    {
        alert("onAudioInputError event received: " + JSON.stringify(error));
    };
    
    service.getStdCaptureCfg = function()
    {
        return service.standardCaptureCfg;
    };
    //==============================================
    //==============================================
    // SAVE WAVE (don't need Web Audio API support)
    service.saveData2Wav = function(filename, overwrite, data)
    {
        if (data === null)  data = service.audioRawDataQueue

        var blob = service.dataArray2Wave(service.captureCfg, data);
        return FileSystemSrv.saveFile(filename, blob, overwrite)
        .then(function(){return 1});
    };
    // returns wav Blob
    service.dataArray2BlobWav = function(captureCfg, data_array)
    {
        var encoder = new WavAudioEncoder(captureCfg.sampleRate, captureCfg.channels);
        encoder.encode([data_array]);
        return encoder.finish("audio/wav");        
    };
    service.saveBlobWav = function(blob, filename, overwrite)
    {
        return FileSystemSrv.saveFile(filename, blob, overwrite)
        .then(function(){return 1});
    };
    

    
    //=============================================   
    // convert  a = {gigi:aaa, bimbo:bbb}  ->  b = [{label:gigi, value:aaa}, {label:bimbo, value:bbb}]
    service.Obj2ArrJSON = function(obj)
    {
        var arr = [];
        for (item in obj)
            arr.push({label: item, value:obj[item]});
        return arr;
    }
    
    service.getSource = function() 
    {
        if (ionic.Platform.isAndroid()) {
            source = 'android_asset/www/' + source;
            return source;
        }
        else {   return source;  }
    };

    // ================================================================================
    // ==  G E T   A U D I O I N P U T     C O N S T A N T S ==========================
    // ================================================================================
    // ================================================================================
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

// main_module.service('SpeechDetectionSrv', SpeechDetectionSrv);
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
 
 
 
 /*
  * cfg = {
  // The sample rate to use for capturing audio. Not supported on all platforms.
  sampleRate: 22050, // Hz

  // Threshold for capturing speech.
  // The audio level must rise to at least the threshold for speech capturing to start.
  speechDetectionThreshold: 15,  // dB

  // The minimum length of speech to capture.
  speechDetectionMinimum: 500, // mS

  // The maximum length of the captured speech.
  speechDetectionMaximum: 10000, // mS

  // The maximum allowed delay, before speech is considered to have ended.
  speechDetectionAllowedDelay: 400, // mS

  // The length of the audio chunks that are analyzed.
  // Shorter gives better results, while longer gives better performance.
  analysisChunkLength: 100, // mS

  // Removes long pauses from the captured output.
  compressPauses: false,

  // Do not capture any data, just speech detection events. 
  // The result audio result type is automatically set to speechcapture.AUDIO_RESULT_TYPE.DETECTION_ONLY.
  detectOnly: false,

  // Specifies the type of result produce when speech is captured.
  // For convenience, use the speechcapture.AUDIO_RESULT_TYPE constants to set this parameter:
  // -WAV_BLOB (1) - WAV encoded Audio blobs
  // -WEBAUDIO_AUDIOBUFFER (2) - Web Audio API AudioBuffers
  // -RAW_DATA (3) - Float32Arrays with the raw audio data
  // -DETECTION_ONLY (4) - Used automatically when detectOnly is true
  audioResultType: speechcapture.AUDIO_RESULT_TYPE.WAV_BLOB,
  audioContext: null,

  // Only applicable if cordova-plugin-audioinput is used as the audio source.
  // Specifies the type of the type of source audio your app requires.
  //
  // For convenience, use the audioinput.AUDIOSOURCE_TYPE constants of the audioinput plugin to set this parameter:
  // -DEFAULT (0) - The default audio source of the device.
  // -CAMCORDER (5) - Microphone audio source with same orientation as camera if available.
  // -UNPROCESSED (9) - Unprocessed sound if available.
  // -VOICE_COMMUNICATION (7) - Tuned for voice communications such as VoIP.
  // -MIC (1) - Microphone audio source. (Android only)
  // -VOICE_RECOGNITION (6) - Tuned for voice recognition if available (Android only)
  //
  // For speech detection either VOICE_COMMUNICATION (7) or VOICE_RECOGNITION (6) is preferred.
  //
  audioSourceType: audioinput.AUDIOSOURCE_TYPE.DEFAULT,

  // Prefer audio input using getUserMedia and use cordova-plugin-audioinput only as a fallback. Only useful if both are supported by the current platform.
  preferGUM: false,

  // Use window.alert and/or window.console to show errors
  debugAlerts: false, 
  debugConsole: false
}
  */