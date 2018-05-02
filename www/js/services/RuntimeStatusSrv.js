/*
 * Manage the active vocabulary RUNTIME (thus volatile) App status, mostly related to the recognition process
 * gets involved after InitAppSrv and InitCheckCtrl have managed persistent App status (all configs + appModality, FirstUse, isDeviceRegistered)
 * first called in InitCheckCtrl
 * 
 * TASKS
 * 1)   CHECK INTERNET CONN         : check if an internet data connection can be established.
 *                                    if not => move to HOME, 
 *                                    if firstUse => inform user that an internet conn is necessary to use it in guest and assisted mode. 
 *                                                   DO NOT set isFirstTime = true, in order to ask for it again 
 *                                                   move to HOME,* 
 * 2)   MANAGE MODELS               : load the proper model
 *  
 *      AppStatus :   
                    EnumsSrv.STATUS.NEW_TV                  = 100;
                                    RECORD_TV                = 101;
                                    TRAIN_TV                 = 102;
                                    RECORD_TVA               = 103;
                                    CAN_RECOGNIZE            = 104;
        
//        vocabulary.status               =    
//        {   // FLAGS                        provided by =>
//            "hasTrainVocabulary"            :false, // VocabularySrv
//            "vocabularyHasVoices"           :false, // VocabularySrv     according to the selected modelType, indicates if we have enough recordings
//            "haveValidTrainingSession"      :false, // VocabularySrv
//            "haveFeatures"                  :false, // indicates if the present recordings have their cepstra
//            "haveZip"                       :false, // indicates if the zip file is ready to be sent
//            "isNetAvailableRemote"          :false, // net calculated. available online                
//            "isNetAvailableLocale"          :false, // net calculated. download, available locally
//            "isNetLoaded"                   :false, // TfSrv  :  net loaded   
//            "canRecognize"                  :false
//        };
 *      isLogged 
 *      isConnected 
 */

