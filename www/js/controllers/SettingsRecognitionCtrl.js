/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function SettingsRecognitionCtrl($scope, $state, $ionicPlatform, $ionicHistory, $ionicPopup, SpeechDetectionSrv, InitAppSrv, VocabularySrv, FileSystemSrv, ErrorSrv, MiscellaneousSrv, UITextsSrv, EnumsSrv)
{
    $scope.captureProfile   = "recognition";
//    $scope.captureParams    = null;
    
//    $scope.captureParams    = {"sampleRate": 8000,
//                               "bufferSize": 1024};
    $scope.MODE_VOC             = -1;   // enum mapping EnumSrv.RECOGNITION.PARAMS_MOD_VOC ....used by html
    $scope.modeVoc              = -1;
    $scope.modeId               = -1;
    $scope.currentNet           = null;
    $scope.currentNetJsonPath   = null;
    
    $scope.recThreshold     = 0;
    $scope.recDistance      = 0;
    
    $scope.initVadParams    = null;
//    $scope.initVadParams    = {"nAnalysisChunkLength": 64};
    
    $scope.Cfg              = null;
//    $scope.captureCfg       = null;
    $scope.vadCfg           = null;  
    
    $scope.has_changed_glob = false;
    $scope.has_changed_net  = false;
    
//    $scope.ACL_limits       = [];
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // take control of BACK buttons
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("home");
        }, 100);    
        
        //---------------------------------------------------------------------------------------------------------------------
        // manage input params
        //---------------------------------------------------------------------------------------------------------------------      
        $scope.MODE_VOC     = EnumsSrv.RECOGNITION.PARAMS_MOD_VOC;
        
        $scope.modeId       = EnumsSrv.RECOGNITION.PARAMS_MOD_GENERAL;       
        $scope.foldername   = "";               
        
        if(data.stateParams.modeid != "")
        {
            $scope.modeId = parseInt(data.stateParams.modeid);
        
            if($scope.modeId == EnumsSrv.RECOGNITION.PARAMS_MOD_VOC && data.stateParams.foldername == "") 
            {
                alert("SettingsRecognitionCtrl::$ionicView.enter. error : foldername is empty");
                $state.go("home");
            }   
            else $scope.foldername = data.stateParams.foldername;
            
            if(data.stateParams.sessionname != "")  $scope.sessionname = data.stateParams.sessionname;  // data.stateParams.sessionname = "/xxxxxxx"
            else                                    $scope.sessionname = "";            
        }

        $scope.vocabularies_relpath = InitAppSrv.getVocabulariesFolder();   // AllSpeak/vocabularies
        //---------------------------------------------------------------------------------------------------------------------       
        
        pluginInterface             = InitAppSrv.getPlugin();            
        
        // get standard capture params + overwrite some selected
        $scope.Cfg                  = SpeechDetectionSrv.getUpdatedCfgCopy($scope.Cfg, $scope.captureProfile, $scope.chunkSaveParams);
        $scope.captureCfg           = $scope.Cfg.captureCfg;
        $scope.vadCfg               = $scope.Cfg.vadCfg;

//        $scope.input_sources        = SpeechDetectionSrv.getInputSources();
//        $scope.aCBS                 = SpeechDetectionSrv.getCaptureBuffers();
        $scope.aSR                  = SpeechDetectionSrv.getSamplingFrequencies();
        
//        $scope.selectedSourceType   = MiscellaneousSrv.selectObjByValue($scope.captureCfg.nAudioSourceType, $scope.input_sources);
        $scope.selectedSR           = MiscellaneousSrv.selectObjByValue($scope.captureCfg.nSampleRate, $scope.aSR);
//        $scope.selectedCBS          = MiscellaneousSrv.selectObjByValue($scope.captureCfg.nBufferSize, $scope.aCBS);
        
        $scope.calculateAllowedRanges();
        $scope.selectedACL          = MiscellaneousSrv.selectObjByLabel($scope.vadCfg.nAnalysisChunkLength, $scope.aACL);
        
        $scope.acl_ms_step          = parseInt($scope.selectedACL.label);
