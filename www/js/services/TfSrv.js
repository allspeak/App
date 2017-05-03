/*
 * once activated, detect voice onset & offset 
 */


function TfSrv(ErrorSrv, InitAppSrv)
{
    // reference to the plugin js interface
    pluginInterfaceName   = InitAppSrv.appData.plugin_interface_name;
    pluginInterface       = null;
    
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
        pluginInterface = eval(pluginInterfaceName);
        plugin_enum     = pluginInterface.ENUM.tf;
   
        
        var cfg = _setTfCfg(tfCfg);
        return {
                tfCfg         : cfg
               };
    };
    //--------------------------------------------------------------------------
    // receive some cfg params and overwrite the standard values, returns full cfg object    
    _setTfCfg = function (tfCfg)
    {
        Cfg.tfCfg = _getStandardTfCfg();
        
        if (tfCfg != null)
        {
            for (var item in tfCfg)
                Cfg.tfCfg[item] = tfCfg[item];
        }        
        return Cfg.tfCfg;
    };    

    // first defaults from HERE DEFINED CONSTANT, then from App json
    _getStandardTfCfg = function()
    {
        if(standardTfCfg == null) standardTfCfg = plugin_enum.DEFAULT;
        
        // InitAppSrv.appData could be modified at runtime
        if(InitAppSrv.appData.tf != null)
        {
            for (var item in InitAppSrv.appData.tf)
                standardTfCfg[item] = InitAppSrv.appData.tf[item];
        }        
        return standardTfCfg;
    };

     // PUBLIC *************************************************************************************************
   getCfg = function()
    {
        return Cfg.tfCfg;
    };    
    //  end DEFAULT VALUES MANAGEMENT

    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                : init,
        getCfg              : getCfg
    };    
}

main_module.service('TfSrv', TfSrv);
