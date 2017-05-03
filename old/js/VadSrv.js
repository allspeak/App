/*
 * once activated, detect voice onset & offset 
 */


function VadSrv($cordovaNativeAudio, $cordovaMediaCapture)
{
    this.controller_scope       = {};
    this.window                 = {};
//    this.audioContext           = new AudioContext();
    
    
    // Define function called by getUserMedia 
    this.onVoiceStart = function()
    {
        console.log('voice_start'); 
        this.controller_scope.vad_status = "ON";
    };
    this.onVoiceStop = function()
    {
        console.log('voice_stop');
        this.controller_scope.vad_status = "OFF";
    };
    
    // in this callback, this is: $window
    this.startUserMedia = function(stream) 
    {
        // Create MediaStreamAudioSourceNode
        this.audioserver_manager.source = this.audioserver_manager.audiocontext.createMediaStreamSource(stream);

        // Setup options
        var options = 
        {
            source              : this.audioserver_manager.source,
            voice_stop          : this.audioserver_manager.audioserver.onVoiceStop, 
            voice_start         : this.audioserver_manager.audioserver.onVoiceStart,
            controller_scope    : this.audioserver_manager.controller
        }; 
        // Create VAD
        this.audioserver_manager.vad = new VAD(options);
    };  

    this.startCapture = function(captureCfg, $scope, $window)
    {
        this.controller_scope = $scope;
        $window.AudioContext = $window.AudioContext || $window.webkitAudioContext;

        $window.audioserver_manager = {audiocontext : this.audioContext,
                                       controller : this.controller_scope,
                                       audioserver : this};

        $window.navigator.getUserMedia = $window.navigator.getUserMedia || 
                                         $window.navigator.mozGetUserMedia || 
                                         $window.navigator.webkitGetUserMedia;
        $window.navigator.getUserMedia({audio: true}, this.startUserMedia, function(e) { console.log("No live audio input in this browser: " + e); });        
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

 main_module.service('VadSrv', VadSrv);