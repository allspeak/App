/* 
manage the following object
sentence = { "title": "Ho sete", "id": 1, "label": "ho_sete", "filename":"", "readablefilename": "ho_sete.wav", "nrepetitions": 0 }
filename is by default empty. is here initialized as "$scope.audiofileprefix_ID.wav"
*/
function VoiceBankCtrl($scope, $ionicPlatform, $ionicPopup, $ionicModal, $state, $ionicHistory, FileSystemSrv, IonicNativeMediaSrv, InitAppSrv, EnumsSrv, VocabularySrv, VoiceBankSrv, SequencesRecordingSrv)  
{
    $scope.audiofileprefix      = "vb"; // PREFIX of all saved file  ($scope.audiofileprefix + "_" + sentence.id + ".wav"
    $scope.subject              = null;
    $scope.subject_label        = "";
    $scope.newsentencelabel     = {};
    $scope.isBusy               = 0;
    $scope.isInsertingNewSent   = false;
    
    $scope.subheaderAll         = "TUTTI I COMANDI"
    $scope.subheaderTrained     = "COMANDI ADDESTRATI"
    $scope.showOnlyTrained      = true;
    
    $scope.record_by_sentences  = 1;
    
    $scope.successState         = "voicebank";
    $scope.cancelState          = "voicebank";    
    
    $scope.selCategory          = {};
    
    $scope.vocabulary           = null;
    $scope.modalRecordNewCommand  = null;
    $scope.newSentenceObj       = null; // used to 
    //==================================================================================================================
    //==================================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $ionicHistory.clearHistory();
        $scope.deregisterFunc       = $ionicPlatform.registerBackButtonAction(function(event)
        {
            if(!$scope.isInsertingNewSent)
            {
                if($scope.backState == "vocabulary")
                    $state.go($scope.backState, {"foldername":$scope.foldername});                 
                else
                    $state.go($scope.backState);
            }
            else    $scope.closeModal();
        }, 100);   
        
        //---------------------------------------------------------------------------------------------------------------------
        // manage input params
        //---------------------------------------------------------------------------------------------------------------------
        $scope.backState        = "home";
        $scope.elems2display    = EnumsSrv.VOICEBANK.SHOW_ALL;
        $scope.appStatus        = InitAppSrv.getStatus();

        // when called with elems2display = SHOW_TRAINED and backState = vocabulary. it contains the vocabulary folder name
        // otherwise consider userActiveVocabularyName
        $scope.foldername       = $scope.appStatus.userActiveVocabularyName;       
        
        if(data.stateParams != null)
        {
            if(data.stateParams.elems2display != null && data.stateParams.elems2display != "")  $scope.elems2display    = parseInt(data.stateParams.elems2display);
            if(data.stateParams.backState != null && data.stateParams.backState != "")          $scope.backState        = data.stateParams.backState;
            if($scope.backState == "vocabulary")
            {
                if(data.stateParams.foldername != null)  $scope.foldername = data.stateParams.foldername;
                else
                {
                    alert("Error in VoicebankCtrl::$ionicView.enter : backstate = vocabulary but voc folder was not specified");
                    $scope.backState = "home";
                }
            }   
        }
        //---------------------------------------------------------------------------------------------------------------------
        $scope.rel_rootpath         = InitAppSrv.getVoiceBankFolder(); 
//        $scope.rel_vocpath          = InitAppSrv.getVoiceBankFolder(); 
        $scope.resolved_rootpath    = FileSystemSrv.getResolvedOutDataFolder() + $scope.rel_rootpath;
        $scope.sentencesCategories  = VoiceBankSrv.getVocabularyCategories();
        
        return $scope.loadVoc($scope.foldername)
        .then(function(voc)
        {
            $scope.vocabulary   = voc;   
            if($scope.elems2display == EnumsSrv.VOICEBANK.SHOW_ALL) return $scope.refreshAudioList();
            else                                                    return $scope.refreshTrainingAudioList();
        })
        .then(function()
        {
            if($scope.modalRecordNewCommand == null)
            {
                $ionicModal.fromTemplateUrl('templates/modal/modal2QuestionsBigButtons.html', {
                    scope: $scope, animation: 'slide-in-up'}).then(function(modal) {$scope.modalRecordNewCommand = modal;});                
            }        
        })
        .catch(function(error){
            alert(error.message);
        });        
   });

    // ask user's confirm after pressing back (thus trying to exit from the App)
    $scope.$on('$ionicView.leave', function(){if($scope.deregisterFunc) $scope.deregisterFunc();});    
 
    //==================================================================================================================
    //==================================================================================================================    
    $scope.loadVoc = function(foldername)
    {
        if(foldername != "")    return VocabularySrv.getTrainVocabularyName($scope.foldername);
        else                    return Promise.resolve([]);
    };
    //==================================================================================================================    
    // get ALL VB voc elements from service, thus updates UI, return 1 or 0 if failure
    $scope.refreshAudioList = function()
    {
        $scope.isBusy    = 1;
        return VoiceBankSrv.updateVoiceBankAudioPresence()
        .then(function(cmds)
        {
            $scope.voicebankSentences   = cmds;
            $scope.isBusy               = 0;
            $scope.showOnlyTrained      = false; 
            $scope.subHeaderTitle       = $scope.subheaderAll;
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
    
    // get ONLY those VB voc elements that belongs to the training list, thus updates UI, return 1 or 0 if failure
    $scope.refreshTrainingAudioList = function()
    {
        $scope.isBusy    = 1;
        return VocabularySrv.updateTrainVocabularyAudioPresence($scope.rel_rootpath, $scope.vocabulary)
        .then(function(voc)
        {
            $scope.voicebankSentences   = voc.commands;
            $scope.isBusy               = 0;
            $scope.showOnlyTrained      = true; 
            $scope.subHeaderTitle       = $scope.subheaderTrained;
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
            return VoiceBankSrv.removeUserVoiceBankCommand(sentence)
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
        if(!sentencelabel.length)   // should not be necessary as the modal enables the button only if sentencelabel is not empty
        {
            alert("Attenzione. Il domando inserito è vuoto, correggilo!");
            return;
        };
        
        return VoiceBankSrv.addUserVoiceBankCommand(sentencelabel, $scope.selCategory.data, $scope.audiofileprefix)
        .then(function(newsentence)
        {
            if(newsentence == null)    alert("Il comando esiste gia! cambialo");  // new sentence is already present
            else            
            {
                $scope.newSentenceObj= newsentence;
            
                return $scope.refreshAudioList()
                .then(function()
                {
                    $scope.closeModal(); 
                    $scope.modalText = "VUOI REGISTRARE LA TUA VOCE MENTRE PRONUNCI QUESTO NUOVO COMANDO ?"
                    $scope.labelActionA = "REGISTRA"
                    $scope.labelActionB = "RITORNA"
                    $scope.modalRecordNewCommand.show();
//                    return $ionicPopup.confirm({ title: 'Attenzione', template: 'Vuoi registrare la tua voce mentre pronunci questo nuovo comando ?'})
                })
            }
//                .then(function(dorecordvoice) 
//                {                
//                    if(dorecordvoice)   $scope.recordAudio(newsentence.id)
//                })
        })
        .catch(function(error){
            alert(error.message);
            $scope.isBusy    = 0;
            $scope.$apply();
        });        
    };
    
    $scope.TwoQuestionsAction = function(bool)
    {
        $scope.modalRecordNewCommand.hide()
        if(bool)        $scope.recordAudio($scope.newSentenceObj.id)
    };
    
    $ionicModal.fromTemplateUrl('templates/modal/modalNewSentence.html', 
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
            IonicNativeMediaSrv.playAudio($scope.resolved_rootpath + "/" + filename, volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
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
        var sentence = VoiceBankSrv.getVoiceBankCommand(sentence_id);
        if(sentence.filename == "")
        {
            sentence.filename = $scope.getFileName(sentence_id);
            return VoiceBankSrv.setVoiceBankCommandFilename(sentence_id, sentence.filename)
            .then(function(){
                $state.go("record_sequence", {modeId:EnumsSrv.RECORD.MODE_SINGLE_BANK, commandId: sentence_id, successState:$scope.successState, cancelState:$scope.cancelState});
            })
        }
        else    $state.go("record_sequence", {modeId:EnumsSrv.RECORD.MODE_SINGLE_BANK, commandId: sentence_id, successState:$scope.successState, cancelState:$scope.cancelState});
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
                $state.go('record_sequence', {modeId:EnumsSrv.RECORD.MODE_SEQUENCE_BANK, commandId:0, successState:$scope.successState, cancelState:$scope.cancelState});
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