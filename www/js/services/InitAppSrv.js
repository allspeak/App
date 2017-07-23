/* Service which initializes the App:
 * 1)   Verify App permissions: particularly READ_EXTERNAL_STORAGE & WRITE_EXTERNAL_STORAGE in order to check & write config.json
 * 2)   load www/json/defaults.json containing all App defauls values...the most important is the path to the data.json file, containing appConfig & defaults
 * 3)   init file system:
 *          create (if not existent): the folder containing the sentences' audio
 *                                  : the temp audio folder
 *                                  : the json folder
 *                                  : check if data.json exist in file:// , YES: read it, NO: create it, saving the content of the default file into the json folder (in order to update its content and modify scores
 *                                  : create an empty vocabulary file
 * 4)   read vocabulary json file
 * 5)   check if the vocabulary items have their audio files, update json
 * 6)   find bluetooth input, set it
 * 7)   if assisted => login server, post stats/measures, get instructions

 * AUDIO PARAMS MANAGEMENT
 * 
 * Audio params (capture, vad, mfcc, tf) are managed according to the following principles:
 * App Configuration json file (config.json) contain two sections defining both current and default values for all these params.
 * current params session can be edited by the user (or the App itself). Default one are read-only and are used to override the current ones.
 * In principle only the VAD params will be really edited by the user, but the mechanism was implemented for all of them.
 * InitAppSrv 
 * 
 */


