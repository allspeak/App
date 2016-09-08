/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function AudioSrv(HWSrv, $cordovaNativeAudio, $cordovaMediaCapture)
{
    this.playback_wrapper   = $cordovaNativeAudio;
    this.rec_wrapper        = $cordovaMediaCapture;
    this.rec_options        = { limit: 3, duration: 10 };
    
    this.filename           = "";
    this.hw                 = HWSrv;
    this.isSoundLoaded      = 0;

    this.controller         = {};
    //=============================================
    // PLAYBACK
    this.playWav = function (filename)
    {
        this.filename = filename;       
        console.log("play wav: " + filename );     
        
        if(this.isSoundLoaded)
        {
            this.playNativeSound('mySound');
        }
        else
        {
            this.loadSound();
        }        
    };
    this.stopWav = function ()
    {
        playback_wrapper.stop('mySound');
        playback_wrapper.unload('mySound');
    };    
    this.loadSound = function()
    {
        this.audio_wrapper.preloadSimple('mySound', this.filename)
          .then(function (msg) {
          }, function (error) {
            alert(error);
          });
        this.isSoundLoaded = true;
        this.playNativeSound('mySound');
    };
    this.playNativeSound = function(name)
    {
        playback_wrapper.play(name);
    };    
    //=============================================
    // RECORDING  
    this.recWav = function (filename)
    {
        this.filename = filename;
        this.rec_wrapper.captureAudio(this.rec_options).then(
        function(audioData) 
        {
            // Success! Audio data is here
        }, 
        function(err) 
        {
             // An error occurred. Show a message to the user
        });        
    }; 
    //=============================================
    // MONITORING      
    // Define function called by getUserMedia 
    
    this.onVoiceStart = function()
    {
        console.log('voice_start'); 
    };
    this.onVoiceStop = function()
    {
        console.log('voice_stop');
    };

    this.monitorVoice = function($window)
    {
        
        function startUserMedia (stream) // this is $window
        {
            // Create MediaStreamAudioSourceNode
            this.audioserver_controller.source = this.audioContext.createMediaStreamSource(stream);

            // Setup options
            var options = 
            {
                source: this.audioserver_controller.source,
                voice_stop: this.audioserver_controller.onVoiceStart, 
                voice_start: this.audioserver_controller.onVoiceStop
            }; 
            // Create VAD
            this.audioserver_controller.vad = new VAD(options);
        };        
        
        
        $window.AudioContext = $window.AudioContext || $window.webkitAudioContext;
        $window.audioContext = new AudioContext();
        // Ask for audio device
        $window.audioserver_controller = this.controller;
        
        $window.navigator.getUserMedia = $window.navigator.getUserMedia || 
                                         $window.navigator.mozGetUserMedia || 
                                         $window.navigator.webkitGetUserMedia;
        $window.navigator.getUserMedia({audio: true}, startUserMedia, function(e) { console.log("No live audio input in this browser: " + e); });        
    }
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

 main_module.service('AudioSrv', AudioSrv);