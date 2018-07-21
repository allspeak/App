/* 
manage the following object
sentence = { "title": "Ho sete", "id": 1, "label": "ho_sete", "filename": "ho_sete.wav", "nrepetitions": 0 }
*/
function SessionSentenceCtrl($scope, $state, $ionicPlatform, $ionicHistory, SubjectsSrv, FileSystemSrv, IonicNativeMediaSrv, InitAppSrv, VocabularySrv, CommandsSrv, StringSrv)  
{
    $scope.subject          = null;
    $scope.subject_label    = "";
    $scope.sentence         = {};
    $scope.isBusy        = 0;
    
    
    $scope.foldername       = "";       // standard
    $scope.sessionPath      = "";       // training_XXXXYYZZ    
    //==================================================================================================================
    //==================================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function(event)
        {
            if($scope.isBusy)   return;
            else                $ionicHistory.goBack()
        }, 100);           
        // LOAD curr subject/session/sentence info
        
        // standard
        if(data.stateParams.foldername == null) 
        {
            alert("SessionSentenceCtrl::$ionicView.enter. error : foldername is empty");
            $state.go("vocabularies");
        }   
        else $scope.foldername = data.stateParams.foldername;
        
        // training_XXXXYYZZ
        if(data.stateParams.sessionPath != null) $scope.sessionPath = data.stateParams.sessionPath;        
        
        // 1123
        if(data.stateParams.commandId == null) 
        {
            alert("SessionSentenceCtrl::$ionicView.enter. error : commandId is empty");
            $state.go("vocabularies");
        }   
        else $scope.commandId = data.stateParams.commandId;        
        
        if(data.stateParams.subjId != null && data.stateParams.subjId != "")
        {        
            // VOICERECORDER            
            var subjectId       = parseInt(data.stateParams.subjId);
        
            $scope.subject      = SubjectsSrv.getSubject(subjectId);
            if ($scope.subject)
            {        
                $scope.training_relpath             = InitAppSrv.getAudioFolder() + "/" + $scope.subject.folder + "/" + $scope.sessionPath; 
                $scope.audio_files_resolved_root    = FileSystemSrv.getResolvedOutDataFolder() + $scope.training_relpath;
                $scope.sentence                     = SubjectsSrv.getSubjectSentence(subjectId, $scope.commandId);
                $scope.titleLabel                   = $scope.subject.folder + "/" + $scope.sessionPath;
                $scope.refreshAudioList();
            }
            else        alert("Error in SessionSentenceCtrl, empty subject");
        }
        else
        {
            // ALLSPEAK
            $scope.subject                      = null;
            $scope.training_relpath             = InitAppSrv.getAudioFolder(); // + "/" + $scope.foldername + "/" + $scope.sessionPath; 
            $scope.audio_files_resolved_root    = FileSystemSrv.getResolvedOutDataFolder() + $scope.training_relpath;        
            $scope.titleLabel                   = $scope.foldername + "/" + $scope.sessionPath;
            
            return VocabularySrv.getTrainVocabularyName($scope.foldername)
            .then(function(voc)
            {            
                return VocabularySrv.getTrainCommand($scope.commandId, voc)
            })
            .then(function(cmd)
            {
                $scope.sentence = cmd;
                $scope.refreshAudioList();
            })
        }
    });
    // ask user's confirm after pressing back (thus trying to exit from the App)
    $scope.$on('$ionicView.leave', function(){if($scope.deregisterFunc) $scope.deregisterFunc();});   
    
    $scope.refreshAudioList = function()
    {
        if ($scope.subject)
        {        
            return SubjectsSrv.getSubjectSentenceAudioFiles($scope.sentence, $scope.training_relpath)
            .then(function(sentence){
                $scope.sentence = sentence;
                $scope.$apply();
            });
        }
        else
        {
            return CommandsSrv.getCommandFilesByPath($scope.sentence, $scope.training_relpath)
            .then(function(sentence){
                $scope.sentence = sentence;
                $scope.$apply();
            });
            
        }
    };    
    
    //==================================================================================================================
    //==================================================================================================================
    $scope.playAudio = function(filename_noext)
    {
        filename_noext = StringSrv.removeExtension(filename_noext);
        if (!$scope.isBusy)
        {
            var volume          = 1; //$scope.volume/100;
            $scope.isBusy    = 1;
            IonicNativeMediaSrv.playAudio($scope.audio_files_resolved_root + "/" + filename_noext + ".wav", volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
        }
    };
    
    $scope.OnPlaybackCompleted = function(success)
    {
        $scope.isBusy = 0;
        $scope.$apply();
    };
    
    $scope.OnPlaybackError = function(error)
    {
        $scope.isBusy    = 0;
        $scope.$apply();
        console.log(error.message);
    };
    
    $scope.stopAudio = function()
    {
        if ($scope.isBusy)
        {
            IonicNativeMediaSrv.stopAudio();
            $scope.isBusy    = 0;
            $scope.$apply();
        }        
    };   
    
    $scope.addAudio = function()
    {
        $state.go("record", {"subjId": $scope.subject.id, "commandId": $scope.sentence.id});
    };

    $scope.deleteAudio = function(filename_noext)
    {
        filename_noext = StringSrv.removeExtension(filename_noext);
        if (!$scope.isBusy)
        {        
            FileSystemSrv.deleteFile($scope.training_relpath + "/" + filename_noext + ".wav")
            .then(function(){
               $scope.refreshAudioList();
            })
            .catch(function(error){
                alert(error.message);
            });
        }
    };
}
controllers_module.controller('SessionSentenceCtrl', SessionSentenceCtrl)
