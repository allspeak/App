/* 
 * Manage a vocabulary. displaying buttons to do the following:
 * 
 * - manage commands  
 * - complete recordings
 * - create a remote net / download a remote net
 * - use this model
 */

function VocabularyCtrl($scope, $state, $ionicPopup, $ionicHistory, $ionicPlatform, InitAppSrv, EnumsSrv, VocabularySrv, TfSrv, RuntimeStatusSrv, FileSystemSrv, RemoteAPISrv, UITextsSrv, MiscellaneousSrv, ErrorSrv)
{
    $scope.headerTitle  = "Vocabolario: ";
    $scope.vocabulary   = null;
    $scope.isDefault    = false;    // if is a default NET, I cannot train it, doesn't have any recordings
                                    // I can see the commands, but cannot edit them
    
    $scope.selectedNet  = null;      // name of the json file of the selected net : e.g. net_274_252
    
    $scope.netsTypes    = null;
    $scope.existingNets = null;     // [{label, value}]
    $scope.overallNets  = null;      // {"pu":{}, "pua":{}, "ca", "cra", "pura"}
    
    $scope.isConnected          = false;
    $scope.incompleteRecordings = true;
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // delete history once here
        $ionicHistory.clearHistory();
        $scope.deregisterFunc               = $ionicPlatform.registerBackButtonAction(function(){ $state.go("vocabularies"); }, 100); 

        $scope.recordings_folder            = InitAppSrv.getAudioFolder();
        $scope.vocabularies_relpath         = InitAppSrv.getVocabulariesFolder();
        $scope.default_tv_filename          = UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;        
        
        $scope.labelEditTrainVocabulary     = UITextsSrv.TRAINING.labelEditTrainVocabulary;
        $scope.labelManageSession           = UITextsSrv.TRAINING.labelManageSession;
        $scope.labelRecordVoice             = UITextsSrv.TRAINING.labelRecordVoice;
        $scope.labelTrainVocabulary         = UITextsSrv.TRAINING.labelTrainVocabulary;
        $scope.labelLoadVocabulary          = UITextsSrv.TRAINING.labelLoadVocabulary;
        
        $scope.labelManageRecordingSession  = UITextsSrv.TRAINING.labelManageRecordingSession;
        
        $scope.labelConfirmVocDelete        = UITextsSrv.VOCABULARY.CONFIRM_DELETE;
        
        $scope.enum_recordsession           = EnumsSrv.TRAINING.RECORD_TV;
        $scope.enum_manage_commands         = EnumsSrv.TRAINING.EDIT_TV;
        $scope.enum_showvoccommands         = EnumsSrv.TRAINING.SHOW_TV;
        $scope.enum_show_vb_voc             = EnumsSrv.VOICEBANK.SHOW_TRAINED;
        
        $scope.netsTypes                    = TfSrv.getNetTypes();
        
        if(data.stateParams == null)        alert("ERROR in VocabularyCtrl::$ionicView.enter. error : NO PARAMS were sent"); 
        else
        {
            if(data.stateParams.foldername != null)
            {
                $scope.foldername               = data.stateParams.foldername;
                $scope.vocabulary_relpath       = $scope.vocabularies_relpath     + "/" + data.stateParams.foldername;
                $scope.vocabulary_json_path     = $scope.vocabulary_relpath  + "/" + $scope.default_tv_filename;
            }
            else if(data.stateParams.foldername == null)
            {
                alert("VocabularyCtrl::$ionicView.enter. error : foldername is empty");
                $state.go("home");
            }         
        };  
        $scope.plugin_enums = InitAppSrv.getPlugin().ENUM.PLUGIN;
        
        $scope.isConnected              = RemoteAPISrv.hasInternet();
        window.addEventListener('connection' , $scope.onConnection); 
        
        return VocabularySrv.getTrainVocabulary($scope.vocabulary_json_path)
        .then(function(voc) 
        {
            $scope.vocabulary           = voc;
            
            $scope.headerTitle          = $scope.vocabulary.sLabel;            
            
            $scope.isDefault            = false;
            if(voc.net != null)
                if(voc.net.nModelType == $scope.plugin_enums.TF_MODELTYPE_COMMON)
                    $scope.isDefault = true;
            
            return VocabularySrv.getExistingLastNets($scope.foldername);
        })
        .then(function(existing_nets)
        {
            if(JSON.stringify(existing_nets) !== "{}")
            {
                $scope.overallNets = existing_nets;
                $scope.updateExistingNets($scope.vocabulary.sModelFileName);
            }
            return VocabularySrv.existCompleteRecordedTrainSession($scope.recordings_folder, $scope.vocabulary, 1);
        })
        .then(function(exist_min_rep)
        {
            $scope.incompleteRecordings = !exist_min_rep;
            $scope.$apply();             
        })     
        .catch(function(error)
        {
            if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST)
            {
                // vocabulary could not be recovered or user did not want to do it...and was thus deleted
                $state.go("vocabularies"); 
            }
            else
            {
                var msg = error.toString();
                console.log("Error in VocabularyCtrl::$ionicView.enter ");
                if(error.message) msg = error.message;
                alert("Error in VocabularyCtrl::$ionicView.enter "+ msg);
                $state.go("home");
            }
        });        
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
        window.removeEventListener('connection'  , $scope.onConnection);
    }); 
    
    //===============================================================================================
    $scope.updateSelectedNet = function(selnet)
    {
        if(selnet)
        {
            $scope.selectedNet = selnet;
            return FileSystemSrv.updateJSONFileWithObj(VocabularySrv.getTrainVocabularyJsonPath($scope.foldername), {"sModelFileName":selnet.value}, FileSystemSrv.OVERWRITE);
        }
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
                        $scope.existingNets.push({"label":$scope.netsTypes[m].label2, "value":"net_" + modeltype.toString() + "_" + $scope.overallNets[item].voc.nProcessingScheme.toString() + "_" + $scope.overallNets[item].voc.nModelClass.toString()});
                        break;
                    }
                }
            }
        }
        if(selitem)
            $scope.selectedNet = MiscellaneousSrv.selectObjByValue($scope.vocabulary.sModelFileName, $scope.existingNets);
        $scope.$apply();
    };
    
    $scope.deleteVocabulary = function()    
    {
        return $ionicPopup.confirm({ title: UITextsSrv.labelAlertTitle, template: $scope.labelConfirmVocDelete})
        .then(function(res) 
        {
            if(res)
            {
                return VocabularySrv.deleteTrainVocabulary($scope.foldername, RuntimeStatusSrv.getUserVocabularyName())
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
    
    // event broadcasted by RemoteAPISrv when internet connection availability changes
    $scope.onConnection = function(event)
    {
        $scope.isConnected = event.value;
        $scope.$apply();
    };    
    //===============================================================================================
 };
controllers_module.controller('VocabularyCtrl', VocabularyCtrl);   
