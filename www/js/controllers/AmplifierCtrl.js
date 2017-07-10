function AmplifierCtrl($scope, SpeechDetectionSrv, InitAppSrv)
{
    $scope.captureProfile   = "amplifier";   
    $scope.captureParams    = { "nSampleRate": 8000,
                                "nAudioSourceType": 6, //android voice recognition
                                "nBufferSize": 256};

    $scope.Cfg              = null;
    $scope.captureCfg       = null;
    $scope.vadCfg           = null;    
    
    $scope.volume           = 50;
    $scope.bLabelStart      = "AVVIA";
    $scope.bLabelStop       = "STOP";
    
    $scope.isRunning        = 0;
    $scope.buttonLabel      = ($scope.isRunning ? $scope.bLabelStop : $scope.bLabelStart);
    
    //==================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        pluginInterface                 = InitAppSrv.getPlugin();            
        
        $scope.captureParams.nDataDest  = pluginInterface.ENUM.PLUGIN.CAPTURE_DATADEST_JS_DB;        
        // get standard capture params + overwrite some selected
        $scope.Cfg                      = SpeechDetectionSrv.init($scope.captureParams, $scope.captureProfile, $scope.chunkSaveParams, $scope.initVadParams);
        $scope.captureCfg               = $scope.Cfg.captureCfg;
    });        

    $scope.start = function()
    {
        if (!$scope.isRunning)  SpeechDetectionSrv.startMicPlayback($scope.captureCfg, $scope.onStartCapture, $scope.onStopCapture, $scope.onCaptureError);
        else                    SpeechDetectionSrv.stopCapture();
    };
  
    $scope.onChangeVolume = function(volume)
    {
        console.log("@@@@ " + volume.toString());
        SpeechDetectionSrv.setPlayBackPercVol(volume);
    };
   
    //==================================================================================
    // PLUGIN CALLBACKS
    //==================================================================================
    $scope.onStartCapture = function()
    {
        window.addEventListener('audiometer', $scope.onDBMETER);
        
        $scope.isRunning        = true; 
        $scope.buttonLabel      = $scope.bLabelStop;         
        $scope.$apply();
    };
    
    $scope.onStopCapture = function()
    {
        window.removeEventListener('audiometer', $scope.onDBMETER);
        
        $scope.isRunning        = false;        
        $scope.buttonLabel      = $scope.bLabelStart;    
        $scope.voiceDB          = 0;        
        $scope.$apply();
    };   
    
   $scope.onCaptureError = function(error)
   {
       $scope.onStopCapture();
   };
   
    // called by plugin interface _pluginEvent::cordova.fireWindowEvent("audiometer",...
    $scope.onDBMETER = function(event)
    {    
        $scope.voiceDB = event.decibels;
        $scope.$apply();
    };
   //==================================================================================
};

controllers_module = angular.module('controllers_module')
.controller('AmplifierCtrl', AmplifierCtrl);
 