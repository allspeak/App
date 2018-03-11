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
function ManageTrainingCtrl($scope, $q, $ionicPopup, $state, $ionicPlatform, $ionicModal, InitAppSrv, VocabularySrv, RuntimeStatusSrv, MfccSrv, TfSrv, RemoteAPISrv, ClockSrv, FileSystemSrv, UITextsSrv, ErrorSrv)
{
    // input params
    $scope.foldername           = "";       // "gigi"
    $scope.sessionPath          = "";       // training_XXXXYYZZ
    $scope.backState            = "";       // 
    //--------------------------------------------------------------------------
    // features & NET params
    $scope.initMfccParams       = {};
    $scope.initTfParams         = {};
    $scope.mfccCfg              = null;
    $scope.tfCfg                = null;
    $scope.nFiles               = 0;    // count number of audio within the session
    $scope.nCurFile             = 0;    // indicates the number of the currently processed file
        
    $scope.doOverwriteFeatures  = true;
    //--------------------------------------------------------------------------
    // loaded vocabulary
    $scope.vocabulary           = null;
    $scope.vocabulary_relpath   = "";   // AllSpeak/vocabularies/gigi
    $scope.training_relpath     = "";   // AllSpeak/training_sessions/gigi
    
    $scope.vocabulary_status    = null;
                                        //    haveValidTrainingSession  // according to the selected modelType, indicates if we have enough recordings
                                        //    haveFeatures              // indicates if the present recordings have their cepstra
                                        //    haveZip                   // indicates if the zip file is ready to be sent
                                        //    isNetAvailableRemote      // net calculated. available online
                                        //    isNetAvailableLocale      // net calculated. download, available locally
                                        //    isNetLoaded               // net loaded

    $scope.training_json_path   = "";   // $scope.training_relpath + "/" + $scope.training_json;
    $scope.vocabulary_json_path = "";   // $scope.vocabulary_relpath + "/vocabulary.json";
    $scope.session_zip          = "";   // $scope.training_relpath + "/" + "data.zip"

    //--------------------------------------------------------------------------
    // constants
    $scope.training_json            = "training.json";
    $scope.labelResumeTrainSession  = "REGISTRA RIPETIZIONI"
    $scope.labelSubmit              = "ADDESTRA"    
    $scope.pageTitle                = "Addestramento Vocabolario Comandi";
    
    //--------------------------------------------------------------------------
    // gui elements (select modeltype, audioproc)
    $scope.aProcScheme              = [];
    $scope.aNetType                 = [];        

    $scope.selectedProcScheme       = 0;
    $scope.selectedNetType          = 0;    
    
    //--------------------------------------------------------------------------
    // accessory
    $scope.pluginInterface      = null;        
    $scope.plugin_enum          = null;
    
    //--------------------------------------------------------------------------
    // session params    
    $scope.initSessionVariables = function()
    {
        $scope.temp_sess_voc        = null;         // voc object of the ongoing session submit process
        $scope.timerID              = -1;           // ID of the clock (used to periodically check remote training completion
        $scope.session_id           = 0;            // filled by onSubmitSuccess. id to be used to retrieve the net
        $scope.isSubmitting         = false;        // net calculation process initiated

        $scope.isCalcFeatures       = false;
        $scope.isUploading          = false;
        $scope.isTraining           = false;        // indicates if the server is training the net
        $scope.isChecking           = false;        // true when checking net availability    
        $scope.isDownloading        = false;

        $scope.percFiles            = 0;
        $scope.percUpload           = 0;
        $scope.percDownload         = 0;    
    }
    $scope.initSessionVariables();
    $scope.modalSubmitSession       = null;         // $ionicModal ref 
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

        $scope.backState = "";
        if(data.stateParams.backState != null) $scope.backState = data.stateParams.backState;

        $scope.pluginInterface          = InitAppSrv.getPlugin();        
        $scope.plugin_enum              = $scope.pluginInterface.ENUM.PLUGIN;
        
        //------------------------------------------------------------------------------------------
        // MFCC
        $scope.initMfccParams           = { "nDataDest": $scope.plugin_enum.MFCC_DATADEST_FILE,
                                            "nDataType": $scope.plugin_enum.MFCC_DATATYPE_MFFILTERS,  //write FILTERS to FILE        
                                            "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S_CTX};  //    
        $scope.mfccCfg                  = MfccSrv.getUpdatedCfgCopy($scope.initMfccParams);
        
        //------------------------------------------------------------------------------------------
        // TF
        $scope.initTfParams             = { "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S_CTX,
                                            "nModelType":$scope.plugin_enum.TF_MODELTYPE_USER_FT};
        $scope.tfCfg                    = TfSrv.getUpdatedStandardCfgCopy($scope.initTfParams);  
        
        $scope.aProcScheme              = TfSrv.getPreProcTypes();
        $scope.aNetType                 = TfSrv.getNetTypes();        
        
        $scope.training_relpath         = InitAppSrv.getAudioFolder() + "/" + $scope.foldername;
        $scope.training_relpath         = ($scope.sessionPath.length    ?  $scope.training_relpath + "/" + $scope.sessionPath    :  $scope.training_relpath);   //    AllSpeak/training_sessions  /  standard  /  training_XXFDFD
        
        $scope.vocabulary_relpath       = InitAppSrv.getVocabulariesFolder() + "/" + $scope.foldername;
        
        $scope.training_json_path       = $scope.training_relpath + "/" + $scope.training_json;
        $scope.vocabulary_json_path     = $scope.vocabulary_relpath + "/" + UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;
        $scope.session_zip              = $scope.training_relpath + "/" + "data.zip";
        
        $scope.refresh();
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });     

    $scope.refresh = function()
    {
        return VocabularySrv.getUpdatedStatusName($scope.foldername)
        .then(function(status)
        {
            $scope.vocabulary           = status.vocabulary;
            $scope.vocabulary_status    = status.vocabulary.status;
            
            $scope.updateProcScheme($scope.selectObjByValue($scope.plugin_enum.MFCC_PROCSCHEME_F_S_CTX, $scope.aProcScheme));
            $scope.updateModelType($scope.selectObjByValue($scope.plugin_enum.TF_MODELTYPE_USER_FT, $scope.aNetType));
        
            $scope.$apply();
        })
        .catch(function(error)
        {
            alert("_ManageTrainingCtrl::$ionicView.enter => " + error.message);
        });        
    };
 
    //==============================================================================================================================
    // GUI ELEMENTS
    //==============================================================================================================================
    // go back to vocabulary
    $scope.cancel = function()
    {
        $state.go('vocabulary', {"foldername":$scope.foldername});
    };      
    
    $scope.updateModelType = function(selNT)
    {
        $scope.selectedNetType              = selNT;
        $scope.tfCfg.nModelType             = parseInt($scope.selectedNetType.value);
        
        if($scope.tfCfg.nModelType == $scope.plugin_enum.TF_MODELTYPE_USER_READAPTED)
            $scope.vocabulary_status.haveValidTrainingSession = true;
        else
        {
            // TODO : check if the recorded set allows creating a USER_ONLY net 
            return VocabularySrv.existCompleteRecordedTrainSession($scope.training_relpath, $scope.vocabulary)
            .then(function(isvalid)
            {
                $scope.vocabulary_status.haveValidTrainingSession = isvalid;
                $scope.$apply();
            })
        }
    };
    
    $scope.updateProcScheme = function(selPS)
    {
        $scope.selectedProcScheme           = selPS;
        $scope.mfccCfg.nProcessingScheme    = parseInt($scope.selectedProcScheme.value);
        $scope.tfCfg.nProcessingScheme      = parseInt($scope.selectedProcScheme.value);
    }; 

    //==============================================================================================================================
    // PREPARE SESSION UPLOAD
    //==============================================================================================================================
    $scope.startNewSession = function() 
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'Stai per inviare le tue registrazioni al server per addestrare nuovamente la tua applicazione.\nVuoi proseguire?'})
        .then(function(res) 
        {
            if (res)
            {
                $ionicModal.fromTemplateUrl('templates/modal/popupSubmitSession.html', 
                {
                    scope: $scope,
                    animation: 'slide-in-up',
                    backdropClickToClose: false      
                })
                .then(function(modal) 
                {
                    $scope.modalSubmitSession = modal; 
                    $scope.modalSubmitSession.show();
                    $scope.isSubmitting = true;
                    return $scope.deleteSessionFile()                 
                })
                .then(function(){
                    return $scope.refresh();
                })
                .then(function(){
                    $scope.vocabulary_status.isNetAvailableLocale    = false;
                    return $scope.createSubmitSessionJson($scope.training_json_path)
                })
                .then(function(){
                    $scope.extractFeatures($scope.doOverwriteFeatures);  
                })
                .catch(function(error)
                {
                    alert("ShowRecSess::submitSession : " + error.message);
                    $scope.isSubmitting = false;
                    $scope.modalSubmitSession.hide();
                });
            }
        });        
    };

    $scope.closeModalSubmit = function()
    {
        $scope.initSessionVariables();
        RemoteAPISrv.cancelTransfer();
        $scope.modalSubmitSession.hide();

        $state.go('vocabulary', {"foldername":$scope.foldername});
    };
    
    // deletes files: training.json, data.zip, all the cestra.
    // deletes variables: 
    $scope.deleteSessionFile = function(jsonpath) 
    {
        return FileSystemSrv.deleteFile($scope.training_json_path)
        .then(function()
        {
            return FileSystemSrv.deleteFile($scope.session_zip);
        })
        .then(function()
        {
            return FileSystemSrv.deleteFilesInFolder($scope.training_relpath, ["dat"]);
        })
        .then(function()
        {
            
        });        
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
        
        return FileSystemSrv.countFilesInDir($scope.training_relpath, ["wav"])
        .then(function(cnt)
        {
            $scope.nFiles           = cnt;
            $scope.nCurFile         = 0;
            $scope.isCalcFeatures   = true;
            $scope.percFiles        = 0;
            
            MfccSrv.getMFCCFromFolder($scope.training_relpath, 
                                      $scope.mfccCfg.nDataType,
                                      $scope.plugin_enum.MFCC_DATADEST_FILE,
                                      $scope.mfccCfg.nProcessingScheme,
                                      overwrite);  // does not overwrite existing (and valid) mfcc files
            $scope.percFiles = 0;
            $scope.$apply(); 
        });
    };
    
    // manage pluginevents
    $scope.onMFCCProgressFolder = function(res)
    {
        $scope.resetExtractFeatures();
        console.log(res);        
    };
    
    // onFile processed
    $scope.onMFCCProgressFile = function(res)
    {
        $scope.nCurFile++;
        if($scope.nCurFile < $scope.nFiles)
        {
//            cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
            $scope.percFiles = Math.round(($scope.nCurFile/$scope.nFiles)*100)
            console.log("Feature file processed : " + $scope.nCurFile.toString());
            $scope.$apply();
        }
        else    $scope.onExtractFeaturesEnd();
        
        console.log("_ManageTrainingCtrl::onMFCCProgressFile : " + res);
    };
    
    // if submitting => it calls $scope.zipSession();
    $scope.onExtractFeaturesEnd = function()
    {
        $scope.resetExtractFeatures();
        $scope.vocabulary_status.haveFeatures   = [];
        $scope.isCalcFeatures                   = false;
        $scope.$apply();
        if($scope.isSubmitting) $scope.zipSession();
    };
    
    $scope.resetExtractFeatures = function()
    {
        window.removeEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.removeEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
        window.removeEventListener('pluginerror'       , $scope.onMFCCError);  
    };
    
    $scope.onMFCCError = function(error)
    {
        console.log("_ManageTrainingCtrl::onMFCCError : " + error);
        $scope.vocabulary_status.haveFeatures = false;
        $scope.modalSubmitSession.hide();
        $scope.$apply();        
    };
   
    //==============================================================================================================================
    // PREPARE DATA & ZIP SESSION
    //==============================================================================================================================     
    // called by startNewSession
    $scope.createSubmitSessionJson = function(jsonpath) 
    {
        var ids = VocabularySrv.getTrainVocabularyIDLabels($scope.vocabulary);
        return TfSrv.createSubmitDataJSON($scope.foldername, $scope.foldername, ids, $scope.mfccCfg.nProcessingScheme, $scope.tfCfg.nModelType, jsonpath);
    };
    
    // called by $scope.onExtractFeaturesEnd whether isSubmitting
    $scope.zipSession = function() 
    {
        window.addEventListener('traindataready', $scope.onZipFolder);
        window.addEventListener('pluginError'   , $scope.onPluginError);        
        $scope.pluginInterface.zipFolder($scope.training_relpath, $scope.session_zip, ["dat", "json"]);
        console.log("start zipping");        
    };

    // called by plugin whether isSubmitting
    $scope.onZipFolder = function()
    {
        console.log("zip created");
        $scope.vocabulary_status.haveZip = true;
        window.removeEventListener('traindataready', $scope.onZipFolder);
        window.removeEventListener('pluginerror'   , $scope.onPluginError);       
        $scope.$apply();
        if($scope.isSubmitting) $scope.upLoadSession();
    };
    
    //==============================================================================================================================
    // UPLOAD SESSION
    //==============================================================================================================================      
    $scope.upLoadSession = function() 
    {
        RemoteAPISrv.uploadTrainingData($scope.foldername, $scope.session_zip, $scope.onSubmitSuccess, $scope.onSubmitError, $scope.onSubmitProgress);
        $scope.isUploading          = true;
    };
    
    $scope.onSubmitSuccess = function(sess_id) 
    {
        $scope.session_id   = sess_id;
        $scope.isUploading  = false;        
        $scope.isTraining   = true;
        //alert("data uploaded");
//        $scope.$apply();
        $scope.timerID = ClockSrv.addClock($scope.checkSession, 10000);
    };
    
    $scope.onSubmitError = function(error) 
    {
        $scope.session_id = 0;
        $scope.isUploading = false;           
        alert("ERROR while uploading data : " + error.message);
        $scope.modalSubmitSession.hide();
//        $scope.$apply();
    };
    
    $scope.onSubmitProgress = function(progress)
    {
        console.log(progress.label + " " + progress.perc + " %");
        $scope.percUpload = progress.perc;
        $scope.$apply();
    };

    $scope.onPluginError = function(error)  // {message: error.message, type:error.type}
    {
        alert("_ManageTrainingCtrl :" + error.message);
    };
    
    //==============================================================================================================================
    // ASK FOR & DOWNLOAD SESSION
    //==============================================================================================================================    
    // called by the timer  : [no params]       => it asks whether download it or not
    // called by button     : [boolean (ask)]   => ask=true     it asks whether downloading 
    //                                             ask=false    only returns true | false
    $scope.checkSession = function(ask) 
    {
        var doask = (ask == null ? true : ask)        
        $scope.isChecking                               = true;
        $scope.vocabulary_status.isNetAvailableRemote   = false
        return RemoteAPISrv.isNetAvailable($scope.session_id)
        .then(function(train_obj)
        {
            $scope.isChecking       = false;
            if(train_obj)
            {
                // ready 2 download
                $scope.temp_sess_voc = TfSrv.fixTfModel(train_obj);  // remove status + add sModelFilePath & nDataDest
                $scope.vocabulary_status.isNetAvailableRemote   = true;
                ClockSrv.removeClock($scope.timerID);       // stop checking
                
                if(doask)
                {
                    // ask if download
                    return $ionicPopup.confirm({ title: 'Attenzione', template: 'Il vocabolario è stato addestrato. Vuoi scaricarlo ora?\nIn caso contrario, potrai farlo in seguito'})
                    .then(function(res) 
                    {
                        if(res) $scope.getNet();
                        return true;
                    });   
                }
                else    return true;
            }
            else return false;
        })
        .catch(function(error)
        {     
            alert("ERROR in ManageTrainingCtrl::checkSession " + error.message);
            console.log("ERROR in ManageTrainingCtrl::checkSession " + error.message);
        });
    };
    
    $scope.getNet = function()
    {   
        $scope.isDownloading = true;
        RemoteAPISrv.getNet($scope.vocabulary_relpath, $scope.onDownloadSuccess, $scope.onDownloadError, $scope.onDownloadProgress);
    };
    
    // network downloaded:
    // - set flags
    // - create vocabulary.json
    // - ask if activate=>"recognition" or =>"vocabulary" 
    $scope.onDownloadSuccess = function(sess_id) 
    {
        $scope.vocabulary_status.isNetAvailableLocale   = true;
        $scope.isSubmitting                             = false;
        $scope.isDownloading                            = false;
        console.log("network downloaded");
        
        // I test the new NET
        return TfSrv.testNewTFModel($scope.temp_sess_voc)   // return string or reject
        .then(function()
        {        
            return FileSystemSrv.createJSONFileFromObj($scope.vocabulary_json_path, $scope.temp_sess_voc, 2)    // return 1 or reject
        })
        .then(function()
        {
            $scope.modalSubmitSession.hide();
            return $ionicPopup.confirm({ title: 'Attenzione', template: 'Hai correttamente scaricato la rete, vuoi attivarla e passare al riconoscimento?'})
            .then(function(r)
            {
                if(r)
                {
                    // force loadVocabulary (I may retraining the same active voc, without the force, loadVocabulary could exit immediately)
                    return RuntimeStatusSrv.loadVocabulary($scope.foldername, true)
                    .then(function()
                    {
                        $state.go("recognition", {foldername:$scope.foldername});   // vado a riconoscimento
                    })
                }
                else    $state.go('vocabulary', {"foldername":$scope.foldername});
            })
        })
        .catch(function(error)
        {   
            if(error.mycode)
            {
                switch(error.mycode)
                {
                    case ErrorSrv.ENUMS.VOCABULARY.MODELFILE_NOTEXIST:
                    case ErrorSrv.ENUMS.VOCABULARY.MODELFILEVARIABLE_EMPTY:
                        // #ERROR_RESET#
                        break;
                    case ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL:
                        // the new net is invalid !  #ERROR_CRASH#
//                        return $ionicPopup.confirm({ title: 'Attenzione', template: 'La rete che hai scaricato non funziona. Prova e ripetere il procedimento'})
                        
                        break;
                }
            }
            console.log("ManageTrainingCtrl::onDownloadSuccess :" + error.message);
            $scope.modalSubmitSession.hide();
            $state.go('vocabulary', {"foldername":$scope.foldername});
        });
    };
    
    $scope.onDownloadError = function(error) 
    {
        $scope.vocabulary_status.isNetAvailableLocale    = false;
        alert("ERROR while downloading data : " + error.message);
        $scope.modalSubmitSession.hide();        
//        $scope.$apply();
    };
    
    $scope.onDownloadProgress = function(progress) 
    {
        $scope.percDownload = progress.perc;        
        console.log(progress.label);
//        $scope.$apply();
   };

    //==============================================================================================================================
    // ACCESSORY
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
