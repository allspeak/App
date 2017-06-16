/* Service which initializes the App:
 * 1)   load www/json/defaults.json containing all App defauls values...the most important is the path to the data.json file, containing appConfig & defaults
 * 2)   init file system:
 *          create (if not existent): the folder containing the sentences' audio
 *                                  : the temp audio folder
 *                                  : the json folder
 *                                  : check if data.json exist in file:// , YES: read it, NO: create it, saving the content of the default file into the json folder (in order to update its content and modify scores
 *                                  : create an empty vocabulary file
 * 3)   read vocabulary json file
 * 4)   check if the vocabulary items have their audio files, update json
 * 5)   find bluetooth input, set it
 * 6)   if assisted => login server, post stats/measures, get instructions
 */


/* AUDIO PARAMS MANAGEMENT
 * 
 * Audio params (capture, vad, mfcc, tf) are managed according to the following principles:
 * App Configuration json file (config.json) contain two sections defining both current and default values for all these params.
 * current params session can be edited by the user (or the App itself). Default one are read-only and are used to override the current ones.
 * In principle only the VAD params will be really edited by the user, but the mechanism was implemented for all of them.
 * InitAppSrv 
 */


function InitAppSrv($http, $q, VocabularySrv, FileSystemSrv, HWSrv, RemoteSrv)
{
    var service                     = {}; 
    service.default_json_www_path   = "./json/defaults.json";
    
    service.initConfigStructure = function()
    {
        service.config                  = {};
        service.config.appConfig        = {};
        service.config.appConfig.file_system            = {};
        service.config.appConfig.audio_configurations   = {};
        service.config.appConfig.bluetooth              = {};
        service.config.appConfig.remote                 = {};
        service.config.appConfig.device                 = {};
        
        service.config.defaults         = {};        
    };
    service.initConfigStructure();    
    
    //====================================================================================================================
    service.init = function()
    {
        return service.loadDefaults()
        .then( function() {
            return service.initFileSystem(service.config.defaults.file_system);
        })
        .then( function() {
            return service.getVocabulary(service.config.defaults.file_system.vocabulary_filerel_path);
        })
        .then( function() {
            return service.checkAudioPresence();
        })
        .then( function() {
            return service.connectBluetoothDevices(service.config.appConfig.blt_devices);
        })
        .then( function(blt_conn_res){
            if ( service.config.appConfig.assisted)
                return service.loginServer(service.config.appConfig.remote);
            else
                return 1;
        })
        .then( function(success){
            // manage login errors
            return 1;
        })
        .catch(function(error){
            return $q.reject(error);
        });
    };
    //====================================================================================================================
    // load json containing defaults info
    service.loadDefaults = function()
    {
        // read www/json/defaults.json 
        return $http.get(service.default_json_www_path)
        .then(function(res){
            service.config.defaults = res.data.defaults;       
            return service.config;
        });        
    }; 
    //---------------------------------------------------------------------------------------------------------------------
    // create (if not existent) the App folder and its audio sentence and json subfolders 
    // and the subjects and vocabulary files
    service.initFileSystem = function(default_file_system)
    {
        FileSystemSrv.setUnresolvedOutDataFolder(default_file_system.output_data_root);
            return FileSystemSrv.createDir(default_file_system.app_folder, false)
        .then(function(){        
            return FileSystemSrv.createDir(default_file_system.audio_folder, false);
        })
        .then(function(){
            return FileSystemSrv.createDir(default_file_system.audio_temp_folder, true);
        })
        .then(function(){
            return FileSystemSrv.createDir(default_file_system.json_folder, false);
        })
        .then(function(){
            // create, if absent, the file:///externalRootDirectory/app_folder/json/data.json otherwise read its content
            return service.checkConfigFile(default_file_system.config_filerel_path);
        })
        .then(function(){
            // create, if absent, the file:///externalRootDirectory/app_folder/json/vocabulary.json otherwise read its content
            return service.createVocabularyFile(default_file_system.vocabulary_filerel_path, default_file_system.vocabulary_www_path);
        })
        .catch(function(error){
            return $q.reject(error);
        });        
    };     

    // if config.json is not present in file:/// , create it
    service.checkConfigFile = function(config_filerel_path)
    {
        return FileSystemSrv.existFile(config_filerel_path)
        .then(function(exist)
        {
            if(exist)
            {
                service.config.appConfig.device = HWSrv.getDevice();
                return 1;
            }
            else
            {
                // file://.../config.json file does not exist, copy defaults subfields to appConfig subfields 
                service.fillAppConfig();
                var confString = JSON.stringify(service.config);
                return FileSystemSrv.createFile(config_filerel_path, confString); 
            }
        })
        .then(function()
        {
            return FileSystemSrv.readJSON(config_filerel_path)
        })   
        .then(function(configdata)
        {
            service.config                  = configdata;
            service.config.appConfig.plugin = eval(service.config.defaults.plugin_interface_name);
        })         
        .catch(function(error){ 
            return $q.reject(error);              
        });        
    };
    
    service.fillAppConfig =  function()
    {
        service.config.appConfig.assisted                   = 0;
        service.config.appConfig.plugin                     = null;
        service.config.appConfig.file_system.resolved_odp   = FileSystemSrv.getResolvedOutDataFolder();
        service.config.appConfig.audio_configurations       = service.config.defaults.audio_configurations;
        service.config.appConfig.bluetooth                  = service.config.defaults.bluetooth;
        service.config.appConfig.remote                     = service.config.defaults.remote;
        service.config.appConfig.device                     = HWSrv.getDevice();
    };

    // if vocabulary.json is not present in file:/// , create it from www_path
    service.createVocabularyFile = function(vocabulary_filerel_path, vocabulary_www_path)
    {
        return FileSystemSrv.existFile(vocabulary_filerel_path)
        .then(function(exist){
            if(exist)   return 1;
            else{
                // file://.../subject file does not exist, load content from www version and save it to file:///
                return VocabularySrv.getHttpVocabulary(vocabulary_www_path)
                .then(function(content){
                    var voc = {"vocabulary" : content};
                    return FileSystemSrv.createFile(vocabulary_filerel_path, JSON.stringify(voc)); 
                });
            }
        })
        .catch(function(error){ 
            return $q.reject(error);              
        });
    };  

    //---------------------------------------------------------------------------------------------------------------------
    // get vocabulary list
    service.getVocabulary = function(vocabulary_filerel_path)
    {
        return VocabularySrv.getVocabulary(vocabulary_filerel_path);
    }; 
    //---------------------------------------------------------------------------------------------------------------------
    // check if sentences audio is present, update json file
    service.checkAudioPresence = function()
    {
        return 1; // ********************* TODO *****************
        return VocabularySrv.checkAudioPresence();
    }; 
    //---------------------------------------------------------------------------------------------------------------------
    // try to connect the registered devices
    service.connectBluetoothDevices = function(blt_devices)
    {
        return 1; // ********************* TODO *****************
        return HWSrv.connectBluetoothDevices(blt_devices);
    }; 
    //---------------------------------------------------------------------------------------------------------------------
    service.loginServer = function(remote)
    {
        return 1; // ********************* TODO *****************
        return RemoteSrv.loginServer(remote);
    }; 
    
    //==========================================================================
    // GET INTERNALSTATUS
    //==========================================================================    
    service.getAudioFolder = function()
    {
        return service.config.defaults.file_system.audio_folder;
    }; 
    
    service.getAudioTempFolder = function()
    {
        return service.config.defaults.file_system.audio_temp_folder;
    }; 

    service.getPlugin = function()
    {
        return service.config.appConfig.plugin;
    };    

    service.getDevice = function()
    {
        return service.config.appConfig.device;
    };    
    //==========================================================================
    // MERGE CURRENT CONFIG WITH POSSIBLE OVERRIDDING FROM CALLER CONTROLLERS (DOES NOT CHANGE service.config.appConfig.audio_configurations[profile] !!!!)
    //==========================================================================
    // receive some cfg params from the controller and overwrite the standard values, returns cfg object    
    service.getCaptureCfg = function (captureCfg, profile)
    {
        var cfg = service.config.appConfig.audio_configurations[profile];
        
        if (captureCfg != null)
        {
            for (item in captureCfg)
                cfg[item] = captureCfg[item];
        }        
        return cfg;
    };    
    
    service.getVadCfg = function (vadCfg)
    {
        var cfg = service.config.appConfig.audio_configurations.vad;
        
        if (vadCfg != null)
        {
            for (item in vadCfg)
                cfg[item] = vadCfg[item];
        }        
        return cfg;
    };     
    
    service.getMfccCfg = function (mfccCfg)
    {
        var cfg = service.config.appConfig.audio_configurations.mfcc;
        
        if (mfccCfg != null)
        {
            for (item in mfccCfg)
                cfg[item] = mfccCfg[item];
        }        
        return cfg;
    };     
    
    service.getTfCfg = function (tfCfg)
    {
        var cfg = service.config.appConfig.audio_configurations.tf;
        
        if (tfCfg != null)
        {
            for (item in tfCfg)
                cfg[item] = tfCfg[item];
        }        
        return cfg;
    };     
    
    //==========================================================================
    // UPDATE INIT.json
    //==========================================================================
    service.revertDefaultConfig = function(field)
    { 
        if(field == null || !field.length) service.fillAppConfig();
        else
        {
            switch(field)
            {
                case "capture":
                case "record":
                case "recognition":
                case "vad":
                case "mfcc":
                case "tf":
                    service.config.appConfig.audio_configurations[field] = service.config.defaults.audio_configurations[field];
                    break;
                    
                case "remote":
                    service.config.appConfig.remote = service.config.defaults.remote;
                    break;
            }
        }
        // writes data to JSON
        FileSystemSrv.overwriteFile( service.config.defaults.file_system.config_filerel_path, JSON.stringify( service.config))
        .then(function(){
            return 1;
        })
        .catch(function(error){ 
            return $q.reject(error);              
        });
    };

    service.saveAudioConfigField = function(field, obj)
    {
        var old_conf = service.config.appConfig.audio_configurations[field];
        service.config.appConfig.audio_configurations[field] = obj;
        // writes data to JSON
        return FileSystemSrv.overwriteFile(service.config.defaults.file_system.config_filerel_path, JSON.stringify( service.config))
        .then(function(){
            return 1;
        })
        .catch(function(error){ 
            service.config.appConfig.audio_configurations[field] = old_conf;
            return $q.reject(error);              
        });
    };
    
    service.saveConfigField = function(field, obj)
    {
        var old_conf = service.config.appConfig[field];
        service.config.appConfig[field] = obj;
        // writes data to JSON
        FileSystemSrv.overwriteFile(service.config.defaults.file_system.config_filerel_path, JSON.stringify( service.config))
        .then(function(){
            return 1;
        })
        .catch(function(error){ 
            service.config.appConfig[field] = old_conf;
            return $q.reject(error);              
        });
    };
    //==========================================================================
    return service;
}

 main_module.service('InitAppSrv', InitAppSrv);