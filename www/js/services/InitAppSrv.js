/* Service which initializes the App:
 * 
 * 1)   APP PERMISSIONS             : particularly READ_EXTERNAL_STORAGE & WRITE_EXTERNAL_STORAGE in order to check & write config.json
 * 2)   LOAD ASSETS DEFAULTS        : load www/json/defaults.json containing all App defauls values...the most important is the path to the config.json file, containing appConfig & defaults
 * 3)   INIT FILE SYSTEM            : init FileSystemSrv
 *                                    create (if not existent)
 *                                      - the folder containing the sentences' audio
 *                                      - the temp audio folder
 *                                      - the json folder
 * 4)   LOAD CONFIG FILE            : check if "json/config.json" exist in STORAGE ? YES: read it, NO: create it, saving the content of the default file into the json folder
 * 5)   INIT SERVICES               : initialize SpeechDetectionSrv, TfSrv, MfccSrv, RemoteAPISrv
 * 6)   LOAD VOCABULARIES           : prepare VB & UVB voc, check if VB vocabulary items have their audio files, update json
 * 7)   COPY DEFAULT NET            : copy default NET to AllSpeak/models
 * 8)   FIND AUDIO DEVICES          : find bluetooth input, set it TODO
 *
 *
 * AUDIO PARAMS MANAGEMENT
 * 
 * Audio params (capture, vad, mfcc, tf) are managed according to the following principles:
 * App Configuration json file (config.json) contain two sections defining both current and default values for all these params.
 * current params session can be edited by the user (or the App itself). Default one are read-only and are used to override the current ones.
 * In principle only the VAD params will be really edited by the user, but the mechanism was implemented for all of them.
 * 
 * APP MODALITY
 * 1) solo
 * 2) guest
 * 3) assisted
 *      registered
 * 
 *      
 * Config structure
 {
    "appConfig":
    {   
        "appModality": 112,
        "isFirstUse": false,
        "file_system"               : {},   
        "capture_configurations"    : {
            "recognition"   : {},
            "amplifier"     : {},
            "record"        : {}
        },            
        "vad"           : {},
        "mfcc"          : {},
        "tf"            : {},       
        "remote"        : {"isDeviceRegistered"},
        "bluetooth"     : {},
        "device"        : {}
    }
}
*             
 */


