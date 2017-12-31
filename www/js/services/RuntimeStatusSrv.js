/*
 * Manage RUNTIME (thus volatile) App status, mostly related to the recognition process
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
 *      hasTrainVocabulary        
 *      vocabularyHasVoices
 *      modelLoaded 
 *      existCompletedTrainingSession 
 *      isLogged 
 *      isConnected 
 */

main_module.service('RuntimeStatusSrv', function($q, TfSrv, VocabularySrv, EnumsSrv, $cordovaNetwork, FileSystemSrv) 
{
    service                         = this;
    AppStatus                       = 0;        // calculated here

    // provided by =============================>
    hasTrainVocabulary              = false;    // VocabularySrv
    vocabularyHasVoices             = false;    // VocabularySrv     
    existCompletedTrainingSession   = false;    // VocabularySrv
    modelLoaded                     = false;    // TfSrv       
    modelExist                      = false;    // calculated here       
    
    isLogged                        = false;    // InitCheckCtrl <== RemoteAPISrv     
    isConnected                     = false;    // here accessing ionic native     
//    canRecognize                    = false;  
    
    vocabulary                      = null;
    vocabularies_folder             = "";       // <= init <= InitAppSrv
    vocabularyjsonpath              = "";
    
    // -----------------------------------------------------------------------------------------------------------------
    init = function(voc_folder)
    {    
        vocabularies_folder       = voc_folder
        
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
    }
    //---------------------------------------------------------------------------
    // called by RemoteAPISrv::login => isLogged
    setStatus = function(statusobj)
    {
        for(elem in statusobj) service[elem] = statusobj[elem];
        _calculateRuntimeStatus();
    };
    
    getStatus = function()
    {
        _calculateRuntimeStatus();
        isConnected = (navigator.connection.type != "none" ? true : false);

        return {"AppStatus"                     :AppStatus,
                "hasTrainVocabulary"            :hasTrainVocabulary,
                "vocabularyHasVoices"           :vocabularyHasVoices,
                "modelLoaded"                   :modelLoaded,
                "modelExist"                    :modelExist,
                "existCompletedTrainingSession" :existCompletedTrainingSession,
                "isLogged"                      :isLogged,  
                "isConnected"                   :isConnected  
//                "canRecognize"                  :canRecognize
            };
    };
    
    // load a vocabulary given a folder name:
    // - check folder existence
    // - check json existence
    // - load json
    // - check commands>0 (user can not create a voc with no commands, but user can later delete all the commands...thus check it).
    // - check & suggest next step status (select commands, create/complete rec session/train net/load net/manage voices)
    // - load net if available
    //
    loadVocabulary = function(userVocabularyName)
    {
        if(userVocabularyName == "" || userVocabularyName == null)  
            return $q.reject("Error in RuntimeStatusSrv::loadVocabulary : input voc folder (" + userVocabularyName + ") is not valid");
        
        
        var vocfolderpath   = vocabularies_folder + "/" + userVocabularyName;
        var vocjsonpath     = vocfolderpath + "/vocabulary.json";
        
        return FileSystemSrv.existDir(vocfolderpath)
        .then(function(existfolder)
        {
            if(existfolder)     return FileSystemSrv.existFile(vocjsonpath);
            else                return $q.reject("NO_FOLDER");
        })
        .then(function(existfile)
        {
            if(existfile)       return VocabularySrv.getTrainVocabulary(vocjsonpath);
            else                return $q.reject("NO_FILE");
        })
        .then(function(voc)
        {
            vocabulary        = voc;
            return TfSrv.loadTFModel(voc);
        })
        .then(function(modelloaded)
        {
            modelLoaded       = modelloaded;
            return getUpdatedStatus(vocabulary);
        })
        .catch(function(error)
        {
            modelLoaded = false;
            switch(error)
            {
                case "NO_FOLDER":
                case "NO_FILE":
                    return getStatus();
                default:
                    $q.reject(error);
            }
        });    
    };
    
    // calculate the status of a vocabulary, given a voc object
    getUpdatedStatus = function(voc)
    {
        vocabularyHasVoices             = false;
        existCompletedTrainingSession   = false;
        modelExist                      = false;
        modelLoaded                     = false;        
        hasTrainVocabulary              = (voc ? voc.commands.length : false);
        
        if(!hasTrainVocabulary) return Promise.resolve(getStatus());
        else 
        {
            return VocabularySrv.hasVoicesTrainVocabulary(voc)
            .then(function(res)
            {
                vocabularyHasVoices = res;
                if(hasTrainVocabulary) return VocabularySrv.existCompleteRecordedTrainSession(vocabularies_folder + "/" + voc.sLocalFolder, voc);
                else                   return false;
            })        
            .then(function(res)
            {
                existCompletedTrainingSession = res;
                var relmodelpath = "";
                if(voc.sModelFileName != null)
                    if(voc.sModelFileName.length)
                        relmodelpath = vocabularies_folder + "/" + voc.sLocalFolder  + "/" + voc.sModelFileName;

                if(relmodelpath != "")  return FileSystemSrv.existFile(relmodelpath)
                else                    return false;
            })
            .then(function(existmodel)
            {
                modelExist  = existmodel;
                modelLoaded = TfSrv.isModelLoaded(voc.sLocalFolder);
                return getStatus();
            });        
        }
    }
    // calculate the status of a vocabulary, given a voc folder.
    // it can not be empty...thus go on processing
    getUpdatedStatusName = function(userVocabularyName)
    {
        if(userVocabularyName == null || userVocabularyName == "") return getUpdatedStatus(null);
//            return Promise.resolve(getStatus());
        
        vocabularyjsonpath              = vocabularies_folder + "/" + userVocabularyName + "/vocabulary.json";

        return VocabularySrv.getTempTrainVocabulary(vocabularyjsonpath)
        .then(function(voc)
        {    
            return getUpdatedStatus(voc);
        });
    };

    hasInternet = function()
    {
        isConnected = (navigator.connection.type != "none" ? true : false);
        return isConnected;
    };    
    
    // called by ManageCommandsCtrl::saveTrainVocabulary
    setTrainVocabularyPresence = function(foldername)
    {
        if(foldername == null)  hasTrainVocabulary = false;
        else
        {
            hasTrainVocabulary  = (foldername.length);
            vocabulary_folder   = foldername;
        }
    };     
    //======================================================================================================================================
    // PRIVATE
    //======================================================================================================================================
    // must define what to show in the HOME page
    // 1)   can recognize
    // 2)   select TV
    // 3)   record TS
    // 4)   remote-train TS
    // 5)   record TVA
    _calculateRuntimeStatus = function()
    {
        if(!hasTrainVocabulary)                         AppStatus = EnumsSrv.STATUS.NEW_TV;
        else
        {
            if(modelLoaded && vocabularyHasVoices)      AppStatus = EnumsSrv.STATUS.CAN_RECOGNIZE;
            else
            {
                if(!modelLoaded) // give precedence to complete recordings/training rather than record voices
                {
                    //model doesn't exist, check whether (record a new / resume an existing) TS or send it to remote training
                    if(existCompletedTrainingSession)   AppStatus = EnumsSrv.STATUS.TRAIN_TV;
                    else                                AppStatus = EnumsSrv.STATUS.RECORD_TV;
                }
                else
                {
                    // model exists
                    if(!vocabularyHasVoices)            AppStatus = EnumsSrv.STATUS.RECORD_TVA;
                    else
                    {
                                                        alert("Error: inconsistent state");
                                                        AppStatus = 0; 
                    }
                }
            }
        }
        return AppStatus;
    };    

    //======================================================================================================================================
    //======================================================================================================================================
    //======================================================================================================================================
    return {
        init                        : init,                            //
        loadVocabulary              : loadVocabulary,                            //
        getUpdatedStatusName        : getUpdatedStatusName,                            //
        getStatus                   : getStatus,                            //
        setStatus                   : setStatus,                            //
        hasInternet                 : hasInternet,                            //
        setTrainVocabularyPresence  : setTrainVocabularyPresence                            //
    };
    //======================================================================================================================================
});
