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
function ManageTrainingCtrl($scope, $q, $ionicPopup, $state, $ionicPlatform, InitAppSrv, RuntimeStatusSrv, VocabularySrv, MfccSrv, TfSrv, RemoteAPISrv, ClockSrv, EnumsSrv)
{
    $scope.foldername           = "";       // standard
    $scope.sessionPath          = "";       // training_XXXXYYZZ

    $scope.pluginInterface      = null;        
    $scope.plugin_enum          = null;
        
    $scope.initMfccParams       = {};
    $scope.initTfParams         = {};
    
    $scope.mfccCfg              = null;
    $scope.tfCfg                = null;
    
    $scope.timerID              = -1;
    $scope.isSubmitting         = false;        // net calculation process initiated
    $scope.isChecking           = false;        // true when checking net availability
    
    $scope.vocabulary_status    = null;
    
//    $scope.haveValidTrainingSession  = false;        // according to the selected modelType, indicates if we have enough recordings
//    $scope.haveFeatures         = false;        // indicates if the present recordings have their cepstra
//    $scope.haveZip              = false;        // indicates if the zip file is ready to be sent
//    $scope.isTraining           = false;        // indicates if the server is training the net
//    $scope.isNetAvailableRemote = false;        // net calculated. available online
//    $scope.isNetAvailableLocale = false;        // net calculated. download, available locally
//    $scope.isNetLoaded          = false;        // net loaded
    
    
    // cepstra calculation
    $scope.nFiles               = 0;    // count number of audio within the session
    $scope.nCurFile             = 0;    // indicates the number of the currently processed file
    
    $scope.minNumRepetitions    = EnumsSrv.RECORD.SESSION_MIN_REPETITIONS;
    $scope.maxNumRepetitions    = EnumsSrv.RECORD.SESSION_MAX_REPETITIONS;


    $scope.training_json        = "training.json";
    $scope.labelResumeTrainSession  = "REGISTRA RIPETIZIONI"
    $scope.labelSubmit              = "ADDESTRA"    
    $scope.pageTitle            = "Addestramento Vocabolario Comandi";
    
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
            alert("_ManageTrainingCtrl::$ionicView.enter. error : foldername is empty");
            $state.go("vocabularies");
        }   
        else $scope.foldername = data.stateParams.foldername;
        
        // training_XXXXYYZZ
        if(data.stateParams.sessionPath == null) 
        {
            alert("_ManageTrainingCtrl::$ionicView.enter. error : sessionPath is empty");
            $state.go("vocabularies");
        }   
        else $scope.sessionPath = data.stateParams.sessionPath;  

        $scope.pluginInterface          = InitAppSrv.getPlugin();        
        $scope.plugin_enum              = $scope.pluginInterface.ENUM.PLUGIN;
        
        //------------------------------------------------------------------------------------------
        // MFCC
        $scope.initMfccParams           = { "nDataDest": $scope.plugin_enum.MFCC_DATADEST_FILE,
                                            "nDataType": $scope.plugin_enum.MFCC_DATATYPE_MFFILTERS,  //write FILTERS to FILE        
                                            "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S_CTX};  //    
        $scope.mfccCfg                  = MfccSrv.getUpdatedCfg($scope.initMfccParams);
        
        //------------------------------------------------------------------------------------------
        // TF
        $scope.initTfParams           = { "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S_CTX};  //           
        $scope.tfCfg                    = TfSrv.getUpdatedCfg($scope.initTfParams);  
        
        $scope.aProcScheme              = TfSrv.getPreProcTypes();
        $scope.aNetType                 = TfSrv.getNetTypes();        
        
        $scope.selectedProcScheme       = $scope.selectObjByValue($scope.tfCfg.nProcessingScheme, $scope.aProcScheme);
        $scope.selectedNetType          = $scope.selectObjByValue($scope.tfCfg.nModelType, $scope.aNetType);

        $scope.relpath              = InitAppSrv.getAudioFolder() + "/" + $scope.foldername
        $scope.relpath              = ($scope.sessionPath.length    ?  $scope.relpath + "/" + $scope.sessionPath    :  $scope.relpath);   //    AllSpeak/training_sessions  /  standard  /  training_XXFDFD
        
        $scope.vocabulary_json_path = InitAppSrv.getVocabulariesFolder() + "/" + $scope.foldername + "/vocabulary.json";
        $scope.successState         = "manage_training";
        $scope.cancelState          = "manage_training";
        
        RuntimeStatusSrv.loadVocabulary($scope.foldername)
        .then(function(status)
        {
            $scope.vocabulary_status    = status;
            $scope.vocabulary           = status.vocabulary;
//            $scope.isNetAvailableLocale     = status.modelExist;
//            $scope.haveValidTrainingSession = true;//status.haveValidTrainingSession;
            $scope.$apply();
        })
        .catch(function(error)
        {
            alert("_ManageTrainingCtrl::$ionicView.enter => " + error.message);
        });
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });     

    //==============================================================================================================================
    $scope.updateModelType = function(selNT)
    {
        $scope.selectedNetType              = selNT;
        $scope.tfCfg.nModelType             = parseInt($scope.selectedNetType.value);
        
        // TODO : check if the recorded set allows creating a USER_ONLY net 
    };
    
    $scope.updateProcScheme = function(selPS)
    {
        $scope.selectedProcScheme           = selPS;
        $scope.mfccCfg.nProcessingScheme    = parseInt($scope.selectedProcScheme.value);
        $scope.tfCfg.nProcessingScheme      = parseInt($scope.selectedProcScheme.value);
    }; 

    //==============================================================================================================================
    // USE NET
    //==============================================================================================================================
    $scope.loadNet = function() 
    {
        TfSrv.loadTFModel();
    };
    
    //==============================================================================================================================
    // SUBMIT SESSION
    //==============================================================================================================================
    $scope.submitSession = function() 
    {
//        $scope.upLoadSession(); // for debug
        $ionicPopup.confirm({ title: 'Attenzione', template: 'Stai per inviare le tue registrazioni al server per ottenere la tua nuova rete neurale\nVuoi proseguire?'})
        .then(function(res) 
        {
            if (res)
            {
                $scope.isSubmitting = true;
                return $scope.createSubmitSessionJson($scope.relpath + "/" + $scope.training_json)
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
   
    $scope.createSubmitSessionJson = function(jsonpath) 
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
        RemoteAPISrv.uploadTrainingData($scope.foldername, $scope.relpath + "/" + "data.zip", $scope.onSubmitSuccess, $scope.onSubmitError, $scope.onSubmitProgress);
    };
    
    $scope.onSubmitSuccess = function(sess_id) 
    {
        $scope.session_id = sess_id;
        alert("data uploaded");
        $scope.$apply();
        $scope.timerID = ClockSrv.addClock();
    };
    
    $scope.onSubmitError = function(error) 
    {
        $scope.session_id = 0;
        alert("ERROR while uploading data : " + error.message);
        $scope.$apply();
    };
    
    $scope.onSubmitProgress = function(progress) 
    {
        console.log(progress.toString());
        $scope.$apply();
    };

    $scope.onPluginError = function(error)  // {message: error.message, type:error.type}
    {
        alert("_ManageTrainingCtrl :" + error.message);
    };
    
    //==============================================================================================================================
    // DOWNLOAD SESSION
    //==============================================================================================================================    
    // called by the timer
    $scope.checkSession = function() 
    {
        $scope.isChecking           = true;
        $scope.$apply();
        return RemoteAPISrv.isNetAvailable()
        .then(function(res)
        {
            $scope.isChecking       = false;
            if(res)
            {
                $scope.vocabulary_status.isNetAvailableRemote = true;
                ClockSrv.removeClock();
                // ready 2 download
                return $ionicPopup.confirm({ title: 'Attenzione', template: 'Il vocabolario è stato addestrato. Vuoi scaricarlo ora?\nIn caso contrario, potrai farlo in seguito'})
                .then(function(res) 
                {
                    $scope.$apply();                     
                    if(res)
                    {
                        RemoteAPISrv.getNet($scope.onDownloadSuccess, $scope.onDownloadError, $scope.onDownloadProgress)
                    }
                });                 
            }
            else $scope.$apply(); 
        })
        .catch(function(error)
        {       
            
        })
    }
    
    $scope.onDownloadSuccess = function(sess_id) 
    {
        $scope.vocabulary_status.isNetAvailableLocale    = true;
        $scope.isSubmitting     = false;
        alert("data uploaded");
        $scope.$apply();
    };
    
    $scope.onDownloadError = function(error) 
    {
        $scope.vocabulary_status.isNetAvailableLocale    = false;
        alert("ERROR while doloading data : " + error.message);
        $scope.$apply();
    };
    
    $scope.onDownloadProgress = function(progress) 
    {
        console.log(progress.toString());
        $scope.$apply();
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
                                        $scope.mfccCfg.nProcessingScheme,
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
        
        console.log("_ManageTrainingCtrl::onMFCCProgressFile : " + res);
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
        console.log("_ManageTrainingCtrl::onMFCCProgressFile : " + res);
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
    
    $scope._canSubmit = function(commands)
    {
        for(var f=0; f<commands.length; f++)
            if(commands[f].nrepetitions < $scope.minNumRepetitions)
                return false;
        return true;
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
    
    $scope.selectObjByValue = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].value == value)
               return objarray[i];
    };    
    
    $scope.selectObjByLabel = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].label == value)
               return objarray[i];
    };      
    //==============================================================================================================================
};
controllers_module.controller('ManageTrainingCtrl', ManageTrainingCtrl)
