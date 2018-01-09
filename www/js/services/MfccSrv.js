/*
 * adopt addEventListener model, calling controllers register event listeners to manage results
 */


function MfccSrv(ErrorSrv)
{
    // Management of default values:
    // each time I call : init (mfccCfg)
    // 1) take the values defined in InitAppSrv (according to config.json)
    // 2) overwrite with possible controllers defaults (which are usually tests)              
    mMfccCfg            = null;
    standardMfccCfg     = null;   // hold standard  Configuration (obtained from App json, if not present takes them from window.audioinput & window.speechcapture
    oldCfg              = null;   // copied while loading a new model, restored if something fails
    pluginInterface     = null;
    plugin_enum_mfcc    = null;
    
     // PUBLIC ********************************************************************************************************
    init = function(jsonCfg, plugin)
    {  
        mMfccCfg        = jsonCfg;
        standardMfccCfg = jsonCfg;
        oldCfg          = jsonCfg;
        pluginInterface = plugin;
        
        plugin_enum_mfcc     = pluginInterface.ENUM.mfcc;
    };//
    // PUBLIC ********************************************************************************************************
    setCfg = function(cfg)
    {  
        mMfccCfg = getUpdateCfg(cfg);
        return mMfccCfg;
    };
    //--------------------------------------------------------------------------
     // PUBLIC *************************************************************************************************
    getCfg = function()
    {
        return mMfccCfg;
    };     

    // called by any controller pretending to get an overriden copy of the standard model params
    getUpdatedStandardCfgCopy = function (ctrlcfg)
    {
        var cfg = cloneObj(standardMfccCfg);
        
        if (ctrlcfg != null)
            for (item in ctrlcfg)
                cfg[item] = ctrlcfg[item];
        return cfg;
    };    
  
    // called by any controller pretending to get an overriden copy of the currently loaded model
    getUpdatedCfgCopy = function (ctrlcfg)
    {
        if(mMfccCfg == null)
        {
            console.log("warning in MfccSrv::getUpdatedStandardCfgCopy...mMfccCfg is null")
            return null;
        }
        
        var cfg = cloneObj(mMfccCfg);
        
        if (ctrlcfg != null)
            for (item in ctrlcfg)
                cfg[item] = ctrlcfg[item];
        return cfg;
    };
    
    //==========================================================================
    // M F C C
    //==========================================================================
    // NOTE :   If calculated, the 0-th coefficient is added to the end of the vector (for compatibility with HTK).     
    //          all methods call the same API : successCB, errorCB, mfcc_params, source, datatype, origintype, write, outputpath_noext
    // here the 3 calls are still divided to better manage the callbacks.

    // PUBLIC ******************************************************************************************************
    getMFCCFromData = function(data_array, data_type, data_dest, overwrite, filepath_noext)
    {
       
        if (data_array == null || !data_array.length)
        {
            ErrorSrv.raiseError(_errorCB, "MfccSrv::getMFCCFromData input data_array is null");
            return null;
        }
        
        if(_checkParams(data_type, pluginInterface.ENUM.PLUGIN)*_checkParams(data_dest, pluginInterface.ENUM.PLUGIN))
        {
            var currCfg         = cloneObj(mMfccCfg);
            currCfg.nDataType   = data_type;
            currCfg.nDataDest   = data_dest;
            currCfg.nDataOrig   = pluginInterface.ENUM.PLUGIN.MFCC_DATAORIGIN_JSONDATA;            
            
            return pluginInterface.getMFCC(currCfg, data_array, overwrite, filepath_noext);
        } 
        else
        {
            ErrorSrv.raiseError(null, "ERROR in MfccSrv::getMFCCFromData. one of the input params (" +  data_type.toString() + "|" + data_dest.toString() + ") is wrong");
            return false;
        }
    };
    // PUBLIC *****************************************************************************************************
    // caller (usually a controller) make 3 addEventListener (mfccprogressfile, mfccprogressfolder, pluginerror)
    getMFCCFromFile = function(relpath_noext, data_type, data_dest, overwrite)
    {
        if(relpath_noext == null || !relpath_noext.length)
        {
            ErrorSrv.raiseError(_errorCB, "MfccSrv::getMFCCFromFile input relpath is null");
            return null;
        }
        
        if(_checkParams(data_type, pluginInterface.ENUM.PLUGIN)*_checkParams(data_dest, pluginInterface.ENUM.PLUGIN))
        {
            var currCfg         = cloneObj(mMfccCfg);
            currCfg.nDataType   = data_type;
            currCfg.nDataDest   = data_dest;
            currCfg.nDataOrig   = pluginInterface.ENUM.PLUGIN.MFCC_DATAORIGIN_FILE;            
            
            return pluginInterface.getMFCC(currCfg, relpath_noext, overwrite);
        } 
        else
        {
            ErrorSrv.raiseError(null, "ERROR in MfccSrv::getMFCCFromFile. one of the input params (" +  data_type.toString() + "|" + data_dest.toString() + ") is wrong");
            return false;
        }
    };
    // PUBLIC *****************************************************************************************************
    // caller (usually a controller) make 3 addEventListener (mfccprogressfile, mfccprogressfolder, pluginerror)
    getMFCCFromFolder = function(relpath_noext, data_type, data_dest, proc_scheme, overwrite)
    {
        if(relpath_noext == null || !relpath_noext.length)
        {
            ErrorSrv.raiseError(_errorCB, "MfccSrv::getMFCCFromFolder input relpath is null");
            return null;
        }
        
        if(_checkParams(data_type, pluginInterface.ENUM.PLUGIN)*_checkParams(data_dest, pluginInterface.ENUM.PLUGIN)*_checkParams(proc_scheme, pluginInterface.ENUM.PLUGIN))
        {
            var currCfg                 = cloneObj(mMfccCfg);
            currCfg.nDataType           = data_type;
            currCfg.nDataDest           = data_dest;
            currCfg.nProcessingScheme   = proc_scheme;
            currCfg.nDataOrig           = pluginInterface.ENUM.PLUGIN.MFCC_DATAORIGIN_FOLDER;            
            
            return pluginInterface.getMFCC(currCfg, relpath_noext, overwrite);
        } 
        else
        {
            ErrorSrv.raiseError(null, "ERROR in MfccSrv::getMFCCFromFolder. one of the input params (" +  data_type.toString() + "|" + data_dest.toString() + ") is wrong");
            return false;
        }
    };
    //==========================================================================
    _checkParams = function(value, container_object)
    {
        for (i in container_object) if(container_object[i] == value) return 1;
        return 0;        
    };
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                        : init,
        setCfg                      : setCfg, 
        getUpdatedCfgCopy           : getUpdatedCfgCopy, 
        getUpdatedStandardCfgCopy   : getUpdatedStandardCfgCopy, 
        getCfg                      : getCfg, 
        getMFCCFromData             : getMFCCFromData,
        getMFCCFromFile             : getMFCCFromFile,
        getMFCCFromFolder           : getMFCCFromFolder
    };    
}
main_module.service('MfccSrv', MfccSrv);
