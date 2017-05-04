/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function SetupRecognitionCtrl($scope, SpeechDetectionSrv)
{
    $scope.captureProfile   = "recognition";
    $scope.captureParams    = {"sampleRate": 8000,
                               "bufferSize": 1024};
               
    $scope.initVadParams    = null;
    
    $scope.Cfg              = null;
    $scope.captureCfg       = null;
    $scope.vadCfg           = null;    
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // get standard capture params + overwrite some selected
        $scope.Cfg                  = SpeechDetectionSrv.init($scope.captureParams, $scope.captureProfile, $scope.chunkSaveParams, $scope.initVadParams);
        $scope.captureCfg           = $scope.Cfg.captureCfg;
        $scope.vadCfg               = $scope.Cfg.vadCfg;

        $scope.input_sources        = SpeechDetectionSrv.getInputSources();
        $scope.capture_buffer       = SpeechDetectionSrv.getCaptureBuffers();
        $scope.sampling_frequencies = SpeechDetectionSrv.getSamplingFrequencies();
        
        $scope.selectedSourceType   = $scope.selectObjByValue($scope.captureCfg.nAudioSourceType, $scope.input_sources);
        $scope.selectedFrequency    = $scope.selectObjByValue($scope.captureCfg.nSampleRate, $scope.sampling_frequencies);
        $scope.selectedCBS          = $scope.selectObjByValue($scope.captureCfg.nBufferSize, $scope.capture_buffer);
        
        $scope.selectedACL          = $scope.selectObjByMsValue($scope.vadCfg.nAnalysisChunkLength, $scope.captureCfg.nSampleRate, $scope.capture_buffer);
        $scope.selectedMIL          = $scope.selectObjByMsValue($scope.vadCfg.nSpeechDetectionMinimum, $scope.captureCfg.nSampleRate, $scope.capture_buffer);
        $scope.selectedMXL          = $scope.selectObjByMsValue($scope.vadCfg.nSpeechDetectionMaximum, $scope.captureCfg.nSampleRate, $scope.capture_buffer);
        $scope.selectedAD           = $scope.selectObjByMsValue($scope.vadCfg.nSpeechDetectionAllowedDelay, $scope.captureCfg.nSampleRate, $scope.capture_buffer);

    });      

    $scope.captureCfg = null;
    
    $scope.selectObjByValue = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].value == value)
               return objarray[i];
    };    
    
    // take a ms value and the sampling frequency and return the corresponding buffer size
    $scope.selectObjByMsValue = function(ms_value, samplingrate, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++)
        {
            var val = objarray[i].value;
            var val_ms = (val/samplingrate)*1000;
           if( val_ms == ms_value)
               return val;
        }
    };    





    // ============================================================================================
    // ============================================================================================
    // callback from ng-DOM
    $scope.updateSourceType = function(selDevice)
    {
        $scope.selectedSourceType           = selDevice;
        $scope.captureCfg.audioSourceType   = parseInt($scope.selectedSourceType.value);
    };

    $scope.updateFrequency = function(selFreq)
    {
        $scope.selectedFrequency            = selFreq;
        $scope.captureCfg.sampleRate        = parseInt($scope.selectedFrequency.value);
    };    
    
    $scope.updateCBS = function(selCaptBuf)
    {
        $scope.selectedCBS                  = selCaptBuf;
        $scope.captureCfg.bufferSize        = parseInt($scope.selectedCBS.value);
    };  
    
    $scope.updateACL = function(selCaptBuf)
    {
        $scope.selectedACL                  = selCaptBuf;
        $scope.captureCfg.bufferSize        = parseInt($scope.selectedACL.value);
    };  
    
    $scope.updateMIL = function(selCaptBuf)
    {
        $scope.selectedMIL                  = selCaptBuf;
        $scope.captureCfg.bufferSize        = parseInt($scope.selectedMIL.value);
    };  
    
    $scope.updateMXL = function(selCaptBuf)
    {
        $scope.selectedMXL                  = selCaptBuf;
        $scope.captureCfg.bufferSize        = parseInt($scope.selectedMXL.value);
    };  
    
    $scope.updateACL = function(selCaptBuf)
    {
        $scope.selectedAD                   = selCaptBuf;
        $scope.captureCfg.bufferSize        = parseInt($scope.selectedAD.value);
    };  
    
    
    
    
    // ============================================================================================
        
};
controllers_module.controller('SetupRecognitionCtrl', SetupRecognitionCtrl)   
  