function InitAppSrv($http, $q, VocabularySrv, FileSystemSrv, HWSrv, RemoteSrv)
{
    var service                     = {}; 
    service.default_json_www_path   = "./json/defaults.json";
    
    service.initConfigStructure = function()
    {
        service.config                                  = {};
        service.config.appConfig                        = {};
        service.config.appConfig.file_system            = {};
        service.config.appConfig.audio_configurations   = {};
        service.config.appConfig.audio_devices          = {};
        service.config.appConfig.bluetooth              = {};
        service.config.appConfig.remote                 = {};
        service.config.appConfig.device                 = {};
        
        service.config.vocabulary                       = [];
        service.config.defaults                         = {};        
        service.config.checks                           = {};        
        service.config.checks.hasTrainVocabulary        = false;        
        service.config.checks.hasModelTrained           = false;        
        service.config.checks.isConnected               = false;        
    };
    service.initConfigStructure();    
   
    service.postRecordState                             = "";   //it stores the state to reach after audio record (can be voicebank or training)
    //====================================================================================================================
    // permissions-loadDefaults-createfolders-loadconfig-loadvocabularies-loadTF-setupAudioDevices-loginServer
    service.initApp = function()
    {
        return service.initPermissions()
        .then( function() {
            return service.loadDefaults();        
        })
        .then( function() {
            return service.createFileSystemDirs();
        })
        .then( function() {
            return service.loadConfigFile();        
        })        
        .then( function() {
            return service.LoadVocabularies();
        })
        .then( function() {
            return service.loadTFModel();
        })
        .then( function() {
            return service.setupAudioDevices();
        })        
        .then( function(){
            if ( service.config.appConfig.assisted)
                return service.loginServer(service.config.appConfig.remote);
            else
                return 0;
        })
        .then( function(connected){
            if (connected)  
            // manage login errors
            return 1;
        })
        .catch(function(error){
            return $q.reject(error);
        });
    };
    //====================================================================================================================
    // MAIN OPS
    //====================================================================================================================
    // check for permissions
    service.initPermissions = function()
    {
        service.permissions = window.cordova.plugins.permissions;
        service.permissionsList = [
          service.permissions.READ_EXTERNAL_STORAGE,
          service.permissions.WRITE_EXTERNAL_STORAGE,
          service.permissions.RECORD_AUDIO
        ];    
        var promise = new Promise(function(resolve, reject) {
            successCallback = resolve;
            errorCallback = reject;
        }); 

        service.permissions.checkPermission(service.permissionsList, hasPermissionSuccess, null);  //        function error() { console.warn('Camera or Accounts permission is not turned on'); }

        function hasPermissionSuccess( status ) {
          if( !status.hasPermission ) {
            service.permissions.requestPermissions(
              service.permissionsList,successCallback, errorCallback);      // function(status) { if( !status.hasPermission ) error(); },  error);
          }
        }        
        return promise;
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

    // create (if not existent) the App folders
    service.createFileSystemDirs = function()
    {
        default_file_system = service.config.defaults.file_system;
        FileSystemSrv.setUnresolvedOutDataFolder(default_file_system.output_data_root);
        
            return FileSystemSrv.createDir(default_file_system.app_folder, false)
        .then(function(){        
            return FileSystemSrv.createDir(default_file_system.audio_folder, false);
        })
        .then(function(){        
            return FileSystemSrv.createDir(default_file_system.voicebank_folder, false);
        })
        .then(function(){
            return FileSystemSrv.createDir(default_file_system.json_folder, false);
        })
        .then(function(){
            return FileSystemSrv.createDir(default_file_system.tf_models_folder, false);
        })
        .then(function(){
            return FileSystemSrv.createDir(default_file_system.temp_folder, true);
        })
        .then(function(){
            return FileSystemSrv.createDir(default_file_system.audio_temp_folder, true);
        })
        .catch(function(error){
            return $q.reject(error);
        });        
    };     
    //====================================================================================================================
    // if config.json is not present in file:/// , create it
    service.loadConfigFile = function()
    {
        var localConfigJson = service.config.defaults.file_system.config_filerel_path;
        return FileSystemSrv.existFile(localConfigJson)
        .then(function(exist)
        {
            if(exist)   return FileSystemSrv.readJSON(localConfigJson);
            else
            {
                // file://.../config.json file does not exist, copy defaults subfields to appConfig subfields 
                service._fillAppConfig();
                var confString = JSON.stringify(service.config);
                return FileSystemSrv.createFile(localConfigJson, confString)
                .then(function(){
                    return FileSystemSrv.readJSON(localConfigJson);
                });
            }
        })
        .then(function(configdata)
        {
            service.config.appConfig        = configdata.appConfig;
            service.config.defaults         = configdata.defaults;
            service.config.appConfig.device = HWSrv.getDevice();
            service.config.appConfig.plugin = eval(service.config.defaults.plugin_interface_name);
            if(service.config.appConfig.plugin == null)
                return $q.reject({"message": "audioinput plugin is not present"});
        })         
        .catch(function(error){ 
            return $q.reject(error);               
        });        
    };
    
    //====================================================================================================================
    // init the vocabulary service. set paths, get voicebank & train vocabulary lists
    // check if voice bank audio files are present
    service.LoadVocabularies = function()
    {
        return VocabularySrv.init(service.config.defaults.file_system)
        .then(function(res){ 
            service.config.checks.hasTrainVocabulary = res;
        })       
        .catch(function(error){ 
            return $q.reject(error);              
        });
    }; 
    
    // load the user's trained model
    service.loadTFModel = function()
    {
        return FileSystemSrv.existFile(service.getTFModelsFolder() + "/" + service.config.defaults.tf.sModelFileName + ".pb")
        .then(function(exist)
        {
            if (!exist) return 0;
            else 
                return service.config.appConfig.plugin.loadTFModel(service.getTfCfg())
                .then(function()
                {
                    return 1;
                })
                .catch(function(error){ 
                    return $q.reject(error);              
                });                
        })
        .then(function(res)
        {
            service.config.appConfig.tf.bLoaded = res;
            service.config.checks.hasModelTrained = res;
            return res;
        })        
        .catch(function(error){ 
            service.config.appConfig.tf.bLoaded = false;
            service.config.checks.hasModelTrained = false;
            return $q.reject(error);              
        });
    };
    //====================================================================================================================
    // get audiodevice list. find BTHS & BT SPEAKER, if found .. ready to be connected
    // is the first call to the plugin...check if
    service.setupAudioDevices = function()
    {
        return service.config.appConfig.plugin.getAudioDevices()// returns : {input:[{"name": , "types":  , channels: }], output:[{"name": , "types":  , channels: }]}
        .then(function(ad){
            service.config.appConfig.audio_devices = ad;
            return 1;
        })
        .then( function() {
            return service._connectBluetoothDevices(service.config.appConfig.blt_devices); // TODO:
        })        
        .catch(function(error){ 
            return $q.reject(error);              
        });
    }; 
    //====================================================================================================================
    service.loginServer = function(remote)
    {
        // ********************* TODO *****************
        return RemoteSrv.loginServer(remote)
        .then(function(success)
        {
            service.config.checks.isConnected = true;
            return 1;
        })
        .catch(function(error){ 
            service.config.checks.isConnected = false;
            return $q.resolve(0);              
        });        
    }; 
    
   //==========================================================================
   // PRIVATE
   //==========================================================================
    service._fillAppConfig =  function()
    {
        service.config.appConfig.assisted                   = 0;
        service.config.appConfig.plugin                     = null;
        service.config.appConfig.file_system.resolved_odp   = FileSystemSrv.getResolvedOutDataFolder();  // ends with '/'
        service.config.appConfig.audio_configurations       = service.config.defaults.audio_configurations;
        service.config.appConfig.audio_devices              = service.config.defaults.audio_configurations;
        service.config.appConfig.tf                         = service.config.defaults.tf;
        service.config.appConfig.bluetooth                  = service.config.defaults.bluetooth;
        service.config.appConfig.remote                     = service.config.defaults.remote;
        service.config.appConfig.device                     = HWSrv.getDevice();
        
        service.config.appConfig.tf.sModelFilePath          = service.config.appConfig.file_system.resolved_odp + service.config.defaults.file_system.tf_models_folder + "/" + service.config.appConfig.tf.sModelFileName + ".pb";
        service.config.appConfig.tf.sLabelFilePath          = service.config.appConfig.file_system.resolved_odp + service.config.defaults.file_system.tf_models_folder + "/" + service.config.appConfig.tf.sLabelFileName + ".txt";
    };

    // try to connect the registered devices
    service._connectBluetoothDevices = function(blt_devices)
    {
        return 1; // ********************* TODO *****************
        return HWSrv.connectBluetoothDevices(blt_devices);
    }; 
    //====================================================================================================================
    //====================================================================================================================
    // GET INTERNALSTATUS
    //==========================================================================
    service.getAudioFolder = function()
    {
        return service.config.defaults.file_system.audio_folder;
    }; 
    
    service.getVoiceBankFolder = function()
    {
        return service.config.defaults.file_system.voicebank_folder;
    }; 
    
    service.getAudioTempFolder = function()
    {
        return service.config.defaults.file_system.audio_temp_folder;
    }; 
    
    service.getTempFolder = function()
    {
        return service.config.defaults.file_system.temp_folder;
    }; 
    
    service.getTFModelsFolder = function()
    {
        return service.config.defaults.file_system.tf_models_folder;
    }; 

    service.getPlugin = function()
    {
        return service.config.appConfig.plugin;
    };    

    service.getDevice = function()
    {
        return service.config.appConfig.device;
    };    
    
    service.isModelLoaded = function()
    {
        return service.config.appConfig.tf.bLoaded;
    };    
    
    service.isTrainVocabularyPresent = function()
    {
        return service.config.checks.hasTrainVocabulary;
    };    
    
    //==========================================================================
    // MERGE CURRENT CONFIG WITH POSSIBLE OVERRIDDING FROM CONTROLLERS' CALLS
    // (DOES NOT CHANGE service.config.appConfig.audio_configurations[profile] !!!!)
    //==========================================================================
    // receive some cfg params from the controller and overwrite the standard values, returns the full object (controllers params + other as default)
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
        var cfg = service.config.appConfig.tf;
        
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
                    service.config.appConfig.audio_configurations[field] = service.config.defaults.audio_configurations[field];
                    break;
                    
                case "tf":
                    service.config.appConfig[field] = service.config.defaults[field];
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