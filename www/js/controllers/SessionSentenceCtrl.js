/* 
manage the following object
sentence = { "title": "Ho sete", "id": 1, "label": "ho_sete", "filename": "ho_sete.wav", "existwav": 0 }
*/
function SessionSentenceCtrl($scope, $state, SubjectsSrv, FileSystemSrv, IonicNativeMediaSrv, InitAppSrv, VocabularySrv, StringSrv)  
{
    $scope.subject          = null;
    $scope.subject_label    = "";
    $scope.sentence         = {};
    $scope.isPlaying        = 0;
    
    $scope.trainingPath     = "";       // standard
    $scope.sessionPath      = "";       // training_XXXXYYZZ    
    //==================================================================================================================
    //==================================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // LOAD curr subject/session/sentence info
        
        // standard
        if(data.stateParams.trainingPath == null) 
        {
            alert("SessionSentenceCtrl::$ionicView.enter. error : trainingPath is empty");
            $state.go("training");
        }   
        else $scope.trainingPath = data.stateParams.trainingPath;
        
        // training_XXXXYYZZ
        if(data.stateParams.sessionPath == null) 
        {
            alert("SessionSentenceCtrl::$ionicView.enter. error : sessionPath is empty");
            $state.go("training");
        }   
        else $scope.sessionPath = data.stateParams.sessionPath;        
        
        // 1123
        if(data.stateParams.sentenceId == null) 
        {
            alert("SessionSentenceCtrl::$ionicView.enter. error : sentenceId is empty");
            $state.go("training");
        }   
        else $scope.sentenceId = data.stateParams.sentenceId;        
        
        if(data.stateParams.subjId != null && data.stateParams.subjId != "")
        {        
            var subjectId       = parseInt(data.stateParams.subjId);
        
            $scope.subject      = SubjectsSrv.getSubject(subjectId);
            if ($scope.subject)
            {        
                $scope.relpath                      = InitAppSrv.getAudioFolder() + "/" + $scope.subject.folder + "/" + $scope.sessionPath; 
                $scope.audio_files_resolved_root    = FileSystemSrv.getResolvedOutDataFolder() + $scope.relpath;
                $scope.sentence                     = SubjectsSrv.getSubjectSentence(subjectId, $scope.sentenceId);
                $scope.titleLabel                   = $scope.subject.folder + "/" + $scope.sessionPath;
                $scope.refreshAudioList();
            }
            else        alert("Error in SessionSentenceCtrl, empty subject");
        }
        else
        {
            $scope.subject                      = null
            $scope.relpath                      = InitAppSrv.getAudioFolder() + "/" + $scope.trainingPath + "/" + $scope.sessionPath; 
            $scope.audio_files_resolved_root    = FileSystemSrv.getResolvedOutDataFolder() + $scope.relpath;        
            $scope.sentence                     = VocabularySrv.getTrainSentence($scope.sentenceId);
            $scope.titleLabel                   = $scope.trainingPath + "/" + $scope.sessionPath;
            $scope.refreshAudioList();
        }
    });
    
    $scope.refreshAudioList = function()
    {
        if ($scope.subject)
        {        
            return SubjectsSrv.getSubjectSentenceAudioFiles($scope.sentence, $scope.relpath)
            .then(function(sentence){
                $scope.sentence = sentence;
                $scope.$apply();
            });
        }
        else
        {
            return VocabularySrv.getTrainSentenceAudioFiles($scope.sentence, $scope.relpath)
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
        if (!$scope.isPlaying)
        {
            var volume          = 1; //$scope.volume/100;
            $scope.isPlaying    = 1;
            IonicNativeMediaSrv.playAudio($scope.audio_files_resolved_root + "/" + filename_noext + ".wav", volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
        }
    };
    
    $scope.OnPlaybackCompleted = function(success)
    {
        $scope.isPlaying    = 0;
    };
    
    $scope.OnPlaybackError = function(error)
    {
        $scope.isPlaying    = 0;
        console.log(error.message);
    };
    
    $scope.stopAudio = function()
    {
        if ($scope.isPlaying)
        {
            IonicNativeMediaSrv.stopAudio();
            $scope.isPlaying    = 0;
        }        
    };   
    
    $scope.addAudio = function()
    {
        $state.go("record", {"subjId": $scope.subject.id, "sentenceId": $scope.sentence.id});
    };

    $scope.deleteAudio = function(filename_noext)
    {
        filename_noext = StringSrv.removeExtension(filename_noext);
        if (!$scope.isPlaying)
        {        
            FileSystemSrv.deleteFile($scope.relpath + "/" + filename_noext + ".wav")
            .then(function(success){
               $scope.refreshAudioList();
            })
            .catch(function(error){
                alert(error.message);
            });
        }
    };
}
controllers_module.controller('SessionSentenceCtrl', SessionSentenceCtrl)