function InitAppSrv($http, $q, VoiceBankSrv, HWSrv, SpeechDetectionSrv, TfSrv, MfccSrv, VocabularySrv, RemoteAPISrv, FileSystemSrv, RuntimeStatusSrv, EnumsSrv)
{
    var service                     = {}; 
    service.default_json_www_path   = "./json/defaults.json";
    service.config                  = {};
    
    service.plugin                  = {};
    
    //====================================================================================================================
    // permissions-loadDefaults-createfolders-loadconfig-initservices-loadVB_UVBvoc-setupAudioDevices
    service.initApp = function()
    {
        return service.initPermissions()
        .then( function() {
            return service.loadDefaults();        
        })      // load defaults
        .then( function() {
            return service.createFileSystemDirs();
        })      // create FS dirs
        .then( function() {
            return service.loadConfigFile();        
        })      // load config file
        .then( function() {
            return service.initServices();        
        })      // init services    
        .then( function() {
            return service.LoadVBVocabularies();
        })      // load VB vocs
        .then( function() {     
            return service.manageTFModels();
        })      // copy def net
        .then( function() {
            return service.setupAudioDevices();
        })      // setup audio     
//        .then( function(){
//            if ( service.config.appConfig.isAssisted)
//                return service.login(service.config.appConfig.remote);
//            else
//                return 0;
//        })
//        .then( function(){
//            if (true)  
//                // manage login errors
//                return 0;
//        })
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
        FileSystemSrv.init(default_file_system.data_storage_root, default_file_system.data_assets_folder);
        
            return FileSystemSrv.createDir(default_file_system.app_folder, false)
        .then(function(){        
            return FileSystemSrv.createDir(default_file_system.training_folder, false);
        })
        .then(function(){        
            return FileSystemSrv.createDir(default_file_system.voicebank_folder, false);
        })
        .then(function(){
            return FileSystemSrv.createDir(default_file_system.json_folder, false);
        })
        .then(function(){
            return FileSystemSrv.createDir(default_file_system.vocabularies_folder, false);
        })
        .then(function(){
            return FileSystemSrv.createDir(default_file_system.vocabularies_folder + "/" + default_file_system.default_vocabulary_name, false);
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
    // if config.json is not present in file:/// , create it from asset folder
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
                service._createFirstAppConfig();
                return FileSystemSrv.createFileFromObj(localConfigJson, service.config.appConfig)
                .then(function(){
                    return FileSystemSrv.readJSON(localConfigJson);
                });
            }
        })
        .then(function(appconfig)
        {
//            service.config.defaults         = configdata.defaults;
            service.config.appConfig        = appconfig;
            service.config.appConfig.device = HWSrv.getDevice();
            
            service.plugin                  = eval(service.config.defaults.plugin_interface_name);
            
            if(service.plugin == null)
                return $q.reject({"message": "audioinput plugin is not present"});
        })         
        .catch(function(error){ 
            return $q.reject(error);               
        });        
    };
    
    //====================================================================================================================
    // init the main 6 data services
    service.initServices = function()
    {
        SpeechDetectionSrv.init(service.config.defaults.capture_configurations, service.config.defaults.vad, service.plugin);
        TfSrv.init(service.config.defaults.tf, service.config.defaults.file_system.vocabularies_folder, service.plugin);
        MfccSrv.init(service.config.defaults.mfcc, service.plugin);
        RemoteAPISrv.init(service.config.appConfig.remote, service.plugin, service);    // I pass the current appConfig values (not the defauls ones)
        RuntimeStatusSrv.init(service.config.defaults.file_system.vocabularies_folder, service.config.defaults.file_system.training_folder);
        VocabularySrv.init(service.config.defaults.file_system);
    };
    
    //====================================================================================================================
    // init the vocabulary service. set paths, get voicebank & uservoicebank vocabulary lists
    // check if voice bank audio files are present
    // training vocabularies will be managed later
    service.LoadVBVocabularies = function()
    {
        return VoiceBankSrv.init(service.config.defaults.file_system)
    }; 
    
    // copy (if not existent) the default model from assets to AllSpeak/vocabularies/default
    // overwrite the sModelFilePath params to file:///storage/emulated/0/AllSpeak/vocabularies/default/controls_fsc.p
    service.manageTFModels = function()
    {
        var default_file_system     = service.config.defaults.file_system;
        
        // AllSpeak/vocabularies/default/vocabulary.json
        var storageDefaultModelJson = default_file_system.vocabularies_folder + "/" + default_file_system.default_vocabulary_name + "/" + default_file_system.universalJsonFileName;       
        // AllSpeak/vocabularies/default/controls_fsc.pb
        var storageDefaultModelPB   = default_file_system.vocabularies_folder + "/" + default_file_system.default_vocabulary_name + "/"  + default_file_system.defaultModelName;
        
        var assetsDefaultModelJson = "models" + "/" + default_file_system.default_vocabulary_name + "/" + default_file_system.universalJsonFileName; 
        var assetsDefaultModelPB   = "models" + "/" + default_file_system.default_vocabulary_name + "/" + default_file_system.defaultModelName;
        
            return FileSystemSrv.copyFromAssets(assetsDefaultModelJson, storageDefaultModelJson, 0)        
        .then(function()
        {
            return FileSystemSrv.copyFromAssets(assetsDefaultModelPB, storageDefaultModelPB, 0)        
        })
        .then(function()
        {
            return FileSystemSrv.readJSON(storageDefaultModelJson)
        })
        .then(function(jsondefvoc)
        {
            jsondefvoc.sModelFilePath =  FileSystemSrv.getResolvedOutDataFolder() + storageDefaultModelPB;
            return FileSystemSrv.createFileFromObj(storageDefaultModelJson, jsondefvoc, 2);
        })           
        .catch(function(error)
        { 
            return $q.reject(error);              
        });        
    };
    //====================================================================================================================
    // get audiodevice list. find BTHS & BT SPEAKER, if found .. ready to be connected
    // is the first call to the plugin...check if
    service.setupAudioDevices = function()
    {
        return service.plugin.getAudioDevices()// returns : {input:[{"name": , "types":  , channels: }], output:[{"name": , "types":  , channels: }]}
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

   //====================================================================================================================================================
   //====================================================================================================================================================
   // PRIVATE
   //====================================================================================================================================================
   //====================================================================================================================================================
   // called when a config.json does not exist (first use, update, restore defaults)
    service._createFirstAppConfig =  function()
    {
        service.config.appConfig                            = {};
        service.config.appConfig.file_system                = service.config.defaults.file_system;
        service.config.appConfig.capture_configurations     = service.config.defaults.capture_configurations;
        service.config.appConfig.audio_devices              = {};
        service.config.appConfig.tf                         = service.config.defaults.tf;
        service.config.appConfig.mfcc                       = service.config.defaults.mfcc;
        service.config.appConfig.vad                        = service.config.defaults.vad;
        service.config.appConfig.bluetooth                  = service.config.defaults.bluetooth;
        service.config.appConfig.remote                     = service.config.defaults.remote;
        service.config.appConfig.device                     = HWSrv.getDevice();
        
        service.config.appConfig.file_system.resolved_odp   = FileSystemSrv.getResolvedOutDataFolder();  // ends with '/'
        service.config.appConfig.remote.isDeviceRegistered  = false;
        
        service.config.appConfig.isFirstUse                 = true;
        service.config.appConfig.appModality                = EnumsSrv.MODALITY.SOLO;
        service.config.appConfig.userActiveVocabularyName   = "";
    };

    // try to connect the registered devices
    service._connectBluetoothDevices = function(blt_devices)
    {
        return Promise.resolve(1); // ********************* TODO *****************
        return HWSrv.connectBluetoothDevices(blt_devices);
    }; 
    
    //====================================================================================================================
    //====================================================================================================================
    // GET INTERNAL INFO
    //====================================================================================================================
    //====================================================================================================================
    service.getPlugin = function()
    {
        return service.plugin;
    };    

    service.getDevice = function()
    {
        return service.config.appConfig.device;
    };    
      
    service.getStatus = function()
    {
        return {"isFirstUse"                : service.config.appConfig.isFirstUse,
                "appModality"               : service.config.appConfig.appModality,
                "userActiveVocabularyName"  : service.config.appConfig.userActiveVocabularyName,
                "isDeviceRegistered"        : service.config.appConfig.remote.isDeviceRegistered
        };
    }; 
 
    //==========================================================================
    // UPDATE STATUS & CONFIG
    //==========================================================================
    // write to json the following :  AppStatus, isFirstUse, userActiveVocabulary, remote.isDeviceRegistered
    service.setStatus = function(statusobj)
    {
        var old = {};
        for(elem in statusobj)
        {
            if(elem == "isDeviceRegistered" || elem == "api_key")
            {
                old[elem]                               = service.config.appConfig.remote[elem];
                service.config.appConfig.remote[elem]   = statusobj[elem];
            }
            else
            {
                old[elem]                               = service.config.appConfig[elem];
                service.config.appConfig[elem]          = statusobj[elem];
            }
        };
        return FileSystemSrv.overwriteFile(service.config.defaults.file_system.config_filerel_path, JSON.stringify( service.config.appConfig))
        .catch(function(error)
        { 
            for(elem in old)
                if(elem == "isDeviceRegistered")
                    service.config.appConfig.remote[elem]   = old[elem];
                else
                    service.config.appConfig[elem]          = old[elem];
                
            return $q.reject(error);              
        });        
        
    };     
    
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
                    service.config.appConfig.capture_configurations[field] = service.config.defaults.capture_configurations[field];
                    break;

                case "vad":
                case "mfcc":
                case "tf":
                case "remote":
                    service.config.appConfig[field] = service.config.defaults[field];
                    break;
            }
        }
        // writes data to JSON
        FileSystemSrv.overwriteFile( service.config.defaults.file_system.config_filerel_path, JSON.stringify( service.config.appConfig))
        .then(function(){
            return 1;
        })
        .catch(function(error){ 
            return $q.reject(error);              
        });
    };

    service.saveCaptureConfigField = function(field, obj)
    {
        var old_conf = service.config.appConfig.capture_configurations[field];
        service.config.appConfig.capture_configurations[field] = obj;
        // writes data to JSON
        return FileSystemSrv.overwriteFile(service.config.defaults.file_system.config_filerel_path, JSON.stringify( service.config.appConfig))
        .then(function(){
            return 1;
        })
        .catch(function(error){ 
            service.config.appConfig.capture_configurations[field] = old_conf;
            return $q.reject(error);              
        });
    };
    
    service.saveConfigField = function(field, obj)
    {
        var old_conf = service.config.appConfig[field];
        service.config.appConfig[field] = obj;
        // writes data to JSON
        FileSystemSrv.overwriteFile(service.config.defaults.file_system.config_filerel_path, JSON.stringify(service.config.appConfig))
        .then(function(){
            return 1;
        })
        .catch(function(error){ 
            service.config.appConfig[field] = old_conf;
            return $q.reject(error);              
        });
    };

    //==========================================================================
    // GET SYSTEM FOLDERS
    //==========================================================================
    service.getVoiceBankFolder = function()                                     // AllSpeak/voicebank
    {
        return service.config.defaults.file_system.voicebank_folder;            
    };  
    
    service.getAudioTempFolder = function()                                     // AllSpeak/training_sessions/temp
    {
        return service.config.defaults.file_system.audio_temp_folder;           
    }; 
    
    service.getTempFolder = function()                                          // AllSpeak/temp
    {
        return service.config.defaults.file_system.temp_folder;                 
    }; 
    
    service.getAudioFolder = function()                                         // AllSpeak/training_sessions
    {
        return service.config.defaults.file_system.training_folder;             
    }; 
    
    service.getVocabulariesFolder = function()                                  //"AllSpeak/vocabularies"
    {
        return service.config.defaults.file_system.vocabularies_folder;         
    }; 
    
    service.getDefaultVocabularyFolder = function()                             //"AllSpeak/vocabularies/standard"
    {
        return service.config.defaults.file_system.vocabularies_folder + "/" + service.getDefaultVocabularyName();         
    }; 
    
    //==========================================================================
    // GET SYSTEM FILE NAMES
    //==========================================================================    
    service.getUniversalJsonFileName = function()                               // vocabulary.json
    {
        return service.config.defaults.file_system.universalJsonFileName;
    }; 
    
    service.getDefaultVocabularyName = function()                               // "default"
    {
        return service.config.defaults.file_system.default_vocabulary_name;
    }; 

    //==========================================================================
    return service;
}

 main_module.service('InitAppSrv', InitAppSrv);