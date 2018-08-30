/*
 * This service load a TF model into the plugin and store its information
 * mTfCfg is set only when the TF model loading process was successfull
 * 
 * I receive from InitAppSrv the defaults values
 * controllers can only load a new model. if successfull mTfCfg & modelJsonFile are updated. 
 * ctrl cannot modify it otherwise => this Service have the isModelLoaded methods
 * ctrl can only have a clone copy of mTfCfg
 * 
 */

function TfSrv(FileSystemSrv, $q, ErrorSrv, UITextsSrv, MiscellaneousSrv)
{
    mTfCfg              = null;     // hold current configuration (got from json file)
    standardTfCfg       = null;     // hold standard  Configuration (obtained from App json, if not present takes them from window.audioinput & window.speechcapture
    oldCfg              = null;     // copied while loading a new model, restored if something fails
    pluginInterface     = null;
    plugin_enum_tf      = null;
    plugin_tf           = null;
    
    initAppSrv          = null;    

    vocabulariesFolder  = "";       // AllSpeak/vocabularies

    modelLoaded         = false;
    modelJsonFile       = "";       // json file containing model info
    
    //==========================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //==========================================================================
    //
    // PUBLIC ********************************************************************************************************
    init = function(jsonCfg, vocabulariesfolder, plugin, initappserv)
    {  
        standardTfCfg       = jsonCfg;
        mTfCfg              = null;
        oldCfg              = null;
        
        pluginInterface     = plugin;
        plugin_tf           = pluginInterface.ENUM.tf;
        plugin_enum_tf      = pluginInterface.ENUM.PLUGIN;
        
        vocabulariesFolder  = vocabulariesfolder;
        
        initAppSrv          = initappserv;        
    };
    
    //=========================================================================
    // GET TfCfg or overridden copies
    //=========================================================================
    getCfg = function()
    {
        return MiscellaneousSrv.cloneObj(mTfCfg);   // returns null if mTfCfg is null
    };    

    // called by any controller pretending to get an overriden copy of the standard model params
    getUpdatedStandardCfgCopy = function (ctrlcfg)
    {
        var cfg = MiscellaneousSrv.cloneObj(standardTfCfg);
        
        if (ctrlcfg != null)
            for (item in ctrlcfg)
                cfg[item] = ctrlcfg[item];
        return cfg;
    };    
  
    // called by any controller pretending to get an overriden copy of the currently loaded model
    getUpdatedCfgCopy = function (ctrlcfg)
    {
        if(mTfCfg == null)
        {
            console.log("warning in TfSrv::getUpdatedStandardCfgCopy...mCfg is null")
            return null;
        }
        
        var cfg = MiscellaneousSrv.cloneObj(mTfCfg);
        
        if (ctrlcfg != null)
            for (item in ctrlcfg)
                cfg[item] = ctrlcfg[item];
        return cfg;
    };    
  
    //=========================================================================
    // LOAD MODELS
    //=========================================================================
    // returns:  (true | false) or catch("NO_FILE")
    // load model json and load it if model.sModelFilePath exist
    // PRESENTLY UNUSED !!!!
    loadTFNetPath = function(json_relpath, force)
    {
        if(force == null)   force = false;
           
        if(json_relpath == modelJsonFile && modelLoaded && !force) return Promise.resolve(true);
        else                                                
        {
            return FileSystemSrv.existFile(json_relpath)
            .then(function(existfile)
            {
                if(existfile)       return FileSystemSrv.readJSON(json_relpath);
                else                return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST, message:"TfSrv::loadTFNetPath : NO_FILE " + json_relpath});
            })
            .then(function(net)
            {
                return loadTFNet(net);
            })
        }
    }
    
    // returns: string or throws
    // load NET if model.sModelFileName is valid
    // ONLY methods allowed to modify mTfCfg
    loadTFNet = function(net)
    {
        var loadnew         = true;
        if(net.sModelFilePath == null || net.sModelFilePath == "")
            return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.NETPBFILEVARIABLE_EMPTY, message:"Model pb path is null"});
        else
        {
            return FileSystemSrv.existFileResolved(net.sModelFilePath)
            .then(function(exist)
            {
                if(exist)   return pluginInterface.loadTFNet(net);  // returns string or reject
                else        return $q.reject({mycode:ErrorSrv.ENUMS.VOCABULARY.NETPBFILE_NOTEXIST, message:"Model pb is not present"});
            })
            .then(function()
            {  
                mTfCfg          = net;
                modelLoaded     = net.sLocalFolder;
                modelJsonFile   = vocabulariesFolder + "/" + net.sLocalFolder + "/" + net.sModelFileName + ".json";
                
                console.log("loaded model: " + net.sModelFilePath);
                return modelLoaded;
            })
            .catch(function(error)
            {
                error.mycode    = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL;
                if(loadnew && mTfCfg) 
                {
                    // error loading the net net...reload current one
                    return pluginInterface.loadTFNet(mTfCfg)
                    .then(function(){return $q.reject(error);})    // I correctly reloaded the current one, can reject the error related to the new one.
                    .catch(function(error2)
                    {                
                        // should not happen !!!! also the old net crash ..... #FLOWCRASH#
                        mTfCfg          = null;
                        modelLoaded     = false;
                        modelJsonFile   = "";                             
                        error2.mycode    = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL;
                        return $q.reject(error2);
                    });                 
                }
                else if(!loadnew)
                {
                    // should not happen !!!! the currently loaded net crash ..... #FLOWCRASH#
                    mTfCfg          = null;
                    modelLoaded     = false;
                    modelJsonFile   = "";                             
                    error.mycode    = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL;
                    return $q.reject(error);                    
                }
                else return $q.reject(error);   // 
            });
        }
    };    
    
    // test if the TFmodel pointed by the given net is correct
    // load it, check if ok, then load back to current one
    // doesn't change the mTfCfg
    // returns: string or reject
    testNewTFModel = function(net)
    {
        var loadnew         = true;        
        
        if(net.sModelFilePath == null || net.sModelFilePath == "")
            return $q.reject({mycode:ErrorSrv.ENUMS.VOCABULARY.NETPBFILEVARIABLE_EMPTY, message:"Model pb path is null"});
        else
        {
            return FileSystemSrv.existFileResolved(net.sModelFilePath)      // #ISSUE# if there is an error in existFileResolved, the catch below is not triggered
            .then(function(exist)
            {
                if(exist)   return pluginInterface.loadTFNet(net);
                else        return $q.reject({mycode:ErrorSrv.ENUMS.VOCABULARY.NETPBFILE_NOTEXIST, message:"Model pb is not present"} );
            })
            .then(function()
            {  
                // test net is ok !, reload current one if exists
                loadnew = false;
                if(mTfCfg)  return loadTFNet(mTfCfg);
                else        return true;
            })
            .catch(function(error)
            {
                error.mycode    = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL;
                if(loadnew && mTfCfg) 
                {
                    // error loading the test net...reload current one
                    return loadTFNet(mTfCfg)
                    .then(function(){return $q.reject(error);})    // I correctly reloaded the current one, can reject the error related to the tested one.
                    .catch(function(error2)
                    {                
                        // should not happen !!!! also the old net crash ..... #FLOWCRASH#
                        mTfCfg          = null;
                        modelLoaded     = false;
                        modelJsonFile   = "";                             
                        error2.mycode    = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL;
                        return $q.reject(error2);
                    });                 
                }
                else if(!loadnew)
                {
                    // should not happen !!!! the currently loaded net crash ..... #FLOWCRASH#
                    mTfCfg          = null;
                    modelLoaded     = false;
                    modelJsonFile   = "";                             
                    error.mycode    = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL;
                    return $q.reject(error);                    
                }
                else return $q.reject(error);   // 
            });
        }
    };    
    
    // called when a net_xxxxx.json/pb is deleted. check whether it was the loaded one. if so => reset
    checkDeletedNet = function(netpath)
    {
        if(netpath == modelJsonFile)
        {
            mTfCfg          = null;
            modelLoaded     = false;
            modelJsonFile   = "";                 
        }
    };
    
    isModelLoaded = function(vocfolder)
    {
        if(modelLoaded && mTfCfg.sLocalFolder == vocfolder) return true;
        else                                                return false;
    };
    
    isNetLoaded = function(netpath)
    {
        if(modelLoaded && modelJsonFile == netpath) return true;
        else                                        return false;
    };
    
    //=========================================================================
    // PRE-SUBMIT & POST-DOWNLOAD activity
    //=========================================================================
    // the crucial params are: sLabel, commands, nProcessingScheme (taken from default)
    createSubmitDataJSON = function(postfixlabel, localfolder, commandsids, procscheme, modelclass, modeltype, initsessid, filepath)
    {
        var train_obj = {};
        train_obj.sLabel                = getNetMainLabelByType(modeltype) + postfixlabel;
        train_obj.sLocalFolder          = localfolder;    
        train_obj.commands              = commandsids;
        train_obj.nProcessingScheme     = procscheme;
        train_obj.nModelClass           = modelclass;
        train_obj.nModelType            = modeltype;
        train_obj.init_sessionid        = initsessid;    
        return FileSystemSrv.createFile(filepath, JSON.stringify(train_obj), FileSystemSrv.OVERWRITE);
    };
    
    // - set the default nRecognitionDistance value
    // - set device path of the downloaded net
    //      first is in a temp session (e.g : vocabularies/gigi/train_XXXXXX)
    //      then, when accepted, it gets vocabularies/gigi
    // called by: ManageTrainingCtr::checkSession
    // all the downloaded model pass from here.
    fixTfModel = function(net, tempsession)
    {
        if(net.status) delete net.status;
        net.nDataDest               = standardTfCfg.nDataDest;   
        net.nRecognitionDistance    = initAppSrv.getDefaultRecognitionDistance();
        
        if(tempsession)
            net.sModelFilePath      = FileSystemSrv.getResolvedOutDataFolder() + vocabulariesFolder + "/" + net.sLocalFolder + "/" + tempsession + "/" + net.sModelFileName + ".pb";  
        else
            net.sModelFilePath      = FileSystemSrv.getResolvedOutDataFolder() + vocabulariesFolder + "/" + net.sLocalFolder + "/" + net.sModelFileName + ".pb";  
        
        return net;
    };
 
    // returns USER of COMMON ADAPTED
    getNetMainLabelByType = function(modeltype)
    {
        switch(modeltype)
        {
            case plugin_enum_tf.TF_MODELTYPE_USER:
            case plugin_enum_tf.TF_MODELTYPE_USER_ADAPTED:
            case plugin_enum_tf.TF_MODELTYPE_USER_READAPTED:
                return UITextsSrv.TRAINING.models.labelUSER;
                
            case plugin_enum_tf.TF_MODELTYPE_COMMON_ADAPTED:
            case plugin_enum_tf.TF_MODELTYPE_COMMON_READAPTED:
                return UITextsSrv.TRAINING.models.labelCOMMONADAPTED;
            
            default:
                alert("ERROR: unexpected modeltype in TfSrv::getNetLabelByType");
                return UITextsSrv.TRAINING.models.labelUNSPECIFIED;
        }        
    };
    
    getNetLabelByType = function(modeltype)
    {
        switch(modeltype)
        {
            case plugin_enum_tf.TF_MODELTYPE_COMMON:
                return UITextsSrv.TRAINING.models.labelC;
            case plugin_enum_tf.TF_MODELTYPE_USER:
                return UITextsSrv.TRAINING.models.labelPU;
            case plugin_enum_tf.TF_MODELTYPE_USER_ADAPTED:
                return UITextsSrv.TRAINING.models.labelPUA;
            case plugin_enum_tf.TF_MODELTYPE_COMMON_ADAPTED:
                return UITextsSrv.TRAINING.models.labelCA;
            case plugin_enum_tf.TF_MODELTYPE_USER_READAPTED:
                return UITextsSrv.TRAINING.models.labelPURA;
            case plugin_enum_tf.TF_MODELTYPE_COMMON_READAPTED:
                return UITextsSrv.TRAINING.models.labelCRA;
            default:
                alert("ERROR: unexpected modeltype in TfSrv::getNetLabelByType");
                return "UNSPECIFIED";
        }
    };
    
    //=========================================================================
    adjustVADThreshold = function(threshold)
    {
        return pluginInterface.adjustVADThreshold(threshold);
    };
    //=========================================================================
    // returns ENUMS
    //=========================================================================
    getNetTypes = function()
    {
        return [{"label": "SOLO UTENTE"         ,"label2": "UTENTE"         , "value": plugin_enum_tf.TF_MODELTYPE_USER},
                {"label": "ADATTA SOLO UTENTE"  ,"label2": "UTENTE"         , "value": plugin_enum_tf.TF_MODELTYPE_USER_ADAPTED},
                {"label": "ADATTA COMUNE"       ,"label2": "COMUNE ADATTATA", "value": plugin_enum_tf.TF_MODELTYPE_COMMON_ADAPTED}, 
                {"label": "RI-ADATTA UTENTE"    ,"label2": "UTENTE"         , "value": plugin_enum_tf.TF_MODELTYPE_USER_READAPTED},
                {"label": "RI-ADATTA COMUNE"    ,"label2": "COMUNE ADATTATA", "value": plugin_enum_tf.TF_MODELTYPE_COMMON_READAPTED}];
    };
   
    
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                        : init,
        getUpdatedCfgCopy           : getUpdatedCfgCopy, 
        getUpdatedStandardCfgCopy   : getUpdatedStandardCfgCopy, 
        getCfg                      : getCfg, 
        getNetTypes                 : getNetTypes,
        checkDeletedNet             : checkDeletedNet,
        isModelLoaded               : isModelLoaded,
        isNetLoaded                 : isNetLoaded,
        loadTFNetPath               : loadTFNetPath,
        loadTFNet                   : loadTFNet,
        fixTfModel                  : fixTfModel,
        testNewTFModel              : testNewTFModel,
        createSubmitDataJSON        : createSubmitDataJSON,
        adjustVADThreshold          : adjustVADThreshold
    };    
}
main_module.service('TfSrv', TfSrv);