//        $scope.acl_bs_step          = parseInt($scope.selectedACL.label)*($scope.captureCfg.nSampleRate/1000);
        
        $scope.countMIL             = $scope.vadCfg.nSpeechDetectionMinimum;
        $scope.countMXL             = $scope.vadCfg.nSpeechDetectionMaximum;
        $scope.countAD              = $scope.vadCfg.nSpeechDetectionAllowedDelay;
        $scope.mic_threshold        = $scope.vadCfg.nSpeechDetectionThreshold;      // TODO: set limits !
        
        $scope.has_changed_glob     = false;
        $scope.has_changed_net      = false;
        
        $scope.$apply();
        if($scope.modeId == EnumsSrv.RECOGNITION.PARAMS_MOD_VOC)
        {
            // check whether current net is an accepted one or a test one 
            return(function() 
            {
                if($scope.sessionname != "")
                {
                    return VocabularySrv.getNetInFolder($scope.vocabularies_relpath + "/" + $scope.foldername + $scope.sessionname)     // $scope.sessionname is  "/xxxxxxx"
                    .then(function(net)
                    {
                        return {"net":net};
                    })
                }
                else return VocabularySrv.getTrainVocabularySelectedNetName($scope.foldername);
            })()
            .then(function(voc_and_net)
            {
                $scope.currentNet           = voc_and_net.net; // net or null
                $scope.currentNetJsonPath   = InitAppSrv.getVocabulariesFolder() + "/" + $scope.foldername + $scope.sessionname + "/" + $scope.currentNet.sModelFileName + ".json";
                $scope.recThreshold         = $scope.currentNet.fRecognitionThreshold*100;
                $scope.recDistance          = $scope.currentNet.nRecognitionDistance;
                $scope.$apply();
            });
        }
    });      

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });     
    
    $scope.captureCfg = null;

    $scope.checkIFChanged = function()
    {
        $scope.has_changed_glob = false;
        
        if($scope.countMIL      != $scope.vadCfg.nSpeechDetectionMinimum)       $scope.has_changed_glob = true;
        if($scope.countMXL      != $scope.vadCfg.nSpeechDetectionMaximum)       $scope.has_changed_glob = true;
        if($scope.countAD       != $scope.vadCfg.nSpeechDetectionAllowedDelay)  $scope.has_changed_glob = true;
        if($scope.mic_threshold != $scope.vadCfg.nSpeechDetectionThreshold)     $scope.has_changed_glob = true;
        
        return $scope.has_changed_glob;
    };
    // ============================================================================================
    // ============================================================================================

    $scope.changeRecThreshold = function(boolincrement)
    {
        $scope.recThreshold = (boolincrement == true ? $scope.recThreshold+5    :   $scope.recThreshold-5);
        $scope.recThreshold = Math.max($scope.recThreshold, 0);
        $scope.recThreshold = Math.min($scope.recThreshold, 50);
        
        var newthresh = $scope.recThreshold/100;
        if(newthresh != $scope.currentNet.fRecognitionThreshold)    $scope.has_changed_net = true;
        else                                                        $scope.has_changed_net = false;
    };
    

    $scope.changeRecDistance = function(boolincrement)
    {
        $scope.recDistance = (boolincrement == true ? $scope.recDistance+5    :   $scope.recDistance-5);
        $scope.recDistance = Math.max($scope.recDistance, 0);
        $scope.recDistance = Math.min($scope.recDistance, 50);
        
        var newthresh = $scope.recDistance/100;
        if(newthresh != $scope.currentNet.nRecognitionDistance)     $scope.has_changed_net = true;
        else                                                        $scope.has_changed_net = false;
    };
    
