/* 
 * Manage a vocabulary. displaying buttons to do the following:
 * 
 * - manage commands  
 * - complete recordings
 * - create a remote net / download a remote net
 * - use this model
 */

function VocabularyCtrl($scope, $state, $ionicPopup, $ionicHistory, $ionicPlatform, InitAppSrv, EnumsSrv, VocabularySrv, TfSrv, RuntimeStatusSrv, FileSystemSrv, UITextsSrv)
{
    $scope.status       = 0;
    $scope.headerTitle  = "Vocabolario: ";
    $scope.vocabulary   = null;
    $scope.modelLoaded  = false;    // model toggle
    $scope.isDefault    = false;    // if is a default NET, I cannot train it, doesn't have any recordings
                                    // I can see the commands, but cannot edit them
    
    $scope.selectedNet  = null;      // name of the json file of the selected net : e.g. net_274_252
    
    $scope.netsTypes    = null;
    $scope.existingNets = null;     // [{label, value}]
    $scope.overallNets  = null;      // {"pu":{}, "pua":{}, "ca", "cra", "pura"}
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // delete history once in the home
        $ionicHistory.clearHistory();
        // ask user's confirm after pressing back (thus trying to exit from the App)
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("vocabularies");
        }, 100); 

        $scope.recordings_relpath           = InitAppSrv.getAudioFolder();
        $scope.vocabularies_relpath         = InitAppSrv.getVocabulariesFolder();
        $scope.default_tv_filename          = UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;        
        
        $scope.labelEditTrainVocabulary     = UITextsSrv.TRAINING.labelEditTrainVocabulary;
        $scope.labelManageSession           = UITextsSrv.TRAINING.labelManageSession;
        $scope.labelRecordVoice             = UITextsSrv.TRAINING.labelRecordVoice;
        $scope.labelTrainVocabulary         = UITextsSrv.TRAINING.labelTrainVocabulary;
        $scope.labelLoadVocabulary          = UITextsSrv.TRAINING.labelLoadVocabulary;
        
        $scope.labelManageRecordingSession  = UITextsSrv.TRAINING.labelManageRecordingSession;
        
        $scope.enum_recordsession           = EnumsSrv.TRAINING.RECORD_TV;
        $scope.enum_manage_commands         = EnumsSrv.TRAINING.EDIT_TV;
        $scope.enum_showvoccommands         = EnumsSrv.TRAINING.SHOW_TV;
        $scope.enum_show_vb_voc             = EnumsSrv.VOICEBANK.SHOW_TRAINED;
        
        $scope.netsTypes                    = TfSrv.getNetTypes();
        
        if(data.stateParams == null)    alert("ERROR in VocabularyCtrl::$ionicView.enter. error : NO PARAMS were sent"); 
        else
        {
            if(data.stateParams.foldername != null)
            {
                $scope.foldername               = data.stateParams.foldername;
                $scope.vocabulary_relpath       = $scope.vocabularies_relpath     + "/" + data.stateParams.foldername;
                $scope.vocabulary_json_path      = $scope.vocabulary_relpath  + "/" + $scope.default_tv_filename;
            }
            else if(data.stateParams.foldername == null)
            {
                alert("VocabularyCtrl::$ionicView.enter. error : foldername is empty");
                $state.go("home");
            }         
        };  
        $scope.plugin_enums = InitAppSrv.getPlugin().ENUM.PLUGIN;
        
        return VocabularySrv.getUpdatedStatusName($scope.foldername)
        .then(function(voc)
        {
            $scope.vocabulary           = voc;
            $scope.vocabulary_status    = voc.status;
            
            $scope.headerTitle          = "VOCABOLARIO:    " + $scope.vocabulary.sLabel;            
            
            $scope.isDefault            = false;
            if($scope.vocabulary.nModelType != null)
                if($scope.vocabulary.nModelType == $scope.plugin_enums.TF_MODELTYPE_COMMON)
                {
                    $scope.isDefault = true;
                    return null;
                }
            
            return VocabularySrv.getExistingNets($scope.foldername)
        })
        .then(function(existing_nets)
        {
            if(existing_nets)
            {
                $scope.overallNets = existing_nets;
                $scope.updateExistingNets($scope.vocabulary.sModelFileName);
            }
            $scope.$apply();             
        })
        .catch(function(error)
        {
            console.log("Error in VocabularyCtrl::$ionicView.enter ");
            alert("Error in VocabularyCtrl::$ionicView.enter "+ error.toString());
            $state.go("home");
        });        
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 
    
    //===============================================================================================
    $scope.updateSelectedNet = function(selnet)
    {
        $scope.selectedNet = selnet;
        return FileSystemSrv.updateJSONFileWithObj(VocabularySrv.getTrainVocabularyJsonPath($scope.foldername), {"sModelFileName":selnet.value});
    };
    
    $scope.updateExistingNets = function(selitem)
    {
        var modeltype;
        $scope.existingNets = [];
        for(var item in $scope.overallNets)
        {
            if($scope.overallNets[item].exist)
            {
                modeltype = $scope.overallNets[item].voc.nModelType;
                for(var m in $scope.netsTypes)
                {
                    if($scope.netsTypes[m].value == modeltype)
                    {
                        $scope.existingNets.push({"label":$scope.netsTypes[m].label, "value":"net_" + modeltype.toString() + "_" + $scope.overallNets[item].voc.nProcessingScheme})
                        break;
                    }
                }
            }
        }
        if(selitem)
            $scope.selectedNet = $scope.selectObjByValue($scope.vocabulary.sModelFileName, $scope.existingNets)
    };
    
    
    $scope.deleteVocabulary = function()    
    {
        $ionicPopup.confirm({ title: 'Warning', template: 'Vuoi veramente cancellare il vocabolario?'})
        .then(function(res) 
        {
            if(res)
            {
                return FileSystemSrv.deleteDir($scope.vocabulary_relpath)
                .then(function()
                {
                    $state.go("vocabularies");    
                })
                .catch(function(error)
                {
                    alert(error.message);
                });
            }
        });          
    };
    
    $scope.loadModel = function()    
    {
        RuntimeStatusSrv.loadVocabulary($scope.foldername)
        .catch(function(error)
        {
            alert(error.message);
        });        
    };
    
    $scope.selectObjByValue = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].value == value)
               return objarray[i];
    }; 
    //===============================================================================================
 };
controllers_module.controller('VocabularyCtrl', VocabularyCtrl);   
