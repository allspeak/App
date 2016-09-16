/*
 * once activated, detect voice onset & offset 
 */


function cpAISrv()
{

    this.clearCounters = function()
    {  
        this.lastTS             = 0;
        this.firstTS            = 0;
        this.firstGetTime       = 0;
        this.captureElapsedTime = 0;
        
        this.audioRawDataQueue  = [];
        this.totalReceivedData  = 0;
//        this.totalPlayedData    = 0;    
        this.packetsNumber      = 0;        
        this.bitRate            = 0;    
        this.data2bewritten     = 0;
    };  

    this.clearCounters();
    
    // How many data chunks should be joined before playing them
    //this.concatenateMaxChunks   = 10;
    
    this.controller_scope       = {};
     
    this.data2bewritten         = 0;
    this.subsamplingFactor      = 8;
    
    // set standard Capture Configuration
    this.standardCaptureCfg = {};
    if (window.audioinput)
    {
        this.standardCaptureCfg = {
                    sampleRate: window.audioinput.SAMPLERATE["TELEPHONE_8000Hz"],
                    bufferSize: 1024, //window.audioinput.DEFAULT["BUFFER_SIZE"], 
                    channels: window.audioinput.DEFAULT["CHANNELS"],
                    format: window.audioinput.DEFAULT["FORMAT"],
                    audioSourceType: window.audioinput.AUDIOSOURCE_TYPE["DEFAULT"],
                    streamToWebAudio: window.audioinput.DEFAULT["STREAM_TO_WEBAUDIO"],
                    fftSize: window.audioinput.DEFAULT["FFT_SIZES"],
                    captureMode: window.audioinput.DEFAULT["FFT_SIZES"]
        };
    }
   
    this.startRawCapture = function (captureCfg, $scope, $window) 
    {
        try {
            if ($window.audioinput && !$window.audioinput.isCapturing()) 
            {
                this.clearCounters();
                this.controller_scope = $scope;    
                $window.audioserver_manager = { controller      : this.controller_scope,
                                                audioserver     : this};                
                
                captureCfg.captureMode = $window.audioinput.CAPTURE_MODES.RAWDATA_MODE;

                $window.addEventListener('audioinput', this.onAudioRawInputCapture, false);
                $window.addEventListener('audioinputerror', this.onAudioInputError, false);

                $window.audioinput.start(captureCfg);
                this.firstGetTime = new Date().getTime();
                console.log("Microphone input started!");
            }
        }
        catch (e) {
            alert("startCapture exception: " + e);
        }
    };
    this.startFFTCapture = function (captureCfg, $scope, $window) 
    {
        try {
            if ($window.audioinput && !$window.audioinput.isCapturing()) 
            {
                this.clearCounters();
                this.controller_scope = $scope;    
                $window.audioserver_manager = { controller      : this.controller_scope,
                                                audioserver     : this};                
                
                captureCfg.captureMode = $window.audioinput.CAPTURE_MODES.FFTDATA_MODE;

                $window.addEventListener('audioinput', this.onAudioFFTInputCapture, false);
                $window.addEventListener('audioinputerror', this.onAudioInputError, false);

                $window.audioinput.start(captureCfg);
                this.firstGetTime = new Date().getTime();
                console.log("Microphone input started!");
            }
        }
        catch (e) {
            alert("startCapture exception: " + e);
        }
    };

    this.stopCapture = function () 
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
    this.saveArray2Wave = function(captureCfg, data_array, filename)
    {
        console.log("Encoding WAV...");
        var encoder = new WavAudioEncoder(captureCfg.sampleRate, captureCfg.channels);
        encoder.encode([data_array]);

        console.log("Encoding WAV finished");

        var blob = encoder.finish("audio/wav");
        console.log("BLOB created");

        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dir) 
        {
            dir.getFile(filename, {create: true}, function (file) 
            {
                file.createWriter(function (fileWriter) { fileWriter.write(blob);},
                                  function () { alert("FileWriter error!"); });
            });
        });        
    };
    /**
     * Called continuously while Raw Audio Input capture is running.
     * this is global
     */
    this.onAudioRawInputCapture = function (evt)
    {
        try {
            if (evt && evt.data) 
            {
                window.audioserver_manager.audioserver.calculateElapsedTime(evt);

                window.audioserver_manager.audioserver.audioRawDataQueue.push(evt.data);
                window.audioserver_manager.controller.refreshMonitoringEx(window.audioserver_manager.audioserver.totalReceivedData, 
                                                                          window.audioserver_manager.audioserver.captureElapsedTime, 
                                                                          window.audioserver_manager.audioserver.packetsNumber, 
                                                                          window.audioserver_manager.audioserver.bitRate, 0, []);
            }
        }
        catch (ex) {
            alert("onAudioRawInputCapture ex: " + ex);
        }
    };   
 
    /**
     * Called continuously while Raw Audio Input capture is running.
     * this is global
     */
    this.onAudioFFTInputCapture = function (evt)
    {
        try {
            if (evt && evt.data) 
            {
                window.audioserver_manager.audioserver.calculateElapsedTime(evt);
                
                var subsampled_spectrum = window.audioserver_manager.audioserver.subsampleData(evt.data, this.subsamplingFactor);
                window.audioserver_manager.controller.refreshMonitoringEx(window.audioserver_manager.audioserver.totalReceivedData,
                                                                          window.audioserver_manager.audioserver.captureElapsedTime, 
                                                                          window.audioserver_manager.audioserver.packetsNumber,
                                                                          window.audioserver_manager.audioserver.bitRate, evt.volume, subsampled_spectrum);
                                                                          
                
            }
        }
        catch (ex) {
            alert("onAudioFFTInputCapture ex: " + ex);
        }
    };   
    
    this.setSubSamplingFactor = function(factor)
    {
        this.subsamplingFactor = factor;
    };
    
    this.subsampleData = function(data, factor)
    {
        var l       = data.length;
        var result  = [];
        step        = Math.round(l/factor);  // typical 512/8 = 64
        
        for (st=0; st<step; st++)
        {
            var start   = st*factor
            var end     = start+factor;
            var average = 0;

            for (i=start; i<end; i++)
                average = average + data[i];
            result.push(average/factor);
        }
        return result;
    }
    
    this.calculateElapsedTime = function(evt)
    {
        var curr_ts = evt.timeStamp;
        if (!window.audioserver_manager.audioserver.firstTS)
        {
            // first packet !! get elapsed in the "global" TS system
            var now_ts_ms   = new Date().getTime();
            var elapsed     = now_ts_ms - window.audioserver_manager.audioserver.firstGetTime;

            // remove from local (assuming they could be different) TS system
            window.audioserver_manager.audioserver.firstTS = curr_ts - elapsed;
            window.audioserver_manager.audioserver.lastTS = window.audioserver_manager.audioserver.firstTS;
        }

        window.audioserver_manager.audioserver.deltaPackets = curr_ts - window.audioserver_manager.audioserver.lastTS;
        window.audioserver_manager.audioserver.lastTS = curr_ts;

        // time elapsed since capture start
        window.audioserver_manager.audioserver.captureElapsedTime = Math.round (curr_ts - window.audioserver_manager.audioserver.firstTS)/1000;                

        window.audioserver_manager.audioserver.packetsNumber++;
        window.audioserver_manager.audioserver.totalReceivedData += evt.data.length; // in FFT capturing: received packets are N/2 long. so I simulate the real number of data read by 2*data
        window.audioserver_manager.audioserver.bitRate = Math.round((window.audioserver_manager.audioserver.totalReceivedData/window.audioserver_manager.audioserver.captureElapsedTime));

    }
    
    /**
    * Called when a plugin error happens.
     */
    function onAudioInputError(error) 
    {
        alert("onAudioInputError event received: " + JSON.stringify(error));
    };
    
    this.getStdCaptureCfg = function()
    {
        return this.standardCaptureCfg;
    };
    //=============================================   
    this.getSource = function() 
    {
        if (ionic.Platform.isAndroid()) {
            source = '/android_asset/www/' + source;
            return source;
        }
        else {   return source;  }
    };
}

 main_module.service('cpAISrv', cpAISrv);
 
 
 
 /*
  * 
    
//    // Define function called by getUserMedia 
//    this.onVoiceStart = function()
//    {
//        console.log('voice_start'); 
////        this.controller_scope.vad_status = "ON";
//    };
//    this.onVoiceStop = function()
//    {
//        console.log('voice_stop');
////        this.controller_scope.vad_status = "OFF";
//    };
//    this.onVolumeChange = function(volume)
//    {
//        console.log('volume: '+volume);
//    };
    
//    // in this callback, this is: $window
//    this.startUserMedia = function(stream) 
//    {
//        // Create MediaStreamAudioSourceNode
//        this.audioserver_manager.source = this.audioserver_manager.audiocontext.createMediaStreamSource(stream);
//
//        var options = {};
//        var speech = hark(stream, options);
//        speech.on('speaking', this.audioserver_manager.audioserver.onVoiceStart);
//        speech.on('stopped_speaking', this.audioserver_manager.audioserver.onVoiceStop);          
//        speech.on('volume_change', this.audioserver_manager.audioserver.onVolumeChange);     
//        
//        var options = 
//        {
//            source              : this.audioserver_manager.source,
//            voice_stop          : this.audioserver_manager.audioserver.onVoiceStop, 
//            voice_start         : this.audioserver_manager.audioserver.onVoiceStart,
//            controller_scope    : this.audioserver_manager.controller
//        }; 
//        // Create VAD
//        this.audioserver_manager.vad = new VAD(options);                           
//    };  


  */