//    $scope.onChangeMicThreshold = function(thresh)
//    {
//        thresh = parseInt(thresh);
//        $scope.mic_threshold = thresh;
//        if(thresh != $scope.mic_threshold)        
//            $scope.has_changed = true;
//    };
    
    // updates local object and send only the user params to InitAppSrv
    $scope.save = function(doexit)
    {
        return (function(change_glob) 
        {
            if(change_glob)
            {
                $scope.vadCfg.nSpeechDetectionMinimum       = $scope.countMIL;
                $scope.vadCfg.nSpeechDetectionMaximum       = $scope.countMXL;
                $scope.vadCfg.nSpeechDetectionAllowedDelay  = $scope.countAD;
                $scope.vadCfg.nSpeechDetectionThreshold     = $scope.mic_threshold;

                var obj2pass2configuser = {"nSpeechDetectionMinimum":       $scope.vadCfg.nSpeechDetectionMinimum,
                                           "nSpeechDetectionMaximum":       $scope.vadCfg.nSpeechDetectionMaximum,
                                           "nSpeechDetectionAllowedDelay":  $scope.vadCfg.nSpeechDetectionAllowedDelay,
                                           "nSpeechDetectionThreshold":     $scope.vadCfg.nSpeechDetectionThreshold};

                return SpeechDetectionSrv.setVadCfg(obj2pass2configuser);
            }            
            else    return Promise.resolve(true);
            
        })($scope.checkIFChanged())        
        .then(function()
        {        
            if($scope.has_changed_net)
            {
                $scope.currentNet.fRecognitionThreshold = ($scope.recThreshold/100);
                $scope.currentNet.nRecognitionDistance  = $scope.recDistance;
                return FileSystemSrv.createJSONFileFromObj($scope.currentNetJsonPath, $scope.currentNet, FileSystemSrv.OVERWRITE);
            }
            else return true;
        })
        .then(function()
        {        
            if(doexit)  $ionicHistory.goBack(); // back ! 
        })
        .catch(function(error)
        {
            ErrorSrv.raiseError(null, "Save config error", error);
        });
    };
    
    $scope.cancel = function()
    {
        $scope.has_changed_glob = $scope.checkIFChanged();
        
        if($scope.has_changed_glob || $scope.has_changed_net)
        {
            $ionicPopup.confirm({ title: UITextsSrv.labelAlertTitle, template: UITextsSrv.SETUP.labelSaveSettings})
            .then(function(res) 
            {
                if (res) $ionicHistory.goBack(); // back ! 
            });         
        }
        else $ionicHistory.goBack();
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
        $scope.checkIFChanged();
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
        $scope.checkIFChanged();
    };
    
    // ============================================================================================

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
            var bs          = $scope.ACLbs_limits[0] + x*min_ACLbs_step;
            var ms          = (bs*1000)/$scope.captureCfg.nSampleRate;
            $scope.aACL[x]  = {"label": ms, "value" : bs};
        }
    }; 
    // ============================================================================================
    // callback from ng-DOM
//    $scope.updateSourceType = function(selDevice)
//    {
//        $scope.selectedSourceType           = selDevice;
//        $scope.captureCfg.audioSourceType   = parseInt($scope.selectedSourceType.value);
//        
//        $scope.calculateAllowedRanges();
//    };
//
//    $scope.updateSR = function(selFreq)
//    {
//        $scope.selectedFrequency            = selFreq;
//        $scope.captureCfg.nSampleRate        = parseInt($scope.selectedFrequency.value);
//        
//        $scope.calculateAllowedRanges();
//    };
//    
//    $scope.updateCBS = function(selCaptBuf)
//    {
//        $scope.selectedCBS                  = selCaptBuf;
//        $scope.captureCfg.nBufferSize       = parseInt($scope.selectedCBS.value);
//        
//        $scope.calculateAllowedRanges();
//    };  
//    
//    $scope.updateACL = function(selCaptBuf)
//    {
//        $scope.selectedACL                  = selCaptBuf;
//        $scope.vadCfg.nAnalysisChunkLength  = parseInt($scope.selectedACL.label);
//        
//        $scope.acl_ms_step = parseInt($scope.selectedACL.label);
//        $scope.acl_bs_step = parseInt($scope.selectedACL.value);
//        
////        $scope.calculateAllowedRanges();
//    };    
    // ============================================================================================       
};
controllers_module.controller('SettingsRecognitionCtrl', SettingsRecognitionCtrl)   
  