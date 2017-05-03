/*
 * once activated, detect voice onset & offset 
 */


function MfccSrv(ErrorSrv, InitAppSrv)
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
    Cfg.mfccCfg             = null;
    
    dataTypes               = {};
    
    // hold standard Capture Configuration (obtained from App json, if not present takes them from window.audioinput & window.speechcapture
    standardMfccCfg         = null;     

    _successCB              = null  // used by mfcc
    _errorCB                = null; // used by all the processes
    
    //==========================================================================
    // DEFAULT CONFIG VALUES MANAGEMENT
    //==========================================================================
    //
    // PUBLIC ********************************************************************************************************
    init = function(mfccCfg)
    {  
        pluginInterface = eval(pluginInterfaceName);
        plugin_enum     = pluginInterface.ENUM.mfcc;
        
        dataTypes.DATATYPE     = plugin_enum.DATATYPE;
        dataTypes.DATAORIGIN   = plugin_enum.DATAORIGIN;
        dataTypes.DATADEST     = plugin_enum.DATADEST;            
        
        var cfg = _setMfccCfg(mfccCfg);
        return {
                mfccCfg         : cfg, 
                dataTypes       : dataTypes
               };
    };
    //--------------------------------------------------------------------------
    // receive some cfg params and overwrite the standard values, returns full cfg object    
    _setMfccCfg = function (mfccCfg)
    {
        Cfg.mfccCfg = _getStandardMfccCfg();
        
        if (mfccCfg != null)
        {
            for (var item in mfccCfg)
                Cfg.mfccCfg[item] = mfccCfg[item];
        }        
        return Cfg.mfccCfg;
    };    

    // first defaults from HERE DEFINED CONSTANT, then from App json
    _getStandardMfccCfg = function()
    {
        if(standardMfccCfg == null) standardMfccCfg = plugin_enum.DEFAULT;
        
        // InitAppSrv.appData could be modified at runtime
        if(InitAppSrv.appData.mfcc != null)
        {
            for (var item in InitAppSrv.appData.mfcc)
                standardMfccCfg[item] = InitAppSrv.appData.mfcc[item];
        }        
        return standardMfccCfg;
    };

     // PUBLIC *************************************************************************************************
   getCfg = function()
    {
        return Cfg.mfccCfg;
    };    
    //  end DEFAULT VALUES MANAGEMENT
 
    //==========================================================================
    //==========================================================================
    // M F C C
    //==========================================================================
    //==========================================================================
    // NOTE :   If calculated, the 0-th coefficient is added to the end of the vector (for compatibility with HTK).     
    //          all methods call the same API : successCB, errorCB, mfcc_params, source, datatype, origintype, write, outputpath_noext
    
    // here the 3 calls are still divided to better manage the callbacks.
    // 
    // 
    // PUBLIC ******************************************************************************************************
//    getMFCCFromData = function(successCB, errorCB, data_array, data_type, data_origin, data_dest, filepath_noext)
    getMFCCFromData = function(successCB, errorCB, data_array, data_type, data_dest, filepath_noext)
    {
        _successCB  = successCB;
        _errorCB    = errorCB;
        
        if (data_array == null || !data_array.length)
        {
            ErrorSrv.raiseError(_errorCB, "MfccSrv::getMFCCFromData input data_array is null");
            return null;
        }
        
//        if(_checkParams(data_type, dataTypes.DATATYPE)*_checkParams(data_origin, dataTypes.DATAORIGIN)*_checkParams(data_dest, dataTypes.DATADEST))
        if(_checkParams(data_type, dataTypes.DATATYPE)*_checkParams(data_dest, dataTypes.DATADEST))
        {
            var currCfg         = Cfg.mfccCfg;
            currCfg.nDataType   = data_type;
            currCfg.nDataDest   = data_dest;
            currCfg.nDataOrig   = dataTypes.DATAORIGIN.JSONDATA;            
            
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
        
        if(_checkParams(data_type, dataTypes.DATATYPE)*_checkParams(data_dest, dataTypes.DATADEST))
        {
            var currCfg         = Cfg.mfccCfg;
            currCfg.nDataType   = data_type;
            currCfg.nDataDest   = data_dest;
            currCfg.nDataOrig   = dataTypes.DATAORIGIN.FILE;            
            
//            pluginInterface.getMFCC( _onMFCCSuccess, _onMFCCError, currCfg, relpath_noext);
            pluginInterface.getMFCC(currCfg, relpath_noext);
            return true;
        } 
        else{
            erroCB("ERROR in MfccSrv: one of the input params (" +  data_type.toString() + "|" + data_origin.toString() + "|" + data_dest.toString() + ") is wrong");
            return false;
        }
    };
    // PUBLIC *****************************************************************************************************
//    getMFCCFromFolder = function(successCB, errorCB, relpath_noext, data_type, data_origin, data_dest)
//    getMFCCFromFolder = function(successCB, errorCB, relpath_noext, data_type, data_dest)
    getMFCCFromFolder = function(relpath_noext, data_type, data_dest)
    {
//        _successCB  = successCB;
//        _errorCB    = errorCB;
        
        if(relpath_noext == null || !relpath_noext.length)
        {
            ErrorSrv.raiseError(_errorCB, "MfccSrv::getMFCCFromFolder input relpath is null");
            return null;
        }
        
        if(_checkParams(data_type, dataTypes.DATATYPE)*_checkParams(data_dest, dataTypes.DATADEST))
        {
            var currCfg         = Cfg.mfccCfg;
            currCfg.nDataType   = data_type;
            currCfg.nDataDest   = data_dest;
            currCfg.nDataOrig   = dataTypes.DATAORIGIN.FOLDER;            
            
//            pluginInterface.getMFCC( _onMFCCSuccess, _onMFCCError, currCfg, relpath_noext);
            pluginInterface.getMFCC(currCfg, relpath_noext);
            return true;
        } 
        else{
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
