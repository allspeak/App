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
    tfCfg         = null;
    modelJson    = ""       // json file containing model info
    modelLabel    = ""      // corresponds to tfCfg.sLabel....must be unique !!
    standardTfCfg = null;   // hold standard TF Configuration (obtained from App json, if not present takes them from window.audioinput & window.speechcapture
    oldTfCfg = null;        // copied while loading a new model, restored if something fails
    modelsFolder = "";
    
    //==========================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //==========================================================================
    //
    // PUBLIC ********************************************************************************************************
    init = function(jsonTfCfg, modelsfolder, modeljson, plugin)
    {  
        standardTfCfg   = jsonTfCfg;
        modelsFolder    = modelsfolder;
        modelJson       = modeljson;
        pluginInterface = plugin;
        plugin_enum     = pluginInterface.ENUM.tf;
    };
    
    change = function(tfCfg)
    {  
        tfCfg = getUpdateCfg(tfCfg);
        return {tfCfg : tfCfg };
    };
    //--------------------------------------------------------------------------
     // PUBLIC *************************************************************************************************
   getCfg = function()
    {
        return tfCfg;
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
        oldTfCfg = tfCfg;        
        return FileSystemSrv.readJSON(model_relpath)
        .then(function(model)
        {
            model.sModelFilePath = FileSystemSrv.getResolvedOutDataFolder() + modelsFolder + "/" + model.sModelFilePath;
            tfCfg = model;    
            return tfCfg;
        })        
        .catch(function(error)
        {
            tfCfg = oldTfCfg;
            return $q.reject(error);
        })        
    };
    //  end DEFAULT VALUES MANAGEMENT

    getUpdateCfg = function (tfCfg)
    {
        var cfg = standardTfCfg;
        
        if (tfCfg != null)
        {
            for (item in tfCfg)
                cfg[item] = tfCfg[item];
        }        
        return cfg;
    };   
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                : init,
        change              : change,
        getCfg              : getCfg,
        getLoadedJsonFile   : getLoadedJsonFile,
        loadTFModel         : loadTFModel
    };    
}

main_module.service('TfSrv', TfSrv);
