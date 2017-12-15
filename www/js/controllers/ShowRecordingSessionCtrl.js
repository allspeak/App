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
function ShowRecordingSessionCtrl($scope, $q, $ionicModal, $ionicPopup, $state, $ionicPlatform, InitAppSrv, VocabularySrv, SequencesRecordingSrv, FileSystemSrv, MfccSrv, TfSrv, SubjectsSrv, RemoteAPISrv, EnumsSrv)
{
    $scope.subject              = null;     // stay null in AllSpeak
    $scope.foldername           = "";       // standard
    $scope.sessionPath          = "";       // training_XXXXYYZZ

    $scope.labelResumeTrainSession  = "REGISTRA RIPETIZIONI"
    $scope.labelSubmit              = "ADDESTRA"

    $scope.isSubmitting         = false;
    $scope.nFiles               = 0;    // count number of audio within the session
    $scope.nCurFile             = 0;    // indicates the number of the currently processed file
    
    $scope.minNumRepetitions    = EnumsSrv.RECORD.SESSION_MIN_REPETITIONS;
    $scope.maxNumRepetitions    = EnumsSrv.RECORD.SESSION_MAX_REPETITIONS;
    
    $scope.pageTitle            = "Registrazioni Comandi";
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
            alert("ShowRecordingSessionCtrl::$ionicView.enter. error : foldername is empty");
            $state.go("vocabularies");
        }   
        else $scope.foldername = data.stateParams.foldername;
        
        // training_XXXXYYZZ
        if(data.stateParams.sessionPath == null) 
        {
            alert("ShowRecordingSessionCtrl::$ionicView.enter. error : sessionPath is empty");
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
        
        $scope.initMfccParams       = {"nDataDest": $scope.plugin_enum.MFCC_DATADEST_FILE,
                                       "nDataType": $scope.plugin_enum.MFCC_DATATYPE_MFFILTERS,  //write FILTERS to FILE        
                                       "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S_PP_CTX};  //    
        $scope.nFiles               = 0;
        $scope.mfccCfg              = MfccSrv.getUpdatedCfg($scope.initMfccParams);
        
        $scope.tfCfg                = TfSrv.getCfg();

        $scope.relpath              = InitAppSrv.getAudioFolder() + "/" + $scope.foldername
        $scope.relpath              = ($scope.sessionPath.length    ?  $scope.relpath + "/" + $scope.sessionPath    :  $scope.relpath);   //    AllSpeak/training_sessions  /  standard  /  training_XXFDFD
        
        $scope.successState         = "show_recording_session";
        $scope.cancelState          = "show_recording_session";
        
        VocabularySrv.getTrainVocabulary()
        .then(function(vocabulary)
        {
            $scope.headerTitle      = "VOCABOLARIO :   " + vocabulary.sLabel;
            $scope.commands         = vocabulary.commands;
            $scope.refreshAudioList();
        })
        .catch(function(error){
            alert("ShowRecordingSessionCtrl::$ionicView.enter => " + error.message);
        });
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });     
    
    $scope.refreshAudioList = function()
    {
        if($scope.subject)
        {
            return SubjectsSrv.getSubjectVocabularyFiles($scope.commands, $scope.relpath)
            .then(function(session_commands)
            {
                $scope.subject.commands   = session_commands;
                $scope.nFiles             = $scope._getFilesNum(session_commands);
                $scope.$apply();
            })        
            .catch(function(error){
                $scope._showAlert("Error", "ShowRecordingSessionCtrl::refreshAudioList => " + error.message);
            });                
        }
        else
        {
            return VocabularySrv.getTrainVocabularyFiles($scope.relpath, $scope.commands)
            .then(function(session_commands)
            {
                // session_commands = [{nrepetitions:int, files:["filename.wav", ""], firstAvailableId:int, id:int, title:String}]                
                $scope.commands   = session_commands;
                $scope.nFiles     = $scope._getFilesNum(session_commands);
                $scope.$apply();
            })        
            .catch(function(error){
                $scope._showAlert("Error", "ShowRecordingSessionCtrl::refreshAudioList => " + error.message);
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
        var sentences = $scope.commands.map(function(item) { return (item.checked ? item : null)});
        
        if(sentences.length)
        {
            var record_relpath = $scope.relpath;//            var record_relpath = $scope.vocabularyaudio_folder + "/training_" + StringSrv.formatDate();
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

    //==============================================================================================================================
    // SUBMIT SESSION
    //==============================================================================================================================
    // delete all wavs recorded in the vocabulary
    $scope.deleteSession = function() 
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'Stai per cancellare tutte le registrazioni di questo vocabolario, sei sicuro ?'})
        .then(function(res) 
        {
            if (res){
                return FileSystemSrv.deleteFilesInFolder($scope.relpath, ["wav"])
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
//        $scope.upLoadSession();
        $ionicPopup.confirm({ title: 'Attenzione', template: 'Stai per inviare le tue registrazioni al server per ottenere la tua nuova rete neurale\nVuoi proseguire?'})
        .then(function(res) 
        {
            if (res)
            {
                $scope.isSubmitting = true;
                return $scope.createSessionJson($scope.relpath + "/" + "training.json")
                .then(function(){
                    $scope.extractFeatures(false);  
                })
                .catch(function(error)
                {
                    alert("ShowRecSess::submitSession : " + error.message);
                    $scope.isSubmitting = false;
                });
            }
        });        
    };
   
    $scope.createSessionJson = function(jsonpath) 
    {
        var ids = VocabularySrv.getTrainVocabularyIDLabels();
        return TfSrv.createTrainingDataJSON($scope.foldername, ids, $scope.mfccCfg.nProcessingScheme, $scope.tfCfg.nModelType, jsonpath);
    };
    
    // called by $scope.onExtractFeaturesEnd whether isSubmitting
    $scope.zipSession = function() 
    {
        window.addEventListener('traindataready', $scope.onZipFolder);
        window.addEventListener('pluginError'   , $scope.onPluginError);        
        $scope.pluginInterface.zipFolder($scope.relpath, $scope.relpath + "/" + "data.zip", ["dat", "json"]);
    };

    $scope.onZipFolder = function()
    {
        window.removeEventListener('traindataready', $scope.onZipFolder);
        window.removeEventListener('pluginerror'   , $scope.onPluginError);       
        if($scope.isSubmitting) $scope.upLoadSession();
    };
    
    $scope.upLoadSession = function() 
    {
        RemoteAPISrv.uploadTrainingData($scope.relpath + "/" + "data.zip", $scope.onSubmitSuccess, $scope.onSubmitError, $scope.onSubmitProgress);
    };
    
    $scope.onSubmitSuccess = function() 
    {
        alert("data uploaded");
    };
    
    $scope.onSubmitError = function(error) 
    {
        alert("ERROR while uploading data : " + error);
    };
    
    $scope.onSubmitProgress = function(progress) 
    {
        console.log(progress.toString());
    };

    $scope.onPluginError = function(error)  // {message: error.message, type:error.type}
    {
        alert("ShowRecordingSessionCtrl :" + error.message);
    };
    

    //==============================================================================================================================
    // EXTRACT FEATURES
    //==============================================================================================================================
    $scope.askExtractFeatures = function() 
    {  
        var myPopup = $ionicPopup.show(
        {
//            template: '<center><img src="https://officeimg.vo.msecnd.net/en-us/images/MR900185586.gif"/></center> <br> <input type="password" ng-model="data.wifi">',
            title: 'Attenzione',
            subTitle: 'Stai per rianalizzare i dati.\nVuoi sovrascrivere i dati esistenti?',
            scope: $scope,
            buttons: [
             {
                    text: '<b>CANCELLA</b>',
                    type: 'button-positive',
                    onTap: function() { return -1; }
                },
                {
                    text: '<b>SI</b>',
                    type: 'button-positive',
                    onTap: function() { return 1; }
                },
                {
                    text: '<b>NO</b>',
                    type: 'button-positive',
                    onTap: function() { return 0; }
                }]
        });
        myPopup.then(function(res) 
        {
            if(res > -1)  $scope.extractFeatures((res>0 ? true : false));
        });        
    };        

    $scope.extractFeatures = function(overwrite) 
    {  
        window.addEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.addEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
        window.addEventListener('pluginError'       , $scope.onMFCCError);
//
//        $scope.relpath  = "AllSpeakVoiceRecorder/audiofiles/allcontrols/allcontrols";  // debug code to calc cepstra in a huge folder
//        $scope.nFiles   = 2385;
//
//        $scope.relpath  = "AllSpeakVoiceRecorder/audiofiles/allpatients/allpatients";  // debug code to calc cepstra in a huge folder
//        $scope.nFiles   = 1857;
//
//        $scope.relpath  = "AllSpeakVoiceRecorder/audiofiles/newpatients/newpatients";  // debug code to calc cepstra in a huge folder
//        $scope.nFiles   = 907;

        if(MfccSrv.getMFCCFromFolder(   $scope.relpath, 
                                        $scope.mfccCfg.nDataType,
                                        $scope.plugin_enum.MFCC_DATADEST_FILE,
                                        overwrite))          // does not overwrite existing (and valid) mfcc files
        {
            cordova.plugin.pDialog.init({
                theme : 'HOLO_DARK',
                progressStyle : 'HORIZONTAL',
                cancelable : true,
                title : 'Please Wait...',
                message : 'Extracting CEPSTRA filters from folder \'s files...',
                max : $scope.nFiles
            });
            cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
        }
    };
    
    // manage pluginevents
    $scope.onMFCCProgressFolder = function(res){
        $scope.resetExtractFeatures();
        console.log(res);        
    }
    
    $scope.onMFCCProgressFile = function(res){
        $scope.nCurFile++;
        if($scope.nCurFile < $scope.nFiles) cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
        else                                $scope.onExtractFeaturesEnd();
        
        console.log("ShowRecordingSessionCtrl::onMFCCProgressFile : " + res);
    };
    
    // if submitting => it calls $scope.zipSession();
    $scope.onExtractFeaturesEnd = function()
    {
        $scope.resetExtractFeatures();
        if($scope.isSubmitting) $scope.zipSession();
    };
    
    $scope.resetExtractFeatures = function()
    {
        cordova.plugin.pDialog.dismiss();
        window.removeEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.removeEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
        window.removeEventListener('pluginerror'       , $scope.onMFCCError);  
    };
    
    $scope.onMFCCError = function(res){
        console.log("ShowRecordingSessionCtrl::onMFCCProgressFile : " + res);
    }

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
    
    $scope._calcPerc = function(cur, total)
    {
        return Math.round((cur/total)*100);
    };
    
    $scope._showAlert = function(title, message) {
        var alertPopup = $ionicPopup.alert({
            title: title,
            template: message
        });
    };
    //==============================================================================================================================
};
controllers_module.controller('ShowRecordingSessionCtrl', ShowRecordingSessionCtrl)
