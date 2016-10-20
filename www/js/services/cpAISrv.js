/*
 * once activated, detect voice onset & offset 
 */


function cpAISrv($cordovaFile)
{
    var service = {};
//    var self = service;
//    var that = service;

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
    };  

    service.clearCounters();
    
    // How many data chunks should be joined before playing them
    //service.concatenateMaxChunks   = 10;
    
    service.controller_scope       = {};
     
    service.data2bewritten         = 0;
    service.subsamplingFactor      = 8;
    
    // set standard Capture Configuration
    service.standardCaptureCfg = {};
    if (window.audioinput)
    {
        service.standardCaptureCfg = {
                    sampleRate: window.audioinput.SAMPLERATE["TELEPHONE_8000Hz"],
                    bufferSize: 512, //window.audioinput.DEFAULT["BUFFER_SIZE"], 
                    channels: window.audioinput.DEFAULT["CHANNELS"],
                    format: window.audioinput.DEFAULT["FORMAT"],
                    audioSourceType: window.audioinput.AUDIOSOURCE_TYPE["DEFAULT"],
                    streamToWebAudio: window.audioinput.DEFAULT["STREAM_TO_WEBAUDIO"],
                    fftSize: window.audioinput.DEFAULT["FFT_SIZES"],
                    captureMode: window.audioinput.DEFAULT["FFT_SIZES"],
                    fftWindow: window.audioinput.DEFAULT["fftWindow"],
                    fftAvg: window.audioinput.DEFAULT["fftAvg"],
                    fftAvgParams: window.audioinput.DEFAULT["fftAvgParams"]
        };
    }
   
    service.startRawPlayback = function (captureCfg, $scope, $window) 
    {
        if (captureCfg == null)
            service.captureCfg = service.standardCaptureCfg;
        else
            service.captureCfg = captureCfg;
        
        service.captureCfg.captureMode      = $window.audioinput.CAPTURE_MODES.WAAPLAY_MODE;
        service.captureCfg.streamToWebAudio = true;        
        service.startRaw(service.captureCfg, $scope, $window);
    }
    
    service.startRawCapture = function (captureCfg, $scope, $window) 
    {
        if (captureCfg == null)
            service.captureCfg = service.standardCaptureCfg;
        else
            service.captureCfg = captureCfg;    
        
        service.captureCfg.captureMode      = $window.audioinput.CAPTURE_MODES.RAWDATA_MODE;
        service.captureCfg.streamToWebAudio = false;        
        service.startRaw(service.captureCfg, $scope, $window);
    }    
    
    service.startRaw = function ($scope, $window) 
    {
        try {
            if ($window.audioinput && !$window.audioinput.isCapturing()) 
            {
                service.clearCounters();
                service.controller_scope = $scope;    
                
                service.captureCfg.captureMode      = $window.audioinput.CAPTURE_MODES.WAAPLAY_MODE;
                service.captureCfg.streamToWebAudio = true;

                $window.addEventListener('audioinput', service.onAudioRawInputCapture, false);
                $window.addEventListener('audioinputerror', service.onAudioInputError, false);

                $window.audioinput.start(service.captureCfg);
                service.firstGetTime        = new Date().getTime();
                console.log("Microphone input started!");
            }
        }
        catch (e) {
            alert("startCapture exception: " + e);
        }
    };
    
    service.startFFTCapture = function (captureCfg, scope, $window) 
    {
        if (captureCfg == null)
            service.captureCfg = service.standardCaptureCfg;
        else
            service.captureCfg = captureCfg;
        
        try {
            if ($window.audioinput && !$window.audioinput.isCapturing()) 
            {
                service.clearCounters();
                service.controller_scope            = scope;    
                
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
    
    // don't need Web Audio API support
    service.save2Wave = function(filename)
    {
       service.saveArray2Wave(service.captureCfg, service.audioRawDataQueue, filename);
    };
    
    service.saveArray2Wave = function(captureCfg, data_array, filename)
    {
        service.sentencesAudioFolder = cordova.file.DataDirectory;        
        console.log("Encoding WAV...");
        var encoder = new WavAudioEncoder(captureCfg.sampleRate, captureCfg.channels);
        encoder.encode([data_array]);

        console.log("Encoding WAV finished");

        var blob = encoder.finish("audio/wav");
        console.log("BLOB created");
        if (filename == null)
        {
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dir) 
            {
                dir.getFile(filename, {create: true}, function (file) 
                {
                    file.createWriter(function (fileWriter) { fileWriter.write(blob);},
                                      function () { alert("FileWriter error!"); });
                });
            });        
        }
        else
        {
//            $cordovaFile.checkFile(service.sentencesAudioFolder, filename).then(
//                function(success) {
//                    if (success)
//                        $cordovaFile.createFile(service.sentencesAudioFolder, filename);
//                }, function(error){
//                    console.log(error);
//                });
                    
                    
            $cordovaFile.writeFile(service.sentencesAudioFolder, filename, blob, true).then(
                    function(res){
                        console.log(res);
                    },
                    function(err){
                        console.log(err);

                    });
                        
        }
    };
    /**
     * Called continuously while Raw Audio Input capture is running.
     * service is global
     */
    service.onAudioRawInputCapture = function (evt)
    {
        try {
            if (evt && evt.data) 
            {
                service.calculateElapsedTime(evt);

                service.audioRawDataQueue.push(evt.data);
                var subsampled_data = service.subsampleData(evt.data, service.subsamplingFactor);
                
                service.controller_scope.refreshMonitoring( service.totalReceivedData, 
                                                                         service.captureElapsedTime, 
                                                                         service.packetsNumber, 
                                                                         service.bitRate, evt.params, subsampled_data);
            }
        }
        catch (ex) {
            alert("onAudioRawInputCapture ex: " + ex);
        }
    };   
 
    /**
     * Called continuously while Raw Audio Input capture is running.
     * service is global
     */
    service.onAudioFFTInputCapture = function (evt)
    {
        try {
            if (evt && evt.data) 
            {
                service.calculateElapsedTime(evt);
                
                var subsampled_data = service.subsampleData(evt.data, service.subsamplingFactor);
                service.controller_scope.refreshMonitoring (service.totalReceivedData,
                                                                         service.captureElapsedTime, 
                                                                         service.packetsNumber,
                                                                         service.bitRate, evt.params, subsampled_data);
                                                                          
                
            }
        }
        catch (ex) {
            alert("onAudioFFTInputCapture ex: " + ex);
        }
    };   
    
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

// main_module.service('cpAISrv', cpAISrv);
 main_module.factory('cpAISrv', cpAISrv);
 
 
 
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