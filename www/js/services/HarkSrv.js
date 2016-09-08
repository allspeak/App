/*
 * once activated, detect voice onset & offset 
 */


function HarkSrv($cordovaNativeAudio, $cordovaMediaCapture)
{
    this.controller_scope       = {};
    this.window                 = {};   
    // Define function called by getUserMedia 
    this.onVoiceStart = function()
    {
        console.log('voice_start'); 
//        this.controller_scope.vad_status = "ON";
    };
    this.onVoiceStop = function()
    {
        console.log('voice_stop');
//        this.controller_scope.vad_status = "OFF";
    };
    this.onVolumeChange = function(volume)
    {
        console.log('volume: '+volume);
    };
    
    // in this callback, this is: $window
    this.startUserMedia = function(stream) 
    {
        // Create MediaStreamAudioSourceNode
        this.audioserver_manager.source = this.audioserver_manager.audiocontext.createMediaStreamSource(stream);

        var options = {};
        var speech = hark(stream, options);
        speech.on('speaking', this.audioserver_manager.audioserver.onVoiceStart);
        speech.on('stopped_speaking', this.audioserver_manager.audioserver.onVoiceStop);          
        speech.on('volume_change', this.audioserver_manager.audioserver.onVolumeChange);          
    };  

    this.monitorVoice = function($window, controller_scope)
    {
        $window.AudioContext = $window.AudioContext || $window.webkitAudioContext;

        this.controller_scope       = controller_scope;
        $window.audioserver_manager = {audiocontext : new AudioContext(),
                                       controller : this.controller_scope,
                                       audioserver : this};

        $window.navigator.getUserMedia = $window.navigator.getUserMedia || 
                                         $window.navigator.mozGetUserMedia || 
                                         $window.navigator.webkitGetUserMedia;
        $window.navigator.getUserMedia({audio: true}, this.startUserMedia, function(e) { console.log("No live audio input in this browser: " + e); });        
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

 main_module.service('HarkSrv', HarkSrv);