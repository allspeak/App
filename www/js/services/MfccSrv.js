/*
 * once activated, detect voice onset & offset 
 */


function MfccSrv(ErrorSrv, InitAppSrv)
{
    // Management of default values:
    // each time I call : init (mfccCfg)
    // 1) take the values defined in InitAppSrv (according to config.json)
    // 2) overwrite with possible controllers defaults (which are usually tests)              
    Cfg                     = {};
    Cfg.mfccCfg             = null;
    
    _successCB              = null  // used by mfcc
    _errorCB                = null; // used by all the processes
    
    // PUBLIC ********************************************************************************************************
    init = function(mfccCfg)
    {  
        pluginInterface         = InitAppSrv.getPlugin();
        plugin_enum             = pluginInterface.ENUM.PLUGIN;
        
        Cfg.mfccCfg             = InitAppSrv.getMfccCfg(mfccCfg);
        return Cfg;
    };
     // PUBLIC *************************************************************************************************
   getCfg = function()
    {
        return Cfg.mfccCfg;
    };    
    
    //==========================================================================
    // M F C C
    //==========================================================================
    // NOTE :   If calculated, the 0-th coefficient is added to the end of the vector (for compatibility with HTK).     
    //          all methods call the same API : successCB, errorCB, mfcc_params, source, datatype, origintype, write, outputpath_noext
    // here the 3 calls are still divided to better manage the callbacks.

    // PUBLIC ******************************************************************************************************
    getMFCCFromData = function(successCB, errorCB, data_array, data_type, data_dest, filepath_noext)
    {
        _successCB  = successCB;
        _errorCB    = errorCB;
        
        if (data_array == null || !data_array.length)
        {
            ErrorSrv.raiseError(_errorCB, "MfccSrv::getMFCCFromData input data_array is null");
            return null;
        }
        
        if(_checkParams(data_type, plugin_enum)*_checkParams(data_dest, plugin_enum))
        {
            var currCfg         = Cfg.mfccCfg;
            currCfg.nDataType   = data_type;
            currCfg.nDataDest   = data_dest;
            currCfg.nDataOrig   = plugin_enum.MFCC_DATAORIGIN_JSONDATA;            
            
            pluginInterface.getMFCC(currCfg, data_array, filepath_noext);
            return true;
        } 
        else{
            erroCB("ERROR in MfccSrv: one of the input params (" +  data_type.toString() + "|" + data_origin.toString() + "|" + data_dest.toString() + ") is wrong")
            return false;
        }
    };
    // PUBLIC *****************************************************************************************************
    getMFCCFromFile = function(relpath_noext, data_type, data_dest)
    {
        if(relpath_noext == null || !relpath_noext.length)
        {
            ErrorSrv.raiseError(_errorCB, "MfccSrv::getMFCCFromFile input relpath is null");
            return null;
        }
        
        if(_checkParams(data_type, plugin_enum)*_checkParams(data_dest, plugin_enum))
        {
            var currCfg         = Cfg.mfccCfg;
            currCfg.nDataType   = data_type;
            currCfg.nDataDest   = data_dest;
            currCfg.nDataOrig   = plugin_enum.MFCC_DATAORIGIN_FILE;            
            
            pluginInterface.getMFCC(currCfg, relpath_noext);
            return true;
        } 
        else
        {
            erroCB("ERROR in MfccSrv: one of the input params (" +  data_type.toString() + "|" + data_origin.toString() + "|" + data_dest.toString() + ") is wrong");
            return false;
        }
    };
    // PUBLIC *****************************************************************************************************
    getMFCCFromFolder = function(relpath_noext, data_type, data_dest)
    {
        if(relpath_noext == null || !relpath_noext.length)
        {
            ErrorSrv.raiseError(_errorCB, "MfccSrv::getMFCCFromFolder input relpath is null");
            return null;
        }
        
        if(_checkParams(data_type, plugin_enum)*_checkParams(data_dest, plugin_enum))
        {
            var currCfg         = Cfg.mfccCfg;
            currCfg.nDataType   = data_type;
            currCfg.nDataDest   = data_dest;
            currCfg.nDataOrig   = plugin_enum.MFCC_DATAORIGIN_FOLDER;            
            
            pluginInterface.getMFCC(currCfg, relpath_noext);
            return true;
        } 
        else
            {
            erroCB("ERROR in MfccSrv: one of the input params (" +  data_type.toString() + "|" + data_dest.toString() + ") is wrong");
            return false;
        }
    };
  
    _onMFCCSuccess = function(mfcc){
        _successCB(mfcc);
//        _successCB  = null;
    };
    
    _onMFCCError = function(error, string){
        ErrorSrv.raiseError(_errorCB, "MfccSrv::_onMFCCError ", error);
        _errorCB    = null;
    };

    //==========================================================================
    _checkParams = function(value, container_object)
    {
        for (i in container_object) {
            if (container_object[i] == value) return 1;
        }
        return 0;        
    };
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                : init,
        getCfg              : getCfg, 
        getMFCCFromData     : getMFCCFromData,
        getMFCCFromFile     : getMFCCFromFile,
        getMFCCFromFolder   : getMFCCFromFolder
    };    
}

main_module.service('MfccSrv', MfccSrv);
