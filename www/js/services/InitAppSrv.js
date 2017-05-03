/* Service which initializes the App:
 * 1)   create (if not existent) the folder containing the sentences' audio
 * 2)   read vocabulary json file
 * 3)   check if the vocabulary items have their audio files, update json
 * 4)   find bluetooth input, set it
 * 5)   if assisted => login server, post stats/measures, get instructions
 */

function InitAppSrv($http, $q, VocabularySrv, FileSystemSrv, HWSrv, RemoteSrv)
{
    var service = {}; 
    
    service.appData                = {};
    service.init_json_www_path     = "./json/init.json";
    service.vocabulary_json_path    = "";
    service.outputDataRoot          = "";
    service.audio_folder            = "";
    service.json_folder             = "";
    
    
    service.init = function()
    {
        return service.loadInit()
        .then(function() {
            return service.initFileSystem(service.appData.file_system);
        })
        .then( function(){
            return service.getVocabulary(service.appData.vocabulary_filerel_path);
        })
        .then( function(){
            return service.checkAudioPresence();
        })
        .then( function(){
            return service.connectBluetoothDevices(service.appData.blt_devices);
        })
        .then( function(blt_conn_res){
            if (service.appData.assisted)
                return service.loginServer(service.appData.remote);
            else
                return 1;
        })
        .then(function(success){
            // manage login errors
            return 1;
        })
        .catch(function(error){
            return $q.reject(error);
        });
    };
    //==========================================================================
    //==========================================================================
    // load json containing init info
    service.loadInit = function()
    {
        return $http.get(service.init_json_www_path)
        .then(function(res){
            service.appData        = res.data.init_data;       
            service.appData.device = HWSrv.getDevice();
            
            service.audio_folder    = service.appData.file_system.audio_folder;            
            return service.appData;
        });        
    };
 // get vocabulary list
    service.getVocabulary = function(vocabulary_filerel_path)
    {
        return VocabularySrv.getVocabulary(vocabulary_filerel_path);
    }; 
    
    // create (if not existent) the App folder and its audio sentence and json subfolders 
    // and the subjects and vocabulary files
    service.initFileSystem = function(file_system)
    {
        service.appData.file_system.resolved_odp = FileSystemSrv.setUnresolvedOutDataFolder(file_system.output_data_root);
            return FileSystemSrv.createDir(file_system.app_folder, false)
        .then(function(){        
            return FileSystemSrv.createDir(file_system.audio_folder, false);
        })
        .then(function(){
            return FileSystemSrv.createDir(file_system.audio_temp_folder);
        })
        .then(function(){
            return FileSystemSrv.createDir(file_system.json_folder, false);
        })
        .then(function(){
            // create file:///app_folder/output_data_root/json/vocabulary.json if absent.
            return service.createVocabularyFile(service.appData.vocabulary_filerel_path, service.appData.vocabulary_www_path);
        })
        .catch(function(error){
            return $q.reject(error);
        });        
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
    
    // get vocabulary list
    service.getVocabulary = function(vocabulary_filerel_path)
    {
        return VocabularySrv.getVocabulary(vocabulary_filerel_path);
    }; 
    
    // check if sentences audio is present, update json file
    service.checkAudioPresence = function(vocabulary)
    {
        return 1;
        return VocabularySrv.checkAudioPresence(vocabulary);
    }; 
    // try to connect the registered devices
    service.connectBluetoothDevices = function(blt_devices)
    {
        return 1;
        return HWSrv.connectBluetoothDevices(blt_devices);
    }; 
    
    service.loginServer = function(remote)
    {
        return 1;
        return RemoteSrv.loginServer(remote);
    }; 
    
    service.getAudioFolder = function()
    {
        return service.audio_folder;
    }; 
    //==========================================================================
    //==========================================================================
    return service;
}

 main_module.service('InitAppSrv', InitAppSrv);
 
 
 
 
// 
// main_module.service('FileSystemSrv', function() {
//    var dataDirEntry = null;
//    return {
//      getDataDirEntry: function () {
//        if (dataDirEntry)
//            return Promise.resolve(dataDirEntry);
//        return window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory,
//                    function(dir) {
//                        dataDirEntry = dir;
//                        //return dataDirEntry;
//                        return Promise.resolve(dataDirEntry);
//                    }, 
//                    function(error) {console.log("error accessing dataDirectory folder", error.message);}
//                    );          
//      }
//    };
//});

//        window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function(dir) {
//                console.log("got main dir",dir);
//                dir.getDirectory(relative_path, {create:true},
//                    function(dirEntry) {
//                       console.log("created directory", dirEntry);
//                    },
//                    function(error) {
//                       console.log("error creating the folder", error.message);
//                    });
//                });     