/* 
manage the following object
sentence = { "title": "Ho sete", "id": 1, "label": "ho_sete", "filename": "ho_sete.wav", "existwav": 0 }
*/
function SentenceCtrl($scope, $state, SubjectsSrv, FileSystemSrv, IonicNativeMediaSrv, InitAppSrv, StringSrv)  
{
    $scope.subject          = null;
    $scope.subject_label    = "";
    $scope.sentence         = {};
    $scope.isPlaying        = 0;
    
    //==================================================================================================================
    //==================================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // LOAD curr subject/sentence info
        var subjectId       = parseInt(data.stateParams.subjId);
        var sentenceId      = parseInt(data.stateParams.sentenceId);
        
        $scope.subject      = SubjectsSrv.getSubject(subjectId);
        if ($scope.subject)
        {        
            $scope.relpath                      = InitAppSrv.appData.file_system.training_folder + "/" + $scope.subject.folder ; 
            $scope.audio_files_resolved_root    = FileSystemSrv.getResolvedOutDataFolder() + $scope.relpath;
            $scope.sentence                     = SubjectsSrv.getSubjectSentence(subjectId, sentenceId);
            $scope.refreshAudioList();
        };
    });    
    
    $scope.refreshAudioList = function()
    {
        SubjectsSrv.getSubjectSentenceAudioFiles($scope.sentence, $scope.relpath)
        .then(function(sentence){
            $scope.sentence = sentence;
            $scope.$apply();
        });
    };    
    
    //==================================================================================================================
    //==================================================================================================================
    $scope.playAudio = function(filename_noext)
    {
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
controllers_module.controller('SentenceCtrl', SentenceCtrl)
