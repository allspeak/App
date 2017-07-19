/*
 * once activated, detect voice onset & offset 
 */


function TfSrv(ErrorSrv, InitAppSrv, FileSystemSrv)
{
    // Management of default values:
    // each time I call : init (captureCfg, captureProfile, output_chunks, vadCfg, mfccCfg)
    // 1) take the values defined in window.audioinput (capture) & window.speechcapture (vad) & here
    // 2) overwrite with App defaults (according to init.json)
    // 3) overwrite with possible controllers defaults                 
    Cfg                     = {};
    Cfg.tfCfg               = null;
    
    // hold standard Capture Configuration (obtained from App json, if not present takes them from window.audioinput & window.speechcapture
    standardTfCfg           = null;     
    
    //==========================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //==========================================================================
    //
    // PUBLIC ********************************************************************************************************
    init = function(tfCfg)
    {  
        pluginInterface = InitAppSrv.getPlugin();
        plugin_enum     = pluginInterface.ENUM.tf;
   
        
        Cfg.tfCfg       = InitAppSrv.getTfCfg(tfCfg);
        return {
                tfCfg         : Cfg.tfCfg
               };
    };
    //--------------------------------------------------------------------------
     // PUBLIC *************************************************************************************************
   getCfg = function()
    {
        return Cfg.tfCfg;
    };    
    //  end DEFAULT VALUES MANAGEMENT
    //--------------------------------------------------------------------------
     // PUBLIC *************************************************************************************************
    checkModel = function(model_relpath)
    {
        return pluginInterface.loadTFModel(FileSystemSrv.getResolvedOutDataFolder() + model_relpath);
    };    
    //  end DEFAULT VALUES MANAGEMENT

    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                : init,
        getCfg              : getCfg,
        checkModel          : checkModel
    };    
}

main_module.service('TfSrv', TfSrv);
