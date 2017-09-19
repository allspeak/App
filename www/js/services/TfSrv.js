/*
 * once activated, detect voice onset & offset 
 */


function TfSrv(FileSystemSrv)
{
    // Management of default values:
    // each time I call : init (captureCfg, captureProfile, output_chunks, vadCfg, mfccCfg)
    // 1) take the values defined in window.audioinput (capture) & window.speechcapture (vad) & here
    // 2) overwrite with App defaults (according to init.json)
    // 3) overwrite with possible controllers defaults                 
    tfCfg         = null;
    
    // hold standard Capture Configuration (obtained from App json, if not present takes them from window.audioinput & window.speechcapture
    standardTfCfg = null;    
    modelsFolder = "";
    
    //==========================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //==========================================================================
    //
    // PUBLIC ********************************************************************************************************
    init = function(jsonTfCfg, modelsfolder, plugin)
    {  
        standardTfCfg   = jsonTfCfg;
        modelsFolder    = modelsfolder;
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
    //  end DEFAULT VALUES MANAGEMENT
    //--------------------------------------------------------------------------
     // PUBLIC *************************************************************************************************
    loadTFModel = function(model_relpath)
    {
        return FileSystemSrv.readJSON(model_relpath)
        .then(function(model)
        {   
            model.sModelFilePath = FileSystemSrv.getResolvedOutDataFolder() + modelsFolder + "/" + model.sModelFilePath;
            return pluginInterface.loadTFModel(model);
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
        loadTFModel         : loadTFModel
    };    
}

main_module.service('TfSrv', TfSrv);
