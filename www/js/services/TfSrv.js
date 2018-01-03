/*
 * 
 */


function TfSrv(FileSystemSrv, $q)
{
    // Management of default values:
    // each time I call : init (captureCfg, captureProfile, output_chunks, vadCfg, mfccCfg)
    // 1) take the values defined in window.audioinput (capture) & window.speechcapture (vad) & here
    // 2) overwrite with App defaults (according to init.json)
    // 3) overwrite with possible controllers defaults     
    
    mTfCfg            = null;     // hold current configuration (got from json file)
    
    standardTfCfg     = null;     // hold standard  Configuration (obtained from App json, if not present takes them from window.audioinput & window.speechcapture
    oldCfg          = null;     // copied while loading a new model, restored if something fails
    pluginInterface = null;
    plugin_tf     = null;

    vocabulariesFolder  = "";       // AllSpeak/vocabularies

    modelLoaded         = false;
    modelExist          = false;
    modelFolder         = ""        // default - standard - gigi etc...
    modelJsonFile       = ""        // json file containing model info
    
    //modelLabel          = ""        // corresponds to mTfCfg.sLabel....must be unique !!

    //==========================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //==========================================================================
    //
    // PUBLIC ********************************************************************************************************
    init = function(jsonCfg, vocabulariesfolder, plugin)
    {  
        mTfCfg              = jsonCfg;
        standardTfCfg       = jsonCfg;
        oldCfg              = jsonCfg;
        pluginInterface     = plugin;
        
        plugin_tf           = pluginInterface.ENUM.tf;
        plugin_enum         = pluginInterface.ENUM.PLUGIN;
        
        vocabulariesFolder  = vocabulariesfolder;
    };
    
    changeCfg = function(cfg)
    {  
        mTfCfg = getUpdateCfg(cfg);
        return mTfCfg;
    };
     // PUBLIC *************************************************************************************************
    getCfg = function()
    {
        return mTfCfg;
    };    

    // PUBLIC *************************************************************************************************
    // called by any controller pretending to override some default properties 
    getUpdatedCfg = function (ctrlcfg)
    {
        var cfg = standardTfCfg;
        
        if (ctrlcfg != null)
            for (item in ctrlcfg)
                cfg[item] = ctrlcfg[item];
        return cfg;
    };    
    //--------------------------------------------------------------------------
     // PUBLIC *************************************************************************************************
    getLoadedJsonFile = function()
    {
        return modelJsonFile;
    };    
    //  end DEFAULT VALUES MANAGEMENT
    //--------------------------------------------------------------------------
    
    // returns: true | false or catch("NO_FILE")
    // load model json and load it if model.sModelFilePath exist
    loadTFModelPath = function(json_relpath)
    {
        if(json_relpath == modelJsonFile && modelLoaded) return Promise.resolve(true);
        else                                                
        {
            return FileSystemSrv.existFile(json_relpath)
            .then(function(existfile)
            {
                if(existfile)       return _getModel(json_relpath)
                else                return $q.reject("NO_FILE");
            })
            .then(function(voc)
            {
                modelJsonFile = json_relpath;
                return loadTFModel(voc);
            })
            .catch(function(error)
            {
                modelLoaded = false;
                modelFolder = "";
                modelJsonFile = "";            
                return $q.reject(error);
            });          
        }
    }
    
    // returns: true | false or catch("NO_FILE")
    // load NET if model.sModelFileName is valid
    // 
    loadTFModel = function(voc)
    {
        if(voc.sModelFilePath == null || voc.sModelFilePath == "")
            return Promise.resolve(false);
        else
        {
            return FileSystemSrv.existFileResolved(voc.sModelFilePath)
            .then(function(exist)
            {
                if(exist)   return pluginInterface.loadTFModel(voc)
                else        return false;
            })
            .then(function(loaded)
            {  
                modelLoaded = loaded;
                if(loaded)
                {
                    modelFolder     = mTfCfg.sLocalFolder;
                    modelJsonFile   = json_relpath;
                }
                else
                {
                    modelFolder = "";
                    modelJsonFile = "";                
                }
                return loaded;
            })
            .catch(function(error)
            {
                modelLoaded = false;
                modelFolder = "";
                modelJsonFile = "";            
                return $q.reject(error);
            });     
        }
    };    
    
    isModelLoaded = function(vocfolder)
    {
        if(modelLoaded && vocfolder == modelFolder) return true;
        else                                        return false;
    };
    
    _getModel = function(json_relpath)
    {
        oldCfg = mTfCfg;        
        return FileSystemSrv.readJSON(json_relpath)
        .then(function(model)
        {
            if(model.sModelFileName != null && model.sModelFileName)
               model.sModelFilePath    = FileSystemSrv.getResolvedOutDataFolder() + vocabulariesFolder + "/" + model.sLocalFolder + "/" + model.sModelFileName; // file:////storage/.../AllSpeak/vocabularies/GIGI/optimized_user_XXXXXXX_273.json
            
            mTfCfg = model;    
            return mTfCfg;
        })        
        .catch(function(error)
        {
            mTfCfg            = oldCfg;
            return $q.reject(error);
        });        
    };
    //  end DEFAULT VALUES MANAGEMENT
    
    // the crucial params are: sLabel, commands, nProcessingScheme (taken from default)
    createTrainingDataJSON = function(label, localfolder, commandsids, procscheme, modeltype, filepath)
    {
        var train_obj = {};
        train_obj.sLabel                = label;
        train_obj.sLocalFolder          = localfolder;    
        train_obj.commands              = commandsids;
        train_obj.nProcessingScheme     = procscheme;
        train_obj.nModelType            = modeltype;    
        return FileSystemSrv.createFile(filepath, JSON.stringify(train_obj));
    };
    
    getNetTypes = function()
    {
        return [{"label": "SOLO UTENTE", "value": plugin_enum.TF_MODELTYPE_USER}, {"label": "MISTA", "value": plugin_enum.TF_MODELTYPE_USER_FT}];
    };
 
    getPreProcTypes = function()
    {
        return [{"label": "Filtri spettrali", "value": plugin_enum.MFCC_PROCSCHEME_F_S_CTX}, {"label": "Filtri temporali", "value": plugin_enum.MFCC_PROCSCHEME_F_T_CTX}];
    };
    
    
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                    : init,
        changeCfg               : changeCfg, 
        getUpdatedCfg           : getUpdatedCfg, 
        getCfg                  : getCfg, 
        getLoadedJsonFile       : getLoadedJsonFile,
        getNetTypes             : getNetTypes,
        getPreProcTypes         : getPreProcTypes,
        isModelLoaded           : isModelLoaded,
        loadTFModelPath         : loadTFModelPath,
        loadTFModel             : loadTFModel,
        createTrainingDataJSON  : createTrainingDataJSON
    };    
}

main_module.service('TfSrv', TfSrv);
