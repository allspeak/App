/* 
 * Manage a vocabulary. displaying buttons to do the following:
 * 
 * - manage commands  
 * - complete recordings
 * - create a remote net / download a remote net
 * - use this model
 */

function VocabularyCtrl($scope, $state, $ionicPopup, $ionicHistory, $ionicPlatform, InitAppSrv, EnumsSrv, VocabularySrv, RuntimeStatusSrv, FileSystemSrv, UITextsSrv)
{
    $scope.status       = 0;
    $scope.headerTitle  = "Vocabolario: ";
    $scope.vocabulary   = null;
    $scope.modelLoaded  = false;    // model toggle
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // delete history once in the home
        $ionicHistory.clearHistory();
        // ask user's confirm after pressing back (thus trying to exit from the App)
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("vocabularies");
        }, 100); 

        $scope.trainingsessions_relpath                = InitAppSrv.getAudioFolder();
        $scope.vocabularies_relpath               = InitAppSrv.getVocabulariesFolder();
        $scope.default_tv_filename          = UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;        
        
        $scope.labelEditTrainVocabulary     = UITextsSrv.TRAINING.labelEditTrainVocabulary;
        $scope.labelManageSession           = UITextsSrv.TRAINING.labelManageSession;
        $scope.labelRecordVoice             = UITextsSrv.TRAINING.labelRecordVoice;
        $scope.labelTrainVocabulary         = UITextsSrv.TRAINING.labelTrainVocabulary;
        $scope.labelLoadVocabulary          = UITextsSrv.TRAINING.labelLoadVocabulary;
        
        $scope.labelManageRecordingSession  = UITextsSrv.TRAINING.labelManageRecordingSession;
        
        $scope.enum_recordsession           = EnumsSrv.TRAINING.RECORD_TV;
        $scope.enum_manage_commands       = EnumsSrv.TRAINING.EDIT_TV;
        $scope.enum_showvoccommands         = EnumsSrv.TRAINING.SHOW_TV;
        $scope.enum_show_vb_voc             = EnumsSrv.VOICEBANK.SHOW_TRAINED;
        
        if(data.stateParams == null)    alert("ERROR in VocabularyCtrl::$ionicView.enter. error : NO PARAMS were sent"); 
        else
        {
            if(data.stateParams.foldername != null)
            {
                $scope.foldername               = data.stateParams.foldername;
                $scope.vocabulary_relpath       = $scope.vocabularies_relpath     + "/" + data.stateParams.foldername;
                $scope.training_relpath         = $scope.trainingsessions_relpath      + "/" + data.stateParams.foldername;
                $scope.vocabulary_json_path      = $scope.vocabulary_relpath  + "/" + $scope.default_tv_filename;
            }
            else if(data.stateParams.foldername == null)
            {
                alert("VocabularyCtrl::$ionicView.enter. error : foldername is empty");
                $state.go("home");
            }         
        };  
        
        $scope.appStatus    = InitAppSrv.getStatus();
        return FileSystemSrv.existFile($scope.vocabulary_json_path)
        .then(function(exist)
        {
            if(exist)   return VocabularySrv.getTempTrainVocabulary($scope.vocabulary_json_path)
            else        return null;        
        })
        .then(function(voc)
        {
            if(voc == null) $state.go("home");
            else
            {
                $scope.vocabulary   = voc;
                $scope.headerTitle  = "VOCABOLARIO:    " + voc.sLabel;
                $scope.updateRuntimeStatus($scope.foldername, true)
            }
        })
        .catch(function(error)
        {
            console.log("Error in HomeCtrl::$ionicView.enter ");
            alert("Error in VocabularyCtrl::$ionicView.enter "+ error.toString());
        });
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 
    //===============================================================================================
    //===============================================================================================
    $scope.updateRuntimeStatus = function(localFolder, do_update)
    {
        if(!do_update)  return Promise.resolve(RuntimeStatusSrv.getStatus());
        else 
            return RuntimeStatusSrv.getUpdatedStatusName(localFolder)
        .then(function(rtstatus)
        {
            $scope.status = rtstatus;
            switch($scope.status.AppStatus)
            {
                case EnumsSrv.STATUS.NEW_TV:
                    break;

                case EnumsSrv.STATUS.RECORD_TV:
                    break;

                case EnumsSrv.STATUS.TRAIN_TV:
                    break;

                case EnumsSrv.STATUS.RECORD_TVA:
                    break;

                case EnumsSrv.STATUS.CAN_RECOGNIZE:
                    break;
            };
            $scope.$apply();            
        });        
    };    
   
//    $scope.deleteVocabulary = function()    
//    {
//        $ionicPopup.confirm({ title: 'Warning', template: 'You are deleting the current subject recording SESSION, are you sure ?'}).then(function(res) 
//        {
//            if (res){
//                FileSystemSrv.deleteDir($scope.relpath)
//                .then(function()
//                {
//                    if($scope.subject)  $state.go("subject", {subjId:$scope.subject.id});       
//                    else                $state.go("vocabularies");    
//                })
//                .catch(function(error){
//                    alert(error.message);
//                });
//            }
//        });          
//    };
    
    $scope.loadModel = function()    
    {
        RuntimeStatusSrv.loadVocabulary($scope.foldername)
    };
    
    
    //===============================================================================================
 };
controllers_module.controller('VocabularyCtrl', VocabularyCtrl);   
