/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function SettingsRecognitionCtrl($scope, $state, $ionicPlatform, $ionicHistory, $ionicPopup, SpeechDetectionSrv, InitAppSrv, ErrorSrv)
{
    $scope.captureProfile   = "recognition";
    $scope.captureParams    = null;
    
//    $scope.captureParams    = {"sampleRate": 8000,
//                               "bufferSize": 1024};
               
    $scope.initVadParams    = null;
//    $scope.initVadParams    = {"nAnalysisChunkLength": 64};
    
    $scope.Cfg              = null;
    $scope.captureCfg       = null;
    $scope.vadCfg           = null;  
    
    $scope.ACL_limits       = [];
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // take control of BACK buttons
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("home");
        }, 100);    
        
        
        pluginInterface             = InitAppSrv.getPlugin();            
        
        // get standard capture params + overwrite some selected
        $scope.Cfg                  = SpeechDetectionSrv.getUpdatedCfg($scope.captureParams, $scope.captureProfile, $scope.chunkSaveParams);
        $scope.captureCfg           = $scope.Cfg.captureCfg;
        $scope.vadCfg               = $scope.Cfg.vadCfg;

        $scope.input_sources        = SpeechDetectionSrv.getInputSources();
        $scope.aCBS                 = SpeechDetectionSrv.getCaptureBuffers();
        $scope.aSR                  = SpeechDetectionSrv.getSamplingFrequencies();
        
        $scope.selectedSourceType   = $scope.selectObjByValue($scope.captureCfg.nAudioSourceType, $scope.input_sources);
        $scope.selectedSR           = $scope.selectObjByValue($scope.captureCfg.nSampleRate, $scope.aSR);
        $scope.selectedCBS          = $scope.selectObjByValue($scope.captureCfg.nBufferSize, $scope.aCBS);
        
        $scope.calculateAllowedRanges();
        $scope.selectedACL          = $scope.selectObjByLabel($scope.vadCfg.nAnalysisChunkLength, $scope.aACL);
        
        $scope.acl_ms_step          = parseInt($scope.selectedACL.label);
        $scope.acl_bs_step          = parseInt($scope.selectedACL.label)*($scope.captureCfg.nSampleRate/1000);
        
        $scope.countMIL             = $scope.vadCfg.nSpeechDetectionMinimum;
        $scope.countMXL             = $scope.vadCfg.nSpeechDetectionMaximum;
        $scope.countAD              = $scope.vadCfg.nSpeechDetectionAllowedDelay;

        $scope.$apply();
    });      

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });     
    
    $scope.captureCfg = null;
    
    $scope.selectObjByValue = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].value == value)
               return objarray[i];
    };    
    
    $scope.selectObjByLabel = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].label == value)
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

    // define allowed values for ACL,MIL,MXL,AD
    $scope.calculateAllowedRanges = function()
    {
        var min_ACLms_step          = pluginInterface.ENUM.vad.MIN_ACL_MS;
        var min_ACLbs_step          = (min_ACLms_step*$scope.captureCfg.nSampleRate)/1000;
        $scope.ACLbs_limits         = SpeechDetectionSrv.calcRecConstants(); // return values in BufferSizes
        
        //-------------------------------------------------------------
        // ACL
        $scope.aACL                 = [];
        for (x = 0; x < $scope.ACLbs_limits[1]/min_ACLbs_step; x++)
        {
            var bs = $scope.ACLbs_limits[0] + x*min_ACLbs_step;
            var ms = (bs*1000)/$scope.captureCfg.nSampleRate
            $scope.aACL[x] = {"label": ms, "value" : bs};
        }
    }; 

    // ============================================================================================
    // ============================================================================================
    // callback from ng-DOM
    $scope.updateSourceType = function(selDevice)
    {
        $scope.selectedSourceType           = selDevice;
        $scope.captureCfg.audioSourceType   = parseInt($scope.selectedSourceType.value);
        
        $scope.calculateAllowedRanges();
    };

    $scope.updateSR = function(selFreq)
    {
        $scope.selectedFrequency            = selFreq;
        $scope.captureCfg.nSampleRate        = parseInt($scope.selectedFrequency.value);
        
        $scope.calculateAllowedRanges();
        
    };
    
    $scope.updateCBS = function(selCaptBuf)
    {
        $scope.selectedCBS                  = selCaptBuf;
        $scope.captureCfg.nBufferSize       = parseInt($scope.selectedCBS.value);
        
        $scope.calculateAllowedRanges();
    };  
    
    $scope.updateACL = function(selCaptBuf)
    {
        $scope.selectedACL                  = selCaptBuf;
        $scope.vadCfg.nAnalysisChunkLength  = parseInt($scope.selectedACL.label);
        
        $scope.acl_ms_step = parseInt($scope.selectedACL.label);
        $scope.acl_bs_step = parseInt($scope.selectedACL.value);
        
//        $scope.calculateAllowedRanges();
    };  

    
    $scope.save = function(doexit)
    {
            return InitAppSrv.saveCaptureConfigField('vad', $scope.vadCfg)
        .then(function(){
            return InitAppSrv.saveCaptureConfigField('recognition', $scope.captureCfg);
        })
        .then(function(){        
            if(doexit)  $ionicHistory.goBack(); // back ! 
        })
        .catch(function(error){
            ErrorSrv.raiseError(null, "Save config error", error);
        });
    };
    
    $scope.cancel = function()
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'Stai uscendo senza salvare i nuovi parametri, sei sicuro ?'})
        .then(function(res) 
        {
            if (res) $ionicHistory.goBack(); // back ! 
        });         
    };
    
    $scope.decrementCounter = function(item)
    {
        switch(item)
        {
            case "MIL":
                $scope.countMIL -= $scope.acl_ms_step;
                break;
            case "MXL":
                $scope.countMXL -= $scope.acl_ms_step;
                break;
            case "AD":
                $scope.countAD -= $scope.acl_ms_step;
                break;
        }
    };
    
    $scope.incrementCounter = function(item)
    {
        switch(item)
        {
            case "MIL":
                $scope.countMIL += $scope.acl_ms_step;
                break;
            case "MXL":
                $scope.countMXL += $scope.acl_ms_step;
                break;
            case "AD":
                $scope.countAD += $scope.acl_ms_step;
                break;
        }
    };
    
    
    // ============================================================================================
        
};
controllers_module.controller('SettingsRecognitionCtrl', SettingsRecognitionCtrl)   
  