/*
 * once activated, detect voice onset & offset 
 */


function TfSrv(FileSystemSrv, $q)
{
    // Management of default values:
    // each time I call : init (captureCfg, captureProfile, output_chunks, vadCfg, mfccCfg)
    // 1) take the values defined in window.audioinput (capture) & window.speechcapture (vad) & here
    // 2) overwrite with App defaults (according to init.json)
    // 3) overwrite with possible controllers defaults                 
    mCfg            = null;     // hold current configuration (got from json file)
    standardCfg     = null;     // hold standard  Configuration (obtained from App json, if not present takes them from window.audioinput & window.speechcapture
    oldCfg          = null;     // copied while loading a new model, restored if something fails
    pluginInterface = null;
    plugin_enum     = null;


    modelJson       = ""       // json file containing model info
    modelLabel      = ""      // corresponds to mCfg.sLabel....must be unique !!
    modelsFolder    = "";
    
    //==========================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //==========================================================================
    //
    // PUBLIC ********************************************************************************************************
    init = function(jsonCfg, modelsfolder, modeljson, plugin)
    {  
        mCfg            = jsonCfg;
        standardCfg     = jsonCfg;
        oldCfg          = jsonCfg;
        pluginInterface = plugin;
        
        plugin_enum     = pluginInterface.ENUM.tf;
        
        modelsFolder    = modelsfolder;
        modelJson       = modeljson;
    };
    
    changeCfg = function(cfg)
    {  
        mCfg = getUpdateCfg(cfg);
        return mCfg;
    };
     // PUBLIC *************************************************************************************************
    getCfg = function()
    {
        return mCfg;
    };    

    // PUBLIC *************************************************************************************************
    // called by any controller pretending to override some default properties 
    getUpdatedCfg = function (ctrlcfg)
    {
        var cfg = standardCfg;
        
        if (ctrlcfg != null)
            for (item in ctrlcfg)
                cfg[item] = ctrlcfg[item];
        return cfg;
    };    
    //--------------------------------------------------------------------------
     // PUBLIC *************************************************************************************************
   getLoadedJsonFile = function()
    {
        return modelJson;
    };    
    //  end DEFAULT VALUES MANAGEMENT
    //--------------------------------------------------------------------------
     // PUBLIC *************************************************************************************************
    loadTFModel = function(model_relpath)
    {
        if(model_relpath == null)   model_relpath = modelsFolder + "/" + modelJson;
        return _getModel(model_relpath)
        .then(function(model)
        {     
            return pluginInterface.loadTFModel(model);
        })
        .catch(function(error)
        {
            return $q.reject(error);
        })        
    };    
    
    _getModel = function(model_relpath)
    {
        oldCfg = mCfg;        
        return FileSystemSrv.readJSON(model_relpath)
        .then(function(model)
        {
            model.sModelFilePath = FileSystemSrv.getResolvedOutDataFolder() + modelsFolder + "/" + model.sModelFilePath;
            model.localModelPath = model_relpath;
            mCfg = model;    
            return mCfg;
        })        
        .catch(function(error)
        {
            mCfg = oldCfg;
            return $q.reject(error);
        })        
    };
    //  end DEFAULT VALUES MANAGEMENT
    
    // the crucial params are: sLabel, vocabulary, nProcessingScheme (taken from default)
    createTrainingDataJSON = function(train_obj, filepath)
    {
        var tf      = getUpdatedCfg(train_obj);
        return FileSystemSrv.createFile(filepath, JSON.stringify(tf));
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
        loadTFModel             : loadTFModel,
        createTrainingDataJSON  : createTrainingDataJSON
    };    
}

main_module.service('TfSrv', TfSrv);
