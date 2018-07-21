/* TRAINING PROCESS SCHEME
 * 
 * create a temporary folder where it creates the features files, a vocabulary.json file and then a data.zip file.
 * send the zip to the server and start checking if remote train process is over.
 * when it's over, receives a json structure that saves as vocabulary_modeltype_procscheme.json 
 * then ask whether downloading the new net
 * when downloaded ask whether testing if is valid in the recognition page.
 * 
 * CHECK INCOMPLETE SESSIONS:
 * each time user enter this page AND/OR want to train a new net, the app checks whether a previous unconfirmed net is present.
 * if is present and not valid, it deletes the entire folder.
 * if is present and valid, asks whether confirming it, substituting a similar (== model type & preprocscheme), or delete it or cancel the new training.
 * 
 */
function ManageTrainingCtrl($scope, $q, $ionicPopup, $state, $ionicPlatform, $ionicModal, InitAppSrv, VocabularySrv, RuntimeStatusSrv, MfccSrv, TfSrv, RemoteAPISrv, ClockSrv, FileSystemSrv, UITextsSrv, ErrorSrv, StringSrv, MiscellaneousSrv)
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
    $scope.recordings_folder   = "";   // AllSpeak/recordings
    
    $scope.vocabulary_status    = null;
                                        //    haveValidTrainingSession  // according to the selected modelType, indicates if we have enough recordings
                                        //    haveFeatures              // indicates if the present recordings have their cepstra
                                        //    haveZip                   // indicates if the zip file is ready to be sent
                                        //    isNetAvailableRemote      // net calculated. available online
                                        //    isNetAvailableLocale      // net calculated. download, available locally
                                        //    isNetLoaded               // net loaded

    $scope.training_relpath             = "";       // AllSpeak/vocabularies/gigi/netA ...temporary session
    $scope.training_submitted_json_path = "";       // $scope.training_relpath + "/" + $scope.vocabulary_json_prefix + ".json";
    $scope.training_received_json_path  = "";       // $scope.training_relpath + "/" + $scope.final_net_json_prefix + "_" + nModelType + "_" + nProcessingScheme + "_" + nModelClass + ".json";
    $scope.final_vocabulary_json_path   = "";       // $scope.vocabulary_relpath + "/" + $scope.final_net_json_prefix + "_" + nModelType + "_" + nProcessingScheme + "_" + nModelClass + ".json";
    $scope.session_zip                  = "";       // $scope.training_relpath + "/" + "data.zip"

    $scope.temp_sess_voc        = null; // session temporary voc returned by server
    //--------------------------------------------------------------------------
    // constants
    $scope.vocabulary_json_prefix   = "vocabulary";
    $scope.final_net_json_prefix    = "net";
    $scope.labelResumeTrainSession  = "REGISTRA RIPETIZIONI"
    $scope.labelSubmit              = "ADDESTRA"    
    $scope.pageTitle                = "ADDESTRA COMANDI";
    
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
        $scope.sessionid            = "";            // filled by onSubmitSuccess. id to be used to retrieve the net
        $scope.init_sessionid       = "";            // id of the session to use as init net (e.g. a pure user net or a user re-adapted one)
        $scope.isSubmitting         = false;        // net calculation process initiated

        $scope.isCalcFeatures       = false;
        $scope.isUploading          = false;
        $scope.isTraining           = false;        // indicates if the server is training the net
        $scope.isChecking           = false;        // true when checking net availability    
        $scope.isDownloading        = false;

        $scope.percFiles            = 0;
        $scope.percUpload           = 0;
        $scope.percDownload         = 0;    
        
        $scope.vocabulary_status    = {};
        $scope.vocabulary_status.haveFeatures           = false;
        $scope.vocabulary_status.haveZip                = false;
        $scope.vocabulary_status.isNetAvailableRemote   = false;
        $scope.vocabulary_status.isNetAvailableLocale   = false;        
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
                                            "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S};  //    
        $scope.mfccCfg                  = MfccSrv.getUpdatedCfgCopy($scope.initMfccParams);
        
        //------------------------------------------------------------------------------------------
        // TF
        $scope.initTfParams             = { "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S,
                                            "nModelClass":$scope.plugin_enum.TF_MODELCLASS_FF,
                                            "nModelType":$scope.plugin_enum.TF_MODELTYPE_USER_FT};
                                        
        $scope.tfCfg                    = TfSrv.getUpdatedStandardCfgCopy($scope.initTfParams);  
        
        $scope.aProcScheme              = MfccSrv.getPreProcTypes();
        $scope.aNetType                 = TfSrv.getNetTypes();        

        $scope.vocabulary_relpath       = InitAppSrv.getVocabulariesFolder() + "/" + $scope.foldername;
        $scope.vocabulary_json_path     = $scope.vocabulary_relpath + "/" + UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;

        $scope.recordings_folder       = InitAppSrv.getAudioFolder();
        
        $ionicModal.fromTemplateUrl('templates/modal/popupSubmitSession.html', 
        {
            scope: $scope,
            animation: 'slide-in-up',
            backdropClickToClose: false,
            buttons: [
                        { text: 'Annulla', type: 'button-positive', onTap: function(e) { return false;}},
                        { text: 'Cambia', type: 'button-positive', onTap: function(e) { return true;}}
                     ]
        })
        .then(function(modal) 
        {
            $scope.modalSubmitSession = modal;         
            return $scope.refresh($scope.foldername);
        })
        .then(function()
        {
            return $scope.checkTempSessions();
        })
        .then(function()
        {
            return VocabularySrv.getExistingNets($scope.foldername);
        })
        .then(function(existing_net_sobj)
        {
            $scope.existingNets = existing_net_sobj;
        })     
        .catch(function(error)
        {     
            var title = "ERRORE: in ManageTrainingCtrl::checkSession"
            alert(error.message);
        });        
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });     

    $scope.refresh = function(folder)
    {
        return VocabularySrv.getUpdatedStatusName(folder)
        .then(function(voc)
        {
            $scope.vocabulary           = voc;
            $scope.vocabulary_status    = voc.status;
            
            $scope.updateProcScheme(MiscellaneousSrv.selectObjByValue($scope.plugin_enum.MFCC_PROCSCHEME_F_S, $scope.aProcScheme));
            $scope.updateModelType(MiscellaneousSrv.selectObjByValue($scope.plugin_enum.TF_MODELTYPE_USER, $scope.aNetType));
        
            $scope.$apply();
            return true;
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
        
        if($scope.tfCfg.nModelType == $scope.plugin_enum.TF_MODELTYPE_USER_READAPTED || $scope.tfCfg.nModelType == $scope.plugin_enum.TF_MODELTYPE_COMMON_READAPTED)
            $scope.vocabulary_status.haveValidTrainingSession = true;
        else
        {
            // TODO : check if the recorded set allows creating a USER_ONLY net 
            return VocabularySrv.existCompleteRecordedTrainSession($scope.recordings_folder, $scope.vocabulary)
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
    $scope.startNewSessionDebug = function(net_type) 
    {
        // DEBUG CODE (given folder contains data_274/275/276/277.zip files)
        $scope.training_relpath                 = $scope.vocabulary_relpath + "/" + "test_23032018_005341";    
        $scope.session_zip                      = $scope.training_relpath + "/" + "data_" + net_type.toString() + ".zip";      
        $scope.training_received_json_path      = $scope.training_relpath + "/" + $scope.final_net_json_prefix + "_" + net_type.toString() + "_" + $scope.tfCfg.nProcessingScheme.toString() + "_" + $scope.tfCfg.nModelClass.toString() + ".json";        
        $scope.final_vocabulary_json_path       = $scope.vocabulary_relpath + "/" + $scope.final_net_json_prefix + "_" + net_type.toString() + "_" + $scope.tfCfg.nProcessingScheme.toString() + "_" + $scope.tfCfg.nModelClass.toString() + ".json";
        $scope.vocabulary_status.haveZip        = true;
        $scope.vocabulary_status.haveFeatures   = [];
        $scope.isSubmitting                     = true;        
        $scope.modalSubmitSession.show();
        $scope.upLoadSession();
        return;        
    };
    
    $scope.startNewSession = function(net_type, isreplacing, initsessid) 
    {
        if(initsessid == null) initsessid = "";
        return (function(repl) 
               {
                    if(!repl) return Promise.resolve(true);
                    else
                    {
                        return $ionicPopup.confirm({title:"Attenzione", template:"Una rete uguale esiste gia" +
                                                   ".\Continuando, potrai prima provare la nuova rete, ma quando l\' accetterai " + 
                                                   "la vecchia versione ora presente verra eliminata.\nVuoi proseguire?"})
                        .then(function(res){ return res;})
                    }
               })(isreplacing)
        .then(function(goontraining)
        {
            if(goontraining == 0)   return false;       // user answered to NOT substitute the existing version !
            else                    return $scope.checkTempSessions()
        })
        .then(function(goontraining)
        {
            if(goontraining)
            {
                
                $scope.initSessionVariables();      // sessionid could be not empty
                $scope.tfCfg.nModelType             = net_type;    
                
                if(initsessid.length)   $scope.init_sessionid = initsessid;
                else                    $scope.init_sessionid = "";
        
                $ionicPopup.confirm({ title: 'Attenzione', template: 'Stai per inviare le tue registrazioni al server per addestrare nuovamente la tua applicazione.\nVuoi proseguire?'})
                .then(function(res) 
                {
                    if (res)
                    {
                        $scope.modalSubmitSession.show();
                        $scope.isSubmitting = true;

                        $scope.temp_session_name            = "train_" + StringSrv.formatDate();
                        $scope.training_relpath             = $scope.vocabulary_relpath + "/" + $scope.temp_session_name;  // AllSpeak/vocabularies/gigi/train_XXXXXX
                        $scope.session_zip                  = $scope.training_relpath + "/" + "data.zip";
                        $scope.training_submitted_json_path = $scope.training_relpath + "/" + $scope.vocabulary_json_prefix + ".json";
                        $scope.training_received_json_path  = $scope.training_relpath + "/" + $scope.final_net_json_prefix + "_" + $scope.tfCfg.nModelType.toString() + "_" + $scope.tfCfg.nProcessingScheme.toString() + "_" + $scope.tfCfg.nModelClass.toString() + ".json";
                        
                        $scope.final_vocabulary_json_path   = $scope.vocabulary_relpath + "/" + $scope.final_net_json_prefix + "_" + $scope.tfCfg.nModelType.toString() + "_" + $scope.tfCfg.nProcessingScheme.toString() + "_" + $scope.tfCfg.nModelClass.toString() + ".json";

                        return FileSystemSrv.createDir($scope.training_relpath)
                        .then(function(){
                            $scope.vocabulary_status.isNetAvailableLocale    = false;
                            return $scope.createSubmitSessionJson($scope.training_submitted_json_path)
                        })
                        .then(function(){
                            $scope.extractFeatures($scope.doOverwriteFeatures);  
                        })
                        .catch(function(error)
                        {
                            alert("ManageTraining::startNewSession : " + error.message);
                            $scope.isSubmitting = false;
                            $scope.modalSubmitSession.hide();
                        });
                    }
                });   
            }
        })
        .catch(function(error)
        {
            alert("ManageTraining::startNewSession : " + error.message);
        });
    };

    $scope.closeModalSubmit = function()
    {
        ClockSrv.removeClock($scope.timerID);
        $scope.initSessionVariables();
        RemoteAPISrv.cancelTransfer();
        $scope.modalSubmitSession.hide();

        $state.go('vocabulary', {"foldername":$scope.foldername});
    };
    
    $scope.openSettings = function()
    {
        $scope.temp_preprocscheme = $scope.selectedProcScheme;
        return $ionicPopup.show({
                            scope: $scope,
                            templateUrl: "templates/modal/popupSelectTrainingParams.html",
                            title: 'Parametri Addestramento',
                            subTitle: 'Seleziona la modalità di addestramento della rete',
                            buttons: [
                                { text: 'Cambia',  type: 'button-positive', onTap: function() { return true;}},
                                { text: 'Annulla', type: 'button-positive', onTap: function() { return false;}}
                            ]                            
                        })       
        .then(function(res) 
        {
            if(!res)    $scope.updateProcScheme($scope.temp_preprocscheme);
        });
    }
    
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
        
        return FileSystemSrv.countFilesInDir($scope.recordings_folder, ["wav"])
        .then(function(cnt)
        {
            $scope.nFiles           = cnt;
            $scope.nCurFile         = 0;
            $scope.isCalcFeatures   = true;
            $scope.percFiles        = 0;
            
            MfccSrv.getMFCCFromFolder($scope.recordings_folder, 
                                      $scope.mfccCfg.nDataType,
                                      $scope.plugin_enum.MFCC_DATADEST_FILE,
                                      $scope.mfccCfg.nProcessingScheme,
                                      overwrite,
                                      $scope.training_relpath);  // does not overwrite existing (and valid) mfcc files
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
    // CREATE JSON & ZIP SESSION
    //==============================================================================================================================     
    // called by startNewSession
    $scope.createSubmitSessionJson = function(jsonpath) 
    {
        var ids = VocabularySrv.getTrainVocabularyIDLabels($scope.vocabulary);
        return TfSrv.createSubmitDataJSON($scope.foldername, $scope.foldername, ids, $scope.mfccCfg.nProcessingScheme, $scope.tfCfg.nModelClass, $scope.tfCfg.nModelType, $scope.init_sessionid, jsonpath);
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
        RemoteAPISrv.uploadTrainingData($scope.session_zip, $scope.onSubmitSuccess, $scope.onSubmitError, $scope.onSubmitProgress);
        $scope.isUploading          = true;
    };
    
    $scope.onSubmitSuccess = function(sess_id) 
    {
        console.log("data uploaded");
        $scope.sessionid   = sess_id;
        $scope.isUploading  = false;        
        $scope.isTraining   = true;
        
        return FileSystemSrv.updateJSONFileWithObj($scope.training_submitted_json_path, {"sessionid":sess_id}, FileSystemSrv.OVERWRITE)
        .then(function()
        {
            $scope.timerID = ClockSrv.addClock($scope.checkSession, 10000);
//        $scope.$apply();
        })
        .catch(function(error)
        {
            console.log(error.toString());
        });
    };
    
    // error.session_id is not null if server created the folder but crashed later...to be used to delete remote folders
    // write this info in the vocabulary.json file
    // error = {"code", "message", "session_id"}  with session_id always != null ( is == ''  when "empty")
    $scope.onSubmitError = function(error) 
    {
        return FileSystemSrv.updateJSONFileWithObj($scope.training_submitted_json_path, {"sessionid":error.session_id}, FileSystemSrv.OVERWRITE)
        .then(function()
        {
            $scope.isUploading = false;           
            alert("ERRORE durante l'upload dei dati: " + error.message);
            $scope.modalSubmitSession.hide();
            return $scope.checkTempSessions();            
        })     
        .catch(function(error)
        {     
            var title = "ERRORE durante l'upload dei dati" + error.toString();
            console.log(title);
            alert(title);
        });
    };
    
    $scope.onSubmitProgress = function(progress)
    {
        console.log(progress.label + " " + progress.perc + " %");
        $scope.percUpload = progress.perc;
        if(!$scope.$$phase) $scope.$apply();
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
        var doask = (ask == null ? true : ask);
        $scope.isChecking                               = true;
        $scope.vocabulary_status.isNetAvailableRemote   = false;
        return RemoteAPISrv.isNetAvailable($scope.sessionid)
        .then(function(train_obj)
        {
            $scope.isChecking       = false;
            if(train_obj)
            {
                // server responded: ok or error
                ClockSrv.removeClock($scope.timerID);       // stop checking
                if(train_obj.status == "complete")
                {
                    // ready 2 download
                    $scope.temp_sess_voc                            = TfSrv.fixTfModel(train_obj, $scope.temp_session_name);  // remove status + add sModelFilePath & nDataDest
                    $scope.vocabulary_status.isNetAvailableRemote   = true;
                    
                    $scope.training_received_pb_path                = $scope.training_relpath + "/" + $scope.temp_sess_voc.sModelFileName + ".pb";
                    $scope.final_vocabulary_pb_path                 = $scope.vocabulary_relpath + "/" + $scope.temp_sess_voc.sModelFileName + ".pb";


                    // save "net_modeltype_procscheme.json" and delete vocabulary.json
                    return FileSystemSrv.createJSONFileFromObj($scope.training_received_json_path, $scope.temp_sess_voc, 2)    // return 1 or reject
                    .then(function()
                    {
                        return FileSystemSrv.deleteFile($scope.training_submitted_json_path);
                    })
                    .then(function()
                    {
                        if(doask)
                        {
                            // ask if download
                            return $ionicPopup.confirm({ title: 'Attenzione', template: 'Il vocabolario è stato addestrato. Vuoi scaricarlo ora ? \nE possibile farlo in seguito'})
                            .then(function(res) 
                            {
                                if(res) $scope.getNet($scope.temp_sess_voc.sessionid, $scope.temp_sess_voc.sModelFileName + ".pb");
                                return true;
                            });   
                        }
                        else    return true;
                    });
                }
                else return $q.reject(train_obj);   // train_obj is the result.data returned by the server in its remote catch
            }
            else return false;  // server responded "pending" = still training....
        })
        .catch(function(error)
        {     
            var title = "ERROR in ManageTrainingCtrl::checkSession. "
            var msg = "";
            if(error.status != null)
            {
                if(error.status == 500)             msg = error.data.error;
                else if(error.status == 'error')    msg = "Errore irrecuperabile sul server.";
            }
            else                                    msg = error.message

            console.log(title + msg);
            $scope.closeModalSubmit();
            alert(title + msg);
        });
    };
    
    // download in temp folder
    $scope.getNet = function(sessionid, modelfilename)
    {   
        $scope.isDownloading = true;
        RemoteAPISrv.getNet(sessionid, $scope.training_relpath, modelfilename, $scope.onDownloadSuccess, $scope.onDownloadError, $scope.onDownloadProgress);
    };
    
    // network downloaded:
    // - set flags
    // - ask if activate=>"recognition" or =>"vocabulary" 
    $scope.onDownloadSuccess = function(fileentry) 
    {
        $scope.vocabulary_status.isNetAvailableLocale   = true;
        $scope.isSubmitting                             = false;
        $scope.isDownloading                            = false;
        console.log("network downloaded");
        
        // I test the new NET
        return TfSrv.testNewTFModel($scope.temp_sess_voc)   // return string or reject
        .then(function()
        {        
            // delete vocabulary.json ....only one json is still present in the folder
            return FileSystemSrv.deleteFile($scope.training_submitted_json_path);                                       // return 1|true or reject        
        })
        .then(function()
        {
            $scope.modalSubmitSession.hide();
            return $ionicPopup.confirm({ title: 'Attenzione', template: 'Hai correttamente scaricato la rete, vuoi attivarla e passare al riconoscimento?'})
            .then(function(r)
            {
                if(r)
                {
                    // force loadVocabulary (I may retrain the same active voc, without the force, loadVocabulary could exit immediately)
                    return RuntimeStatusSrv.loadVocabulary($scope.foldername, true)
                    .then(function()
                    {
                        $state.go("recognition", {foldername:$scope.foldername, sessionname:$scope.temp_session_name});   // go to recognition page
                    });
                }
                else    $state.go('vocabulary', {"foldername":$scope.foldername});  // go back to vocabulary page
            });
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
    // check whether one suspended train sessions is present and whether:
    // - it has the json (thus remote train should be present and need to be downloaded)
    // - it has both json & pb, thus net is probably under evaluation
    // returns an object {res:int, path:"...", voc:{}}
    //  res is  0 = no temp sessions are present
    //          1 = a temp folder is present, it does not contain neither the json nor the pb...something crashed during training.....delete it ! or recover it (TODO)
    //          2 = a temp folder is present and contains only the json => remote net should be present. ask whether:
    //                  - try download the net
    //                  - delete it
    //                  - annulla
    //          3 = a temp folder is present and contains both json and valid pb => ask to use it or delete it
    //  path contains the temp train session rel path

    $scope.checkTempSessions = function()
    {
        var temp_session_path = "";   // rel path of temp session
        var temp_session_name = "";
        
        return FileSystemSrv.listDir($scope.vocabulary_relpath, "train_")
        .then(function(dirs)
        {
            if(!dirs.length) return {"res":0};  // no temp sessions are present
            else
            {
                temp_session_name = dirs[0];    // TODO verify only one is present...manage exception
                temp_session_path = $scope.vocabulary_relpath + "/" + temp_session_name;  
                
                // return {"res":res, "path":temp_session_path, voc:temp_voc, voc_name:temp_voc_name};              
                return VocabularySrv.getTempSessions(temp_session_path)   
                .then(function(resobj)
                {
                    switch(resobj.res)
                    {
                        case 0: // no temp session are present
                            return true;        // do training
                        case 1: // an incomplete temp session (no net_xxxxxx.json, no pb) is present.
                                // - delete it ! probably crashed the server while training
                                // - cancel
                            return $ionicPopup.confirm({ title: 'Attenzione', template: 'Una precedente sessione incompleta di training è stata trovata. Per cancellarla e proseguire premi OK, altrimenti annulla il nuovo training'})
                            .then(function(res) 
                            {                    
                                if(res) return $scope.deleteSessionDir(resobj.path, resobj.voc.sessionid);        // return true or reject
                                else    return false;   // stop training
                            })

                        case 2: // an incomplete temp session (yes json, no pb) is present.  
                                // remote net is presumably present, ask whether
                                // - downloading it
                                // - delete the folder 
                                // - cancel
                            return $ionicPopup.show(
                            {
                                title: 'Attenzione',
                                subTitle: 'Una precedente sessione di training sembra sia stata completata ma la rete non è stata ancora scaricata. Se vuoi scaricarla e proseguire con il training premi OK, per cancellarla premi CANCELLA, per annullare il training premi ANNULLA',
                                buttons: [
                                    {text: '<b>OK</b>'      , type: 'button-positive', onTap: function() { return  1; }},                            
                                    {text: '<b>CANCELLA</b>', type: 'button-positive', onTap: function() { return  0; }},
                                    {text: '<b>ANNULLA</b>' , type: 'button-positive', onTap: function() { return -1; }}
                                ] 
                            })
                            .then(function(res) 
                            {                    
                                switch(res)
                                {
                                    case 1: // downloading it & stop
                                        $scope.temp_sess_voc = resobj.voc;  // TODO : verify voc.sModelPath is valid
                                        $scope.vocabulary_status.isNetAvailableRemote   = true;
                                        $scope.modalSubmitSession.show();    
                                        $scope.training_relpath = resobj.path;
                                        $scope.getNet($scope.temp_sess_voc.sessionid, $scope.temp_sess_voc.sModelFileName + ".pb");      // TODO : show something revealing App is downloading
                                        return false;       // stop training

                                    case 0: // delete temp train session and go on with a new training
                                        return $scope.deleteSessionDir(resobj.path, resobj.voc.sessionid);
                                    case -1:    // stop
                                        return false;
                                }
                            });

                        case 3: // local net is present, ask whether
                                // - accepting this new net (substituting the current similar one)
                                // - delete it
                                // - cancel new training
                            return $ionicPopup.show(
                            {
                                title: 'Attenzione',
                                subTitle: 'Esiste una sessione di training completata che richiede di essere approvata o cancellata. In caso una rete simile esista già, quest\'ultima verra\' cancellata. Per approvarla premi OK, per testarla premi TEST, per cancellarla premi CANC, per annullare premi ANNULLA',
                                buttons: [  {text: '<b>OK</b>',    type: 'button-positive', onTap: function() { return  2; }},                            
                                            {text: '<b>TEST</b>',       type: 'button-positive', onTap: function() { return  1; }},
                                            {text: '<b>NO</b>',   type: 'button-positive', onTap: function() { return  0; }},
                                            {text: '<b>ANN</b>',    type: 'button-positive', onTap: function() { return -1; }}] 
                            })
                            .then(function(res) 
                            {                    
                                switch(res)
                                {
                                    case 2:
                                        return $scope.acceptSession(resobj.path, resobj.voc);
                                    case 1:
                                        $state.go("recognition", {foldername:$scope.foldername, sessionname:temp_session_name});   // go to recognition page
                                        return false;
                                    case 0:
                                        return $scope.deleteSessionDir(resobj.path, resobj.voc.sessionid); 
                                    case -1:
                                        return false;
                                }
                            })
                    }
                })
            };        
        });
    };

    // ------------------------------------------------------------------------------------------------
    // temporary training session is accepted:
    // fix modelpath, save json in final format
    // move pb to session folder to voc folder. replace existing net (with same type and preproc scheme)
    $scope.acceptSession = function(trainfolder, voc)
    {
        $scope.temp_sess_voc = TfSrv.fixTfModel(voc);  // 2nd fix: set sModelFilePath to /vocabularies/gigi/net_274_252_280.pb
        
        var net_name                        = $scope.final_net_json_prefix + "_" + voc.nModelType.toString() + "_" + voc.nProcessingScheme.toString() + "_" + voc.nModelClass.toString();
        $scope.final_vocabulary_json_path   = $scope.vocabulary_relpath + "/" + net_name + ".json";
        $scope.final_vocabulary_pb_path     = $scope.vocabulary_relpath + "/" + voc.sModelFileName + ".pb";
        $scope.training_received_pb_path    = trainfolder + "/" + voc.sModelFileName + ".pb";
        
        var message = { title: 'Attenzione', template: 'Stai sostituendo la nuova RETE. Sei sicuro?'};
        return FileSystemSrv.createJSONFileFromObj($scope.final_vocabulary_json_path, $scope.temp_sess_voc, FileSystemSrv.ASK_OVERWRITE, message)
        .then(function(created)
        {
            // it returns false if user did not confirm.
            if(!created)    return false;
            else            return FileSystemSrv.createJSONFileFromObj($scope.final_vocabulary_json_path, $scope.temp_sess_voc, FileSystemSrv.ASK_OVERWRITE, message)
        })
        .then(function(created)
        {            
            if(created)     return FileSystemSrv.updateJSONFileWithObj($scope.vocabulary_json_path, {"sModelFileName":net_name}, FileSystemSrv.OVERWRITE);
            else            return false;
        })
        .then(function(updated)
        {
            if(updated)     return FileSystemSrv.renameFile($scope.training_received_pb_path, $scope.final_vocabulary_pb_path, FileSystemSrv.OVERWRITE);
            else            return false;            
        })
        .then(function(renamed)
        {
            if(renamed)     return FileSystemSrv.deleteDir(trainfolder);
            else            return false;
        })    
        .then(function(deleted)
        {
            // TODO: if I delete PU o CA ; I may delete all the derived 
            if(voc.nModelType == pluginInterface.ENUM.PLUGIN.TF_MODELTYPE_USER)
                return $scope.destroyDerivedUserNets();
            else if (voc.nModelType == pluginInterface.ENUM.PLUGIN.TF_MODELTYPE_COMMON_ADAPTED)
                return $scope.destroyDerivedUserNets();
            else
                return true;
        })
        .then(function(deleted)
        {                
            return VocabularySrv.getExistingNets($scope.foldername);
        })
        .then(function(existing_net_sobj)
        {
            $scope.existingNets = existing_net_sobj;
            $ionicPopup.alert({ title: 'Attenzione', template: 'La nuova rete è stata accettata'});
        })          
    }; 

    // if user replace a pure user, all the nets derived from it are no more valid.
    $scope.destroyDerivedUserNets = function()
    {
        return true;
    };

    // if user replace a common adapted (ca), the CRA must be deleted
    $scope.destroyDerivedUserNets = function()
    {
        return true;
    };

    // delete local folder and remote db entry (whether sessionid is not undefined)  
    $scope.deleteSessionDir = function(relpath, sessionid)
    {
        if(sessionid == null || sessionid == "")
        {
            return FileSystemSrv.deleteDir(relpath)
            .then(function(){$ionicPopup.alert({ title: 'Attenzione', template: 'La rete è stata cancellata'});})
        }
        else
        {
            return RemoteAPISrv.deleteTrainingSession(sessionid)
            .then(function()
            {
                return FileSystemSrv.deleteDir(relpath)
                .then(function(){$ionicPopup.alert({ title: 'Attenzione', template: 'La rete è stata cancellata'});})
            });
        }
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
    
    //==============================================================================================================================
};
controllers_module.controller('ManageTrainingCtrl', ManageTrainingCtrl)
