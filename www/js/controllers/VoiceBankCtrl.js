/* 
manage the following object
sentence = { "title": "Ho sete", "id": 1, "label": "ho_sete", "filename": "ho_sete.wav", "existwav": 0 }
*/
function VoiceBankCtrl($scope, $state, FileSystemSrv, IonicNativeMediaSrv, InitAppSrv, EnumsSrv, SequencesRecordingSrv)  
{
    $scope.subject          = null;
    $scope.subject_label    = "";
    $scope.sentence         = {};
    $scope.isBusy        = 0;
    
    $scope.record_by_sentences = 1;
    
    //==================================================================================================================
    //==================================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.rel_rootpath         = InitAppSrv.getVoiceBankFolder(); 
        $scope.resolved_rootpath    = FileSystemSrv.getResolvedOutDataFolder() + $scope.rel_rootpath;
        $scope.refreshAudioList();
    });
    
    $scope.refreshAudioList = function()
    {
        $scope.isBusy    = 1;
        return InitAppSrv.getGlobalVocabularyStatus()
        .then(function(voc){
            $scope.voicebankSentences = voc;
            $scope.isBusy    = 0;
            $scope.$apply();
        })
        .catch(function(error){
            alert(error.message);
            $scope.isBusy    = 0;
            $scope.$apply();
        });
    };    
    
    //==================================================================================================================
    //==================================================================================================================
    $scope.playAudio = function(filename)
    {
        if (!$scope.isBusy)
        {
            var volume       = 1; //$scope.volume/100;
            $scope.isBusy    = 1;
            IonicNativeMediaSrv.playAudio($scope.resolved_rootpath + "/" + filename , volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
        }
    };
    
    $scope.OnPlaybackCompleted = function(success)
    {
        $scope.isBusy    = 0;
        $scope.$apply();
    };
    
    $scope.OnPlaybackError = function(error)
    {
        $scope.isBusy    = 0;
        console.log(error.message);
        $scope.$apply();
    };
    
    $scope.stopAudio = function()
    {
        if ($scope.isBusy)
        {
            IonicNativeMediaSrv.stopAudio();
            $scope.isBusy    = 0;
        }        
    };   
    
    $scope.recordAudio = function(sentence_id)
    {
        InitAppSrv.setPostRecordState("voicebank");
        $state.go("record_sequence", {modeId:EnumsSrv.RECORD.MODE_SINGLE_BANK, sentenceId: sentence_id});
    };


    $scope.recordAudioSequence = function()
    {
        //create folder
        return SequencesRecordingSrv.calculateSequence( $scope.voicebankSentences, 
                                                        EnumsSrv.RECORD.BY_SENTENCE, 
                                                        1, 
                                                        $scope.rel_rootpath,
                                                        false)                      //  don't add repetition id
        .then(function(sequence)
        {
            $scope.record_sequence = sequence;
            if($scope.record_sequence)
            {
                InitAppSrv.setPostRecordState("voicebank");
                $state.go('record_sequence', {modeId:EnumsSrv.RECORD.MODE_SEQUENCE_BANK, sentenceId:0});
            }
        });
    };

    $scope.deleteAudio = function(filename)
    {
        if (!$scope.isBusy)
        {        
            FileSystemSrv.deleteFile($scope.rel_rootpath + "/" + filename)
            .then(function(success){
               $scope.refreshAudioList();
            })
            .catch(function(error){
                alert(error.message);
                $scope.isBusy    = 0;
                $scope.$apply();
            });
        }
    };
}
controllers_module.controller('VoiceBankCtrl', VoiceBankCtrl)
