/* 
 *  Show subject info and list sentences with at least one recording ....allows deleting the subject and record a new/existing sentence
 *  
    "subjects":
    [
        { "label": "Mario Rossi", "id": 1, "age": 91, "description: "abcdefghil", "commands": [
            { "title": "Ho sete", "id": 1, "label": "ho_sete", "filename": "ho_sete.wav", "nrepetitions": 0 },
            { "title": "Chiudi la porta", "id": 2, "label": "chiudi_porta", "filename" : "chiudi_porta.wav", "nrepetitions": 0}
        ]},
        ........
    ]
 */
function ManageRecordingsCtrl($scope, $q, $ionicModal, $ionicPopup, $state, $ionicPlatform, InitAppSrv, VocabularySrv, CommandsSrv, SequencesRecordingSrv, FileSystemSrv, MfccSrv, SubjectsSrv, EnumsSrv, UITextsSrv)
{
    $scope.subject              = null;     // stay null in AllSpeak
    $scope.foldername           = "";       // standard
    $scope.sessionPath          = "";       // training_XXXXYYZZ

    $scope.labelResumeTrainSession  = "REGISTRA RIPETIZIONI"
    $scope.labelSubmit              = "ADDESTRA"

    $scope.timerID              = -1;
    $scope.isNetAvailableRemote = false;        // net calculated. available online
    $scope.isNetAvailableLocale = false;        // net calculated. available online
    $scope.isSubmitting         = false;        // net calculation process initiated
    $scope.isChecking           = false;        // true when checking net availability
    
    $scope.nFiles               = 0;    // count number of audio within the session
    $scope.nCurFile             = 0;    // indicates the number of the currently processed file
    
    $scope.minNumRepetitions    = EnumsSrv.RECORD.SESSION_MIN_REPETITIONS;
    $scope.maxNumRepetitions    = EnumsSrv.RECORD.SESSION_MAX_REPETITIONS;
    
    $scope.pageTitle            = "Registrazioni Comandi";
    
    $scope.modalRecordSequence  = null;
    //==============================================================================================================================
    // ENTER & REFRESH
    //==============================================================================================================================    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("vocabulary", {foldername:$scope.foldername});
        }, 100);         
        
        //---------------------------------------------------------------------------------------------------------------------
        // manage input params
        //---------------------------------------------------------------------------------------------------------------------        
        if(data.stateParams.foldername == null) 
        {
            alert("ManageRecordingsCtrl::$ionicView.enter. error : foldername is empty");
            $state.go("vocabularies");
        }   
        else $scope.foldername = data.stateParams.foldername;
        
        // training_XXXXYYZZ
        if(data.stateParams.sessionPath == null) 
        {
            alert("ManageRecordingsCtrl::$ionicView.enter. error : sessionPath is empty");
            $state.go("vocabularies");
        }   
        else $scope.sessionPath = data.stateParams.sessionPath;

        $scope.subject         = null;
        if(data.stateParams.subjId != null && data.stateParams.subjId != "")
        {
            // we are in AllSpeakVoiceRecorder 
            $scope.subject_id   = parseInt(data.stateParams.subjId);
            $scope.subject      = SubjectsSrv.getSubject($scope.subject_id);
            $scope.foldername = $scope.subject.folder;
        }    

        //------------------------------------------------------------------------------------------
        $scope.repetitionsCount         = SequencesRecordingSrv.getRepetitions(); 
        $scope.selectedTrainingModality = SequencesRecordingSrv.getModalities()[1]; 
        
        $scope.pluginInterface      = InitAppSrv.getPlugin();        
        $scope.plugin_enum          = $scope.pluginInterface.ENUM.PLUGIN;
        
        $scope.nFiles               = 0;
        
        $scope.initMfccParams       = {"nDataDest": $scope.plugin_enum.MFCC_DATADEST_FILE,
                                       "nDataType": $scope.plugin_enum.MFCC_DATATYPE_MFFILTERS,  //write FILTERS to FILE        
                                       "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S_CTX};  //    
        $scope.mfccCfg              = MfccSrv.getUpdatedCfgCopy($scope.initMfccParams);
        
        $scope.training_relpath     = InitAppSrv.getAudioFolder() + "/" + $scope.foldername
        $scope.training_relpath     = ($scope.sessionPath.length    ?  $scope.training_relpath + "/" + $scope.sessionPath    :  $scope.training_relpath);   //    AllSpeak/training_sessions  /  standard  /  training_XXFDFD
        
        $scope.vocabulary_json_path = InitAppSrv.getVocabulariesFolder() + "/" + $scope.foldername + "/" + UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;
        $scope.successState         = "manage_recordings";
        $scope.cancelState          = "manage_recordings";
        
        VocabularySrv.getTrainVocabulary($scope.vocabulary_json_path)
        .then(function(vocabulary)
        {
            $scope.headerTitle      = "VOCABOLARIO :   " + vocabulary.sLabel;
            $scope.commands         = vocabulary.commands;
            return $scope.refreshAudioList();
        })
        .then(function()
        {
            if($scope.modalRecordSequence == null)
            {
                $ionicModal.fromTemplateUrl('templates/modal/modalSelectCmd2Record.html', {
                    scope: $scope, animation: 'slide-in-up'}).then(function(modal) {$scope.modalRecordSequence = modal;});                
            }
        })     
        .catch(function(error){
            alert("ManageRecordingsCtrl::$ionicView.enter => " + error.message);
        });
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });     
    
    //-------------------------------------------------------------------  
    // button back to vocabulary
    $scope.cancel = function()
    {
        $state.go('vocabulary', {"foldername":$scope.foldername});
    }; 
    
    $scope.refreshAudioList = function()
    {
        if($scope.subject)
        {
            return SubjectsSrv.getSubjectVocabularyFiles($scope.commands, $scope.training_relpath)
            .then(function(session_commands)
            {
                $scope.subject.commands   = session_commands;
                $scope.nFiles             = $scope._getFilesNum(session_commands);
                $scope.$apply();
                return true;
            })        
            .catch(function(error){
                $scope._showAlert("Error", "ManageRecordingsCtrl::refreshAudioList => " + error.message);
                return false;
            });                
        }
        else
        {
            return CommandsSrv.getCommandsFilesByPath($scope.commands, $scope.training_relpath)
            .then(function(session_commands)
            {
                // session_commands = [{nrepetitions:int, files:["filename.wav", ""], firstAvailableId:int, id:int, title:String}]                
                $scope.commands   = session_commands;
                $scope.nFiles     = $scope._getFilesNum(session_commands);
                $scope.canSubmit  = $scope._canSubmit(session_commands);
                $scope.$apply();
                return true;
            })        
            .catch(function(error){
                $scope._showAlert("Error", "ManageRecordingsCtrl::refreshAudioList => " + error.message);
                return false;
            });
        }
    };

    //==============================================================================================================================
    // TRAINING SENTENCE SEQUENCES    
    //==============================================================================================================================
    $scope.training_sequence    = [];
    
    // add new sentences to train
    $ionicModal.fromTemplateUrl('templates/modal/modalSelectCmd2Record.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.modalRecordSequence = modal;
    });

    $scope.onChangeToogle = function()
    {
        var len = $scope.commands.length;
        for(s=0; s<len; s++) 
        {
            if($scope.commands[s].checked)
            {
                $scope.isValidTrainingList = true;
                break;
            }
        }
    };
    
    $scope.selectAll = function(bool)
    {
        for(s=0; s<$scope.commands.length; s++)
            $scope.commands[s].checked = bool;
        
        $scope.onChangeToogle();
    };      
    
    $scope.completeSession = function() {
//        $scope.selectedTrainingModality    = $scope.selectObjByValue(1, $scope.training_modalities);
        $scope.modalRecordSequence.show();
    };

    $scope.doCompleteSession = function() 
    {
        $scope.modalRecordSequence.hide();    
        var sentences = [];
        for(var cmd=0; cmd<$scope.commands.length; cmd++)
            if($scope.commands[cmd].checked)
                sentences.push($scope.commands[cmd]);
        
        if(sentences.length)
        {
            var record_relpath = $scope.training_relpath;//            var record_relpath = $scope.training_relpath + "/training_" + StringSrv.formatDate();
            return SequencesRecordingSrv.calculateSequence( sentences, 
                                                            $scope.selectedTrainingModality.value, 
                                                            $scope.repetitionsCount, 
                                                            record_relpath,
                                                            "train",
                                                            true)                      //  add #repetition to file name
            .then(function(sequence)
            {
                $scope.training_sequence = sequence;    
                $state.go('record_sequence', {modeId:EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING, commandId: 0, successState:$scope.successState, cancelState:$scope.cancelState});
            })
            .catch(function(error){
                alert(error.message);
            });              
        }
        else
            alert("non hai scelto nessuna frase da addestrare");
    };
  
    $scope.decrementRepCount = function() {
        $scope.repetitionsCount--;
        if($scope.repetitionsCount < 1) $scope.repetitionsCount = 1;
    };
    
    $scope.incrementRepCount = function() {
        $scope.repetitionsCount++;
    };    

    // delete all wavs recorded in the vocabulary
    $scope.deleteSession = function() 
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'Stai per cancellare tutte le registrazioni di questo vocabolario, sei sicuro ?'})
        .then(function(res) 
        {
            if (res){
                return FileSystemSrv.deleteFilesInFolder($scope.training_relpath, ["wav"])
                .then(function()
                {
                    if($scope.subject)  $state.go("subject", {subjId:$scope.subject.id});       
                    else                $scope.refreshAudioList();;    
                })
                .catch(function(error){
                    alert(error.message);
                });
            }
        });        
    };
    
    
    $scope.submitSession = function() 
    {
        $state.go("manage_training", {foldername:$scope.foldername});
    };    
    //==============================================================================================================================
    // PRIVATE
    //==============================================================================================================================
    $scope._getFilesNum = function(commands)
    {
        var cnt = 0;
        for(var f=0; f<commands.length; f++)
            if(commands[f].nrepetitions)
                cnt = cnt + commands[f].files.length;
        return cnt;
    };
    
    $scope._canSubmit = function(commands)
    {
        for(var f=0; f<commands.length; f++)
            if(commands[f].nrepetitions < $scope.minNumRepetitions)
                return false;
        return true;
    };
    
    $scope._showAlert = function(title, message) {
        var alertPopup = $ionicPopup.alert({
            title: title,
            template: message
        });
    };
    //==============================================================================================================================
};
controllers_module.controller('ManageRecordingsCtrl', ManageRecordingsCtrl)
