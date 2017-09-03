/* 
manage the following object
sentence = { "title": "Ho sete", "id": 1, "label": "ho_sete", "filename":"", "readablefilename": "ho_sete.wav", "existwav": 0 }
filename is by default empty. is here initialized as "$scope.audiofileprefix_ID.wav"
*/
function VoiceBankCtrl($scope, $ionicPlatform, $ionicPopup, $ionicModal, $state, $ionicHistory, FileSystemSrv, IonicNativeMediaSrv, InitAppSrv, EnumsSrv, VocabularySrv, SequencesRecordingSrv)  
{
    $scope.audiofileprefix      = "vb"; // PREFIX of all saved file  ($scope.audiofileprefix + "_" + sentence.id + ".wav"
    $scope.subject              = null;
    $scope.subject_label        = "";
    $scope.newsentencelabel     = {};
    $scope.isBusy               = 0;
    $scope.isInsertingNewSent   = false;
    
    $scope.record_by_sentences  = 1;
    
    $scope.successState         = "voicebank";
    $scope.cancelState          = "voicebank";    
    
    $scope.selCategory          = {};
    //==================================================================================================================
    //==================================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $ionicHistory.clearHistory();
        $scope.deregisterFunc       = $ionicPlatform.registerBackButtonAction(function(event)
        {
            if(!$scope.isInsertingNewSent)  $state.go("home");
            else                            $scope.closeModal();
        }, 100);   
        
        $scope.rel_rootpath         = InitAppSrv.getVoiceBankFolder(); 
        $scope.resolved_rootpath    = FileSystemSrv.getResolvedOutDataFolder() + $scope.rel_rootpath;
        $scope.sentencesCategories  = VocabularySrv.getVocabularyCategories();
        $scope.refreshAudioList();
   });

    // ask user's confirm after pressing back (thus trying to exit from the App)
    $scope.$on('$ionicView.leave', function(){if($scope.deregisterFunc) $scope.deregisterFunc();});    
 
    //==================================================================================================================
    //==================================================================================================================    
    // get VB voc from service, thus updates UI, return 1 or 0 if failure
    $scope.refreshAudioList = function()
    {
        $scope.isBusy    = 1;
        return VocabularySrv.checkVoiceBankAudioPresence()
        .then(function(voc){
            $scope.voicebankSentences = voc;
            $scope.isBusy    = 0;
            $scope.$apply();
            return 1;
        })
        .catch(function(error){
            alert(error.message);
            $scope.isBusy    = 0;
            $scope.$apply();
            return 0;
        });
    }; 
    
    $scope.deleteSentence = function(sentence)
    {
        if(sentence.id.toString()[0] != "9" || sentence.editable == false)
        {
            alert("Error interno ! VoiceBankCtrl::deleteSentence");
            return;
        }
        
        textobj = {title: 'Attenzione', template: 'Stai per cancellare questo comando. Sei sicuro ?'};
        
        return $ionicPopup.confirm(textobj)
        .then(function(res) 
        {    
            $scope.isBusy    = 1;
            VocabularySrv.removeUserVoiceBankSentence(sentence)
            .then(function()
            {
                var filename = $scope.rel_rootpath + "/" + $scope.audiofileprefix + "_" + sentence.id;
                return $scope.deleteAudio(filename); // it also calls $scope.refreshAudioList
            })
            .then(function()
            {
                $scope.isBusy    = 0;  
                $scope.$apply();
            })
            .catch(function(error){
                alert(error.message);
                $scope.isBusy    = 0;
                $scope.$apply();
            });            
        })
        .catch(function(error){
            alert(error.message);
            $scope.isBusy    = 0;
            $scope.$apply();
        });
    };
    //==================================================================================================================
    // CREATE NEW SENTENCE MODAL
    //==================================================================================================================
    // called by user. insert a new item in the voicebank vocabulary
    $scope.newSentence = function()
    {
        $scope.selCategory.data = 7 ;
        $scope.newsentencelabel = "";        
        $scope.modal.show();
    };

    $scope.saveNewSentence = function(sentencelabel)
    {
        return VocabularySrv.addUserVoiceBankSentence(sentencelabel, $scope.selCategory.data, $scope.audiofileprefix)
        .then(function(res)
        {
            if(res == 0)    alert("Il comando esiste gia! cambialo");  // new sentence is already present
            else            return $scope.refreshAudioList().then(function(){ $scope.closeModal(); })
        })
        .catch(function(error){
            alert(error.message);
            $scope.isBusy    = 0;
            $scope.$apply();
        });        
    };
    
    $ionicModal.fromTemplateUrl('templates/popNewSentence.html', 
    {
        scope: $scope,
        animation: 'slide-in-up'            
    })
    .then(function(modal) 
    {
        $scope.isInsertingNewSent = true;
        $scope.modal = modal;
    });   
    
    $scope.closeModal = function()
    {
        $scope.modal.hide();
        $scope.isInsertingNewSent = false;
    };    
    //==================================================================================================================
    // RECORD & PLAYBACK SENTENCES
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
        var sentence = VocabularySrv.getVoiceBankSentence(sentence_id);
        if(sentence.filename == "")
        {
            sentence.filename = $scope.getFileName(sentence_id);
            return VocabularySrv.setVoiceBankSentenceFilename(sentence_id, sentence.filename)
            .then(function(){
                $state.go("record_sequence", {modeId:EnumsSrv.RECORD.MODE_SINGLE_BANK, sentenceId: sentence_id, successState:$scope.successState, cancelState:$scope.cancelState});
            })
        }
        else    $state.go("record_sequence", {modeId:EnumsSrv.RECORD.MODE_SINGLE_BANK, sentenceId: sentence_id, successState:$scope.successState, cancelState:$scope.cancelState});
    };

    $scope.recordAudioSequence = function()
    {
        //create folder
        return SequencesRecordingSrv.calculateSequence( $scope.voicebankSentences, 
                                                        EnumsSrv.RECORD.BY_SENTENCE, 
                                                        1, 
                                                        $scope.rel_rootpath,
                                                        $scope.audiofileprefix,
                                                        false)                      //  don't add repetition id
        .then(function(sequence)
        {
            $scope.record_sequence = sequence;
            if($scope.record_sequence)
            {
                $state.go('record_sequence', {modeId:EnumsSrv.RECORD.MODE_SEQUENCE_BANK, sentenceId:0, successState:$scope.successState, cancelState:$scope.cancelState});
            }
        });
    };

    $scope.deleteAudio = function(filename)
    {
        FileSystemSrv.deleteFile($scope.rel_rootpath + "/" + filename)
        .then(function(success){
           return $scope.refreshAudioList();
        })
        .catch(function(error){
            alert(error.message);
            $scope.isBusy    = 0;
            $scope.$apply();
            return 0;
        });
    };
    
    $scope.getFileName = function(sentenceid)
    {
        return $scope.audiofileprefix + "_" + sentenceid + EnumsSrv.RECORD.FILE_EXT;
    }
    //==================================================================================================================
}
controllers_module.controller('VoiceBankCtrl', VoiceBankCtrl)