main_module.service('RuntimeStatusSrv', function($q, $timeout, TfSrv, VocabularySrv, EnumsSrv, $cordovaNetwork, FileSystemSrv, UITextsSrv, ErrorSrv) 
{
    service                         = this;
    initAppSrv                      = null;
    
    AppStatus                       = 0;        // calculated here
    isLogged                        = false;    // InitCheckCtrl <== RemoteAPISrv     
    isConnected                     = false;    // here accessing ionic native     
    isServerOn                      = false;    // indicated if the server is ON
    
    vocabularies_folder             = "";       // <= init <= InitAppSrv        AllSpeak/vocabularies
    recordings_folder               = "";       // <= init <= InitAppSrv        AllSpeak/recordings
    
    updateTimeout                   = null; // timer started when check for update
    waitServerTime                  = 5000;
    
    vocabulary                      = null;
    
    _resetVoc = function()
    {
        vocabulary                      = {};
        vocabulary_old                  = null;
        userVocabularyName              = "";

        vocabulary_relpath              = "";       // defined in loadVocabulary    AllSpeak/vocabularies/gigi
        train_relpath                   = "";       // defined in loadVocabulary    AllSpeak/recordings/gigi        
        vocabulary_json_path            = "";       //  AllSpeak/vocabularies/gigi/vocabulary.json
    };
    //==============================================================================================================================
    // INIT SERVICE
    //==============================================================================================================================      
    init = function(voc_folder, tr_folder, initappsrv)
    {    
        vocabularies_folder         = voc_folder;
        recordings_folder           = tr_folder;
        initAppSrv                  = initappsrv;
        
        _resetVoc();
        
        $cordovaNetwork.onConnect().subscribe(function(event)  
        {
            if(event.type == "online") isConnected = true;
            console.log('network onchange', event.type);
        }, function(error){
            alert("RuntimeStatusSrv::$cordovaNetwork.onConnect " + error.toString());
        });    

        $cordovaNetwork.onDisconnect().subscribe(function(event)  
        {
            if(event.type == "offline") isConnected = false;
            console.log('network onchange', event.type);
        }, function(error){
            alert("RuntimeStatusSrv::$cordovaNetwork.onDisconnect " + error.toString());
        });    
        
        isConnected = (navigator.connection.type != "none" ? true : false);
    }
    //==============================================================================================================================
    // LOADED VOCABULARY STATUS
    //==============================================================================================================================    
    getStatus = function()
    {
        hasInternet();  // sets isConnected
        AppStatus = calculateAppStatus();        
        
        return  {"vocabulary"                    :vocabulary,
                 "AppStatus"                     :AppStatus,
                 "isLogged"                      :isLogged,  
                 "isConnected"                   :isConnected,  
                 "isServerOn"                    :isServerOn  
                };
    };
    // called by RemoteAPISrv::login => isLogged
    setStatus = function(statusobj)
    {
        for(elem in statusobj) service[elem] = statusobj[elem];
        calculateAppStatus();
    };
      
    // define what to show in the HOME page
    // 1)   can recognize active voc
    // 2)   create new voc : select TV
    // 3)   open active voc: 
    //      - record TS
    //      - remote-train TS
    // 4)  record TVA
    calculateAppStatus = function()
    {
        if(vocabulary == null)
        {
            AppStatus = EnumsSrv.STATUS.NEW_TV;
            return AppStatus;
        }
        if(vocabulary.status == null)
        {
            AppStatus = EnumsSrv.STATUS.NEW_TV;
            return AppStatus;
        }
            
        vocabulary.status.canRecognize    = false;
        if(!vocabulary.status.hasTrainVocabulary)                   
            AppStatus = EnumsSrv.STATUS.NEW_TV;
        else
        {
            if(vocabulary.status.isNetLoaded && vocabulary.status.vocabularyHasVoices)
            {
                AppStatus                       = EnumsSrv.STATUS.CAN_RECOGNIZE;
                vocabulary.status.canRecognize  = true;
                vocabulary.status.label         = "PRONTO";
            }
            else
            {
                if(!vocabulary.status.isNetLoaded) // give precedence to complete recordings/training rather than record voices
                {
                    //model doesn't exist, check whether (record a new / resume an existing) TS or send it to remote training
                    if(vocabulary.status.haveValidTrainingSession)  
                    {
                        AppStatus               = EnumsSrv.STATUS.TRAIN_TV;
                        vocabulary.status.label = "ADDESTRA RETE";
                    }
                    else
                    {
                        AppStatus               = EnumsSrv.STATUS.RECORD_TV;
                        vocabulary.status.label = "REGISTRA DATI";
                    }
                }
                else
                {
                    // model exists
                    if(!vocabulary.status.vocabularyHasVoices)
                    {
                        AppStatus               = EnumsSrv.STATUS.RECORD_TVA;
                        vocabulary.status.label = "REGISTRA VOCI DA RIPRODURRE";
                    }
                    else
                    {
                        alert("Error: inconsistent state");
                        AppStatus               = 0;          
                        vocabulary.status.label = "ERRORE";
                    }
                }
            }
        }
        return AppStatus;
    };         
    
    //==============================================================================================================================
    // MANAGE LOADED VOCABULARY
    //==============================================================================================================================
    // load a vocabulary given a folder name:
    // - check folder existence
    // - check json existence
    // - load json
    // - check commands>0 (user can not create a voc with no commands, but user can later delete all the commands...thus check it).
    // - check & suggest next step status (select commands, create/complete rec session/train net/load net/manage voices)
    // - load net if available
    //
    loadDefault = function()
    {
        
        vocabulary_relpath      = initAppSrv.getDefaultVocabularyFolder();
        train_relpath           = "";
        vocabulary_json_path    = vocabulary_relpath + "/" + UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;
        
        return FileSystemSrv.existDir(vocabulary_relpath)
        .then(function(existfolder)
        {
            if(existfolder)     return FileSystemSrv.existFile(vocabulary_json_path);
            else                return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCFOLDER_NOTEXIST, message:"NO_FOLDER of vocabulary : default"});
        })
        .then(function(existfile)
        {
            if(existfile)       return VocabularySrv.getTrainVocabulary(vocabulary_json_path);
            else                return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST, message:"NO_FILE of vocabulary : default"});
        })
        .then(function(voc)
        {
            vocabulary        = voc;
            return TfSrv.loadTFModel(vocabulary);
        })
        .then(function()
        {
            return VocabularySrv.getUpdatedStatus(vocabulary);
        })
        .then(function(voc)
        {
            vocabulary = voc;
            return getStatus();
        })        
        .catch(function(error)
        {
            $q.reject(error);
        });    
    };
    //--------------------------------------------------------------------------
    // load a vocabulary given a folder name:
    // if already loaded => return getStatus
    // input foldername CANNOT be empty
    // - check folder existence
    // - check json existence
    // - load voc
    // - load net if available
    // - set userActiveVocabularyName
    // - updates and return status
    //
    loadVocabulary = function(uservocabularyname, force)
    {
        var doforce = (force == null ? true : force);
        if(userVocabularyName == uservocabularyname && !doforce)  return Promise.resolve(getStatus(vocabulary));
        
        vocabulary_old = cloneObj(vocabulary);
        
        if(uservocabularyname == "" || uservocabularyname == null)  
            return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCFOLDERVARIABLE_EMPTY, message:"Error in RuntimeStatusSrv::loadVocabulary : input voc folder (" + userVocabularyName + ") is not valid"});
        
        vocabulary_relpath      = vocabularies_folder + "/" + uservocabularyname;
        train_relpath           = recordings_folder; //     + "/" + uservocabularyname;
        vocabulary_json_path    = vocabulary_relpath  + "/" + UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;
        
        return FileSystemSrv.existDir(vocabulary_relpath)
        .then(function(existfolder)
        {
            if(existfolder)     return FileSystemSrv.existFile(vocabulary_json_path);
            else                return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCFOLDER_NOTEXIST, message:"NO_FOLDER"});
        })
        .then(function(existfile)
        {
            if(existfile)       return VocabularySrv.getTrainVocabulary(vocabulary_json_path);
            else                return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST, message:"NO_FILE"});
        })
        .then(function(voc)
        {
            vocabulary        = voc;
            
            if(vocabulary.sModelFileName != null && vocabulary.sModelFileName != "")
            {
                selected_net_relpath = vocabulary_relpath + "/" + vocabulary.sModelFileName + ".json";
                return VocabularySrv.getTrainVocabulary(selected_net_relpath);
            }
            else return null;
        })
        .then(function(selvoc)
        {
            if(selvoc == null)  return false;
            else                return TfSrv.loadTFModel(selvoc);
        })
        .catch(function(error)
        {
//            if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST || error.mycode == ErrorSrv.ENUMS.VOCABULARY.VOCFOLDER_NOTEXIST)
            if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.MODELFILEVARIABLE_EMPTY || error.mycode == ErrorSrv.ENUMS.VOCABULARY.MODELFILE_NOTEXIST)
                return $q.resolve(false); // this reject are not problematic, there could be 
            else
                return $q.reject(error);
        })        
        .then(function()
        {
            userVocabularyName = uservocabularyname;
            return initAppSrv.setStatus({"userActiveVocabularyName":userVocabularyName});
        })
        .then(function()
        {
            return VocabularySrv.getUpdatedStatus(vocabulary);
        })
        .then(function(voc)
        {
            vocabulary = voc;
            return getStatus();
        });
    };
    //
    //--------------------------------------------------------------------------
    // called by ManageCommandsCtrl::saveTrainVocabulary
    saveTrainVocabulary = function(voc)
    {
        var curr_vocfolder = userVocabularyName;
        return VocabularySrv.setTrainVocabulary(voc)
        .then(function()
        {
            return initAppSrv.setStatus({"userActiveVocabularyName":voc.sLocalFolder});
        })        
        .then(function()
        {  
            return loadVocabulary(voc.sLocalFolder);
        });     
    };  
    
    unloadVocabulary = function()
    {
        _resetVoc();
        userActiveVocabularyName = "default";
        return initAppSrv.setStatus({"userActiveVocabularyName":userActiveVocabularyName})
        .then(function()
        {
            return loadDefault();
        });        
    };
    //======================================================================================================================================
    hasInternet = function()
    {
        isConnected = (navigator.connection.type != "none" ? true : false);
        return isConnected;
    };    
    //==========================================================================
    // PRIVATE
    //==========================================================================
    cloneObj = function(obj)
    {
        var clone = {};
        for(var field in obj)
            clone[field] = obj[field];
        return clone;
    };  
    //======================================================================================================================================
    //======================================================================================================================================
    //======================================================================================================================================
    return {
        init                        : init,                            //
        loadDefault                 : loadDefault,                  //
        loadVocabulary              : loadVocabulary,                  //
        saveTrainVocabulary         : saveTrainVocabulary,             //
        unloadVocabulary            : unloadVocabulary,                 //
        getStatus                   : getStatus,                       //
        setStatus                   : setStatus,                       //
        hasInternet                 : hasInternet                     //
    };
    //======================================================================================================================================
});
