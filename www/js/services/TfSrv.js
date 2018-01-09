/*
 * This service load a TF model into the plugin and store its information
 * mTfCfg is set only when the TF model loading process was successfull
 * 
 * I receive from InitAppSrv the defaults values
 * controllers can only load a new model. if successfull mTfCfg is updated. 
 * ctrl cannot modify it otherwise => this Service have the isModelLoaded methods
 * ctrl can only have a clone copy of mTfCfg
 * 
 */

function TfSrv(FileSystemSrv, $q, ErrorSrv)
{
    mTfCfg              = null;     // hold current configuration (got from json file)
    standardTfCfg       = null;     // hold standard  Configuration (obtained from App json, if not present takes them from window.audioinput & window.speechcapture
    oldCfg              = null;     // copied while loading a new model, restored if something fails
    pluginInterface     = null;
    plugin_enum_tf      = null;
    plugin_tf           = null;

    vocabulariesFolder  = "";       // AllSpeak/vocabularies

    modelLoaded         = false;
    modelFolder         = ""        // default - standard - gigi etc...
    modelJsonFile       = ""        // json file containing model info
    
    //==========================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //==========================================================================
    //
    // PUBLIC ********************************************************************************************************
    init = function(jsonCfg, vocabulariesfolder, plugin)
    {  
        standardTfCfg       = jsonCfg;
        mTfCfg              = null;
        oldCfg              = null;
        
        pluginInterface     = plugin;
        plugin_tf           = pluginInterface.ENUM.tf;
        plugin_enum_tf      = pluginInterface.ENUM.PLUGIN;
        
        vocabulariesFolder  = vocabulariesfolder;
    };
    
    //=========================================================================
    // GET TfCfg or overridden copies
    //=========================================================================
    getCfg = function()
    {
        return cloneObj(mTfCfg);
    };    

    // called by any controller pretending to get an overriden copy of the standard model params
    getUpdatedStandardCfgCopy = function (ctrlcfg)
    {
        var cfg = cloneObj(standardTfCfg);
        
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
        
        var cfg = cloneObj(mTfCfg);
        
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
    loadTFModelPath = function(json_relpath, force)
    {
        if(force == null)   force = false;
           
        if(json_relpath == modelJsonFile && modelLoaded && !force) return Promise.resolve(true);
        else                                                
        {
            return FileSystemSrv.existFile(json_relpath)
            .then(function(existfile)
            {
                if(existfile)       return FileSystemSrv.readJSON(json_relpath);
                else                return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST, message:"TfSrv::loadTFModelPath : NO_FILE " + json_relpath});
            })
            .then(function(voc)
            {
                modelJsonFile = json_relpath;
                return loadTFModel(voc);
            })
            .catch(function(error)
            {
                modelLoaded     = false;
                mTfCfg          = null;
                modelJsonFile   = "";            
                return $q.reject(error);
            });          
        }
    }
    
    // returns: string or throws
    // load NET if model.sModelFileName is valid
    // ONLY methods allowed to modify mTfCfg
    loadTFModel = function(voc)
    {
        if(voc.sModelFilePath == null || voc.sModelFilePath == "")
            return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.MODELFILEVARIABLE_EMPTY, message:"Model pb path is null"});
        else
        {
            return FileSystemSrv.existFileResolved(voc.sModelFilePath)      // #ISSUE# if there is an error in existFileResolved, the catch below is not triggered
            .then(function(exist)
            {
                if(exist)   return pluginInterface.loadTFModel(voc)
                else        return $q.reject({mycode:ErrorSrv.ENUMS.VOCABULARY.MODELFILE_NOTEXIST, message:"Model pb is not present"} );
            })
            .then(function(loaded)
            {  
                modelLoaded = loaded;
                if(loaded)    mTfCfg     = voc;
                else
                {
                    mTfCfg          = null;
                    modelJsonFile   = "";                
                }
                return loaded;
            })
            .catch(function(error)
            {
                modelLoaded     = false;
                mTfCfg          = null;
                modelJsonFile   = "";    
                error.mycode = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL
                return $q.reject(error);
            });     
        }
    };    
    
    // test if the TFmodel pointed by the given voc is correct
    // load it, check if ok, then load back to current one
    // doesn't change the mTfCfg
    // returns: string or reject
    testNewTFModel = function(voc)
    {
        if(voc.sModelFilePath == null || voc.sModelFilePath == "")
            return $q.reject({mycode:ErrorSrv.ENUMS.VOCABULARY.MODELFILEVARIABLE_EMPTY, message:"Model pb path is null"});

        var loadnew         = true;
        var isnewmodelvalid = false;
         
        return FileSystemSrv.existFileResolved(voc.sModelFilePath)      // #ISSUE# if there is an error in existFileResolved, the catch below is not triggered
        .then(function(exist)
        {
            if(exist)   return pluginInterface.loadTFModel(voc)
            else        return $q.reject({mycode:ErrorSrv.ENUMS.VOCABULARY.MODELFILE_NOTEXIST, message:"Model pb is not present"} );
        })
        .then(function()
        {  
            loadnew = false;
            if(mTfCfg)  return loadTFModel(mTfCfg);     // reload current net if exist
            else        return true;
        })
        .then(function()
        {
            return true;
        })            
        .catch(function(error)
        {
            if(loadnew)
            {
                 // error while testing the new net...reload current one and reject with the original error
                return loadTFModel(mTfCfg)
                .then(function()
                {
                    error.mycode = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL
                    return $q.reject(error);
                })
                .catch(function(error2)
                {                
                    // should not happen !!!! #FLOWCRASH#
                    error2.mycode = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL
                    return $q.reject(error2);
                });
            }
            else
            {
                // should not happen !!!! #FLOWCRASH#
                error.mycode = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL
                return $q.reject(error);
            }
        })
    };    
    
    isModelLoaded = function(vocfolder)
    {
        if(modelLoaded && mTfCfg.sLocalFolder == vocfolder) return true;
        else                                                return false;
    };
    
    //=========================================================================
    // PRE-SUBMIT & POST-DOWNLOAD activity
    //=========================================================================
    // the crucial params are: sLabel, commands, nProcessingScheme (taken from default)
    createSubmitDataJSON = function(label, localfolder, commandsids, procscheme, modeltype, filepath)
    {
        var train_obj = {};
        train_obj.sLabel                = label;
        train_obj.sLocalFolder          = localfolder;    
        train_obj.commands              = commandsids;
        train_obj.nProcessingScheme     = procscheme;
        train_obj.nModelType            = (modeltype == plugin_enum_tf.TF_MODELTYPE_USER_FT_APPEND  ?  plugin_enum_tf.TF_MODELTYPE_USER_FT :  modeltype);    
        return FileSystemSrv.createFile(filepath, JSON.stringify(train_obj));
    };
    
    // called by: ManageTrainingCtr::checkSession
    // all the downloaded model pass from here.
    fixTfModel = function(voc)
    {
        delete voc.status;
        voc.sModelFilePath  = FileSystemSrv.getResolvedOutDataFolder() + vocabulariesFolder + "/" + voc.sLocalFolder + "/" + voc.sModelFileName;  
        voc.nDataDest       = standardTfCfg.nDataDest;
        return voc;
    }
    
    //=========================================================================
    // returns ENUMS
    //=========================================================================
    getNetTypes = function()
    {
        return [{"label": "NUOVA UTENTE", "value": plugin_enum_tf.TF_MODELTYPE_USER}, {"label": "NUOVA MISTA", "value": plugin_enum_tf.TF_MODELTYPE_USER_FT}, {"label": "AGGIUNGI MISTA", "value": plugin_enum_tf.TF_MODELTYPE_USER_FT_APPEND}];
    };
 
    getPreProcTypes = function()
    {
        return [{"label": "Filtri spettrali", "value": plugin_enum_tf.MFCC_PROCSCHEME_F_S_CTX}, {"label": "Filtri temporali", "value": plugin_enum_tf.MFCC_PROCSCHEME_F_T_CTX}];
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
    
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                        : init,
        getUpdatedCfgCopy           : getUpdatedCfgCopy, 
        getUpdatedStandardCfgCopy   : getUpdatedStandardCfgCopy, 
        getCfg                      : getCfg, 
        getNetTypes                 : getNetTypes,
        getPreProcTypes             : getPreProcTypes,
        isModelLoaded               : isModelLoaded,
        loadTFModelPath             : loadTFModelPath,
        fixTfModel                  : fixTfModel,
        loadTFModel                 : loadTFModel,
        createSubmitDataJSON        : createSubmitDataJSON
    };    
}
main_module.service('TfSrv', TfSrv);