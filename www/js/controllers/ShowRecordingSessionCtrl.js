/* 
 *  Show subject info and list sentences with at least one recording ....allows deleting the subject and record a new/existing sentence
 *  
    "subjects":
    [
        { "label": "Mario Rossi", "id": 1, "age": 91, "description: "abcdefghil", "vocabulary": [
            { "title": "Ho sete", "id": 1, "label": "ho_sete", "filename": "ho_sete.wav", "existwav": 0 },
            { "title": "Chiudi la porta", "id": 2, "label": "chiudi_porta", "filename" : "chiudi_porta.wav", "existwav": 0}
        ]},
        ........
    ]
 */
function ShowRecordingSessionCtrl($scope, $q, $ionicPopup, $state, $ionicPlatform, InitAppSrv, VocabularySrv, FileSystemSrv, MfccSrv, TfSrv, SubjectsSrv, RemoteAPISrv, EnumsSrv)
{
    $scope.subject              = null;     // stay null in AllSpeak
    $scope.trainingPath         = "";       // standard
    $scope.sessionPath          = "";       // training_XXXXYYZZ

    $scope.labelResumeRecording = "REGISTRA RIPETIZIONI"
    $scope.labelSubmit          = "ADDESTRA"

    $scope.isSubmitting         = false;
    $scope.nFiles               = 0;    // count number of audio within the session
    $scope.nCurFile             = 0;    // indicates the number of the currently processed file
    
    $scope.minNumRepetitions    = EnumsSrv.RECORD.SESSION_MIN_REPETITIONS;
    $scope.maxNumRepetitions    = EnumsSrv.RECORD.SESSION_MAX_REPETITIONS;
    //==============================================================================================================================
    // ENTER & REFRESH
    //==============================================================================================================================    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("training");
        }, 100);         
        
        //------------------------------------------------------------------------------------------
        $scope.pluginInterface      = InitAppSrv.getPlugin();        
        $scope.plugin_enum          = $scope.pluginInterface.ENUM.PLUGIN;
        
        $scope.initMfccParams       = {"nDataDest": $scope.plugin_enum.MFCC_DATADEST_FILE,
                                       "nDataType": $scope.plugin_enum.MFCC_DATATYPE_MFFILTERS,  //write FILTERS to FILE        
                                       "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S_PP_CTX};  //    
        $scope.nFiles               = 0;
        $scope.mfccCfg              = MfccSrv.getUpdatedCfg($scope.initMfccParams);
        
        $scope.tfCfg                = TfSrv.getCfg();
        
        // standard
        if(data.stateParams.trainingPath == null) 
        {
            alert("ShowRecordingSessionCtrl::$ionicView.enter. error : trainingPath is empty");
            $state.go("training");
        }   
        else $scope.trainingPath = data.stateParams.trainingPath;
        
        // training_XXXXYYZZ
        if(data.stateParams.sessionPath == null) 
        {
            alert("ShowRecordingSessionCtrl::$ionicView.enter. error : sessionPath is empty");
            $state.go("training");
        }   
        else $scope.sessionPath = data.stateParams.sessionPath;

        $scope.subject         = null;
        if(data.stateParams.subjId != null && data.stateParams.subjId != "")
        {
            // we are in AllSpeakVoiceRecorder 
            $scope.subject_id   = parseInt(data.stateParams.subjId);
            $scope.subject      = SubjectsSrv.getSubject($scope.subject_id);
            $scope.trainingPath = $scope.subject.folder;
        }
        $scope.relpath          = InitAppSrv.getAudioFolder() + "/" + $scope.trainingPath + "/" + $scope.sessionPath;   //    AllSpeak/training_sessions  /  standard  /  training_XXFDFD
        
        VocabularySrv.getTrainVocabulary()
        .then(function(vocabulary)
        {
            $scope.vocabulary = vocabulary.vocabulary;
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
            return SubjectsSrv.getSubjectVocabularyFiles($scope.vocabulary, $scope.relpath)
            .then(function(session_vocabulary)
            {
                $scope.subject.vocabulary   = session_vocabulary;
                $scope.nFiles               = $scope._getFilesNum(session_vocabulary);
                $scope.$apply();
            })        
            .catch(function(error){
                $scope._showAlert("Error", "ShowRecordingSessionCtrl::refreshAudioList => " + error.message);
            });                
        }
        else
        {
            return VocabularySrv.getTrainVocabularyFiles($scope.relpath)
            .then(function(session_vocabulary)
            {
                $scope.vocabulary   = session_vocabulary;
                $scope.nFiles       = $scope._getFilesNum(session_vocabulary);
                $scope.$apply();
            })        
            .catch(function(error){
                $scope._showAlert("Error", "ShowRecordingSessionCtrl::refreshAudioList => " + error.message);
            });
        }
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
    // MANAGE SESSION
    //==============================================================================================================================
    $scope.deleteSession = function() 
    {
        $ionicPopup.confirm({ title: 'Warning', template: 'You are deleting the current subject recording SESSION, are you sure ?'}).then(function(res) 
        {
            if (res){
                FileSystemSrv.deleteDir($scope.relpath)
                .then(function()
                {
                    if($scope.subject)  $state.go("subject", {subjId:$scope.subject.id});       
                    else                $state.go("training");    
                })
                .catch(function(error){
                    alert(error.message);
                });
            }
        });        
    };

    $scope.completeSession = function(nrep, session_folder) 
    {
        
    };

    $scope.askNumRepetition = function() 
    {
        $scope.data = {"nRepetitions" : $scope.minNumRepetitions};
 
        // An elaborate, custom popup
        var myPopup = $ionicPopup.show(
        {
            template: '<input type="number" ng-model="data.nRepetitions">',
            title: 'Completa la sessione',
            subTitle: 'Seleziona il numero di ripetizioni da registrare.\nDevo essere almeno 5',
            scope: $scope,
            buttons: [
                        {   text: 'Cancella' },
                        {
                            text: '<b>avvia</b>',
                            type: 'button-positive',
                            onTap: function(e) 
                            {
                                if ($scope.data.nRepetitions < $scope.minNumRepetitions) 
                                {
                                    alert("Il numero di ripetizioni deve essere maggiore di " + $scope.minNumRepetitions.toString());
                                    e.preventDefault();
                                } 
                                else if ($scope.data.nRepetitions > $scope.maxNumRepetitions) 
                                {
                                    alert("E' consigliabile che il numero di ripetizioni sia minore di " + $scope.maxNumRepetitions.toString());
                                    e.preventDefault();                                
                                } else  return $scope.data.nRepetitions;
                            }
                        }
                    ]
        });
 
        myPopup.then(function(nrep) 
        {
            $scope.completeSession(nrep, $scope.relpath);
        });
    };

    $scope.submitSession = function() 
    {
        $scope.upLoadSession();
//        $ionicPopup.confirm({ title: 'Warning', template: 'You are submitting the current recording SESSION, are you sure ?'}).then(function(res) 
//        {
//            if (res)
//            {
//                $scope.isSubmitting = true;
//                return $scope.createSessionJson($scope.relpath + "/" + "training.json")
//                .then(function(){
//                    $scope.extractFeatures(false);  
//                })
//                .catch(function(error){
//                    alert("ShowRecSess::submitSession : " + error.message);
//                    $scope.isSubmitting = false;
//                });
//            }
//        });        
    };
    
    $scope.createSessionJson = function(jsonpath) 
    {
        var ids = VocabularySrv.getTrainVocabularyIDLabels();
        
        var train_obj = {};
        train_obj.sLabel              = "default";
        train_obj.vocabulary          = ids;
        train_obj.nProcessingScheme   = $scope.mfccCfg.nProcessingScheme;
        train_obj.nModelType          = $scope.tfCfg.nModelType;        
        
        return TfSrv.createTrainingDataJSON(train_obj, jsonpath)
        .then(function(){
            return $scope.zipSession();  
        })   
        .catch(function(error)
        {
            FileSystemSrv.deleteFile(jsonpath);
            return $q.reject(error);
        });       
    };
    
    $scope.zipSession = function() 
    {
        window.addEventListener('traindataready', $scope.onZipFolder);
        window.addEventListener('pluginError'   , $scope.onPluginError);        
        $scope.pluginInterface.zipFolder($scope.relpath, $scope.relpath + "/" + "data.zip", ["dat", "json"]);
    };
    
    $scope.onPluginError = function(error)  // {message: error.message, type:error.type}
    {
        alert("ShowRecordingSessionCtrl :" + error.message);
    };
    
    $scope.onZipFolder = function()
    {
        window.removeEventListener('traindataready', $scope.onZipFolder);
        window.removeEventListener('pluginerror'   , $scope.onPluginError);         
    };
    
    $scope.upLoadSession = function() 
    {
        RemoteAPISrv.uploadZip($scope.relpath + "/" + "data_1234.zip", $scope.onSubmitSuccess, $scope.onSubmitError, $scope.onSubmitProgress);
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
        
    //==============================================================================================================================
    // PRIVATE
    //==============================================================================================================================
    $scope._getFilesNum = function(vocabulary)
    {
        var cnt = 0;
        for(var f=0; f<vocabulary.length; f++)
            if(vocabulary[f].existwav)
                cnt = cnt + vocabulary[f].files.length;
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
