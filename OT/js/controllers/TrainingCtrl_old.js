/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//function TrainingCtrl($scope, vocabulary)//....use resolve 
//function TrainingCtrl($scope)  
function TrainingCtrl($scope, $state, $ionicPopup, $ionicHistory, $ionicPlatform, VocabularySrv, InitAppSrv, FileSystemSrv, StringSrv, EnumsSrv)  
{
    $scope.labelStartTraining                       = "REGISTRA I COMANDI";
    $scope.labelEditTrainVocabulary                 = "MODIFICA COMANDI";
    $scope.labelSelectSentences                     = "SELEZIONA I COMANDI DA RICONOSCERE";
    $scope.labelToggleSentencesEditTrainSequence    = "ADDESTRA I SEGUENTI COMANDI";
    $scope.labelToggleSentencesEditTrainVocabulary  = "MODIFICA LA LISTA DEI COMANDI";

    $scope.subject                                  = {}; // kept for mantaining compatibility between AllSpeak & AllSpeakVoiceRecorder
                                                            // AllSpeak uses subject.sessions
    $scope.selectList                               = true;
    
    $scope.successState                             = "show_session";
    $scope.cancelState                              = "training";
    
    $scope.vocabularyObject                         = {};
    
    $scope.default_training_folder                  = "default";
    $scope.training_folder_name                     = $scope.default_training_folder;
    $scope.relpath                                  = "";   // will be AllSpeak/training_sessions/default
    // =======================================================================================================

    $scope.$on("$ionicView.enter", function(event, data)
    {
        $ionicHistory.clearHistory();
        // ask user's confirm after pressing back (thus trying to exit from the App)
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("home");
        }, 100);        
        
        return VocabularySrv.getTrainVocabulary()
        .then(function(vocobj)
        {
            $scope.vocabularyObject = vocobj;
            if(vocobj.vocabulary != null)
                  $scope.selectList = (vocobj.vocabulary.length ? false : true);
            else  $scope.selectList = false;
            
            $scope.relpath              = $scope.vocabularyObject.rel_local_path;        // AllSpeak/training_sessions/default
            var file                    = $scope.relpath + "/" + "training_vocabulary.json";      // AllSpeak/training_sessions/default/training_vocabulary.json
            $scope.training_folder_name = StringSrv.getFileFolderName(file);    // default     
            return $scope.refreshSessionsList();
        });        
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 

    $scope.selectSentences = function() 
    {    
        $state.go('processvocabulary', {modeId:3, foldername:$scope.default_training_folder});
    }
    
    $scope.doEditTrainVocabulary = function() 
    {
        $state.go('processvocabulary', {modeId:1, foldername:$scope.training_folder_name});
    };
    
    $scope.startTraining = function()
    {    
        $state.go('processvocabulary', {modeId:2, foldername:$scope.training_folder_name});
    }
    
    
    $scope.refreshSessionsList = function()
    {
        FileSystemSrv.listDir($scope.relpath)    //// AllSpeak/training_sessions/default
        .then(function(folders)
        {
            $scope.subject.sessions = folders;
    
            for(s=0; s<$scope.subject.sessions.length; s++)
            {
                $scope.subject.sessions[s].parentdirname    = $scope.training_folder_name;  // default
                $scope.subject.sessions[s].path             = $scope.relpath + "/" + folders[s].name;   // AllSpeak/training_sessions/default + / + training_XXXXXXXX
            }
    
            $scope.$apply();
        })
        .catch(function(error){
            $scope._showAlert("Error", "SubjectSessionsCtrl::refreshSessionsList : " + error.message);
        });
    }; 
    
    $scope._showAlert = function(title, message) {
        var alertPopup = $ionicPopup.alert({
            title: title,
            template: message
        });
    };    
}
controllers_module.controller('TrainingCtrl', TrainingCtrl)
