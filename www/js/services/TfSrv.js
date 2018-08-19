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

function TfSrv(FileSystemSrv, $q, ErrorSrv, UITextsSrv)
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
    // PRESENTLY UNUSED !!!!
    loadTFNetPath = function(json_relpath, force)
    {
        if(force == null)   force = false;
           
        if(json_relpath == modelJsonFile && modelLoaded && !force) return Promise.resolve(true);
        else                                                
        {
            return FileSystemSrv.existFile(json_relpath)
            .then(function(existfile)
            {
                if(existfile)       return FileSystemSrv.readJSON(json_relpath);
                else                return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST, message:"TfSrv::loadTFNetPath : NO_FILE " + json_relpath});
            })
            .then(function(voc)
            {
                modelJsonFile = json_relpath;
                return loadTFNet(voc);
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
    loadTFNet = function(net)
    {
        var localfolder = net.sLocalFolder;
        if(net.sModelFilePath == null || net.sModelFilePath == "")
            return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.MODELFILEVARIABLE_EMPTY, message:"Model pb path is null"});
        else
        {
            return FileSystemSrv.existFileResolved(net.sModelFilePath)      // #ISSUE# if there is an error in existFileResolved, the catch below is not triggered
            .then(function(exist)
            {
                if(exist)   return pluginInterface.loadTFNet(net)
                else        return $q.reject({mycode:ErrorSrv.ENUMS.VOCABULARY.MODELFILE_NOTEXIST, message:"Model pb is not present"} );
            })
            .then(function(loaded)
            {  
                modelLoaded = localfolder;
                if(loaded)    mTfCfg     = net;
                else
                {
                    mTfCfg          = null;
                    modelJsonFile   = "";                
                }
                return modelLoaded;
            })
            .catch(function(error)
            {
                if(error.mycode == null)    error.mycode = ErrorSrv.ENUMS.VOCABULARY.LOADTFMODEL
                
                modelLoaded     = false;
                mTfCfg          = null;
                modelJsonFile   = "";  
                return $q.reject(error);
            });     
        }
    };    
    
    // test if the TFmodel pointed by the given net is correct
    // load it, check if ok, then load back to current one
    // doesn't change the mTfCfg
    // returns: string or reject
    testNewTFModel = function(net)
    {
        if(net.sModelFilePath == null || net.sModelFilePath == "")
            return $q.reject({mycode:ErrorSrv.ENUMS.VOCABULARY.MODELFILEVARIABLE_EMPTY, message:"Model pb path is null"});

        var loadnew         = true;
        var isnewmodelvalid = false;
         
        return FileSystemSrv.existFileResolved(net.sModelFilePath)      // #ISSUE# if there is an error in existFileResolved, the catch below is not triggered
        .then(function(exist)
        {
            if(exist)   return pluginInterface.loadTFNet(net)
            else        return $q.reject({mycode:ErrorSrv.ENUMS.VOCABULARY.MODELFILE_NOTEXIST, message:"Model pb is not present"} );
        })
        .then(function()
        {  
            loadnew = false;
            if(mTfCfg)  return loadTFNet(mTfCfg);     // reload current net if exist
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
                if(mTfCfg)
                {
                    return loadTFNet(mTfCfg)
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
    createSubmitDataJSON = function(label, localfolder, commandsids, procscheme, modelclass, modeltype, initsessid, filepath)
    {
        
        var train_obj = {};
        train_obj.sLabel                = label + " " + getNetLabelByType(modeltype);
        train_obj.sLocalFolder          = localfolder;    
        train_obj.commands              = commandsids;
        train_obj.nProcessingScheme     = procscheme;
        train_obj.nModelClass           = modelclass;
        train_obj.nModelType            = modeltype;
        train_obj.init_sessionid        = initsessid;    
        return FileSystemSrv.createFile(filepath, JSON.stringify(train_obj));
    };
    
    // set device path of the downloaded net
    // first is in a temp session (e.g : vocabularies/gigi/train_XXXXXX)
    // then, when accepted, it gets vocabularies/gigi
    // called by: ManageTrainingCtr::checkSession
    // all the downloaded model pass from here.

    fixTfModel = function(voc, tempsession)
    {
        if(voc.status)  delete voc.status;
        voc.nDataDest               = standardTfCfg.nDataDest;   
        
        if(tempsession)
            voc.sModelFilePath      = FileSystemSrv.getResolvedOutDataFolder() + vocabulariesFolder + "/" + voc.sLocalFolder + "/" + tempsession + "/" + voc.sModelFileName + ".pb";  
        else
            voc.sModelFilePath      = FileSystemSrv.getResolvedOutDataFolder() + vocabulariesFolder + "/" + voc.sLocalFolder + "/" + voc.sModelFileName + ".pb";  
        return voc;
    };
 
    getNetLabelByType = function(modeltype)
    {
        switch(modeltype)
        {
            case plugin_enum_tf.TF_MODELTYPE_COMMON:
                return UITextsSrv.TRAINING.models.labelC;
            case plugin_enum_tf.TF_MODELTYPE_USER:
                return UITextsSrv.TRAINING.models.labelPU;
            case plugin_enum_tf.TF_MODELTYPE_USER_ADAPTED:
                return UITextsSrv.TRAINING.models.labelPUA;
            case plugin_enum_tf.TF_MODELTYPE_COMMON_ADAPTED:
                return UITextsSrv.TRAINING.models.labelCA;
            case plugin_enum_tf.TF_MODELTYPE_USER_READAPTED:
                return UITextsSrv.TRAINING.models.labelPURA;
            case plugin_enum_tf.TF_MODELTYPE_COMMON_READAPTED:
                return UITextsSrv.TRAINING.models.labelCRA;
            default:
                alert("ERROR: unexpected modeltype in TfSrv::getNetLabelByType");
                return "UNSPECIFIED";
        }
    };
    
    //=========================================================================
    // returns ENUMS
    //=========================================================================
    getNetTypes = function()
    {
        return [{"label": "SOLO UTENTE"         ,"label2": "UTENTE"         , "value": plugin_enum_tf.TF_MODELTYPE_USER},
                {"label": "ADATTA SOLO UTENTE"  ,"label2": "UTENTE"         , "value": plugin_enum_tf.TF_MODELTYPE_USER_ADAPTED},
                {"label": "ADATTA COMUNE"       ,"label2": "COMUNE ADATTATA", "value": plugin_enum_tf.TF_MODELTYPE_COMMON_ADAPTED}, 
                {"label": "RI-ADATTA UTENTE"    ,"label2": "UTENTE"         , "value": plugin_enum_tf.TF_MODELTYPE_USER_READAPTED},
                {"label": "RI-ADATTA COMUNE"    ,"label2": "COMUNE ADATTATA", "value": plugin_enum_tf.TF_MODELTYPE_COMMON_READAPTED}];
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
        isModelLoaded               : isModelLoaded,
        loadTFNetPath               : loadTFNetPath,
        loadTFNet                   : loadTFNet,
        fixTfModel                  : fixTfModel,
        testNewTFModel              : testNewTFModel,
        createSubmitDataJSON        : createSubmitDataJSON
    };    
}
main_module.service('TfSrv', TfSrv);