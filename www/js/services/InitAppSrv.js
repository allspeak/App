/* Service which initializes the App:
 * 1)   create (if not existent) the folder containing the sentences' audio
 * 2)   read vocabulary json file
 * 3)   check if the vocabulary items have their audio files, update json
 * 4)   find bluetooth input, set it
 * 5)   if assisted => login server, post stats/measures, get instructions
 */

function InitAppSrv($http, VocabularySrv, FileSystemSrv, HWSrv, RemoteSrv)
{
    var service = {}; 
    
    service.appData                = {};
    service.init_json_path          = "./json/init.json";
    service.vocabulary_json_path    = "";
    service.outputDataRoot          = "";
    service.audio_folder            = "";
    
    service.init = function()
    {
        return service.loadInit()
        .then(function(init_data) {
            service.appData =  init_data;
            return service.initFileSystem(service.appData.file_system);
        })
        .then( function(){
            service.appData.file_system.resolved_odp = FileSystemSrv.getResolvedOutDataFolder();
            return service.getVocabulary(service.appData.vocabulary_json_path);
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

    }
    //==========================================================================
    //==========================================================================
    // load json containing init info
    service.loadInit = function()
    {
        return $http.get(service.init_json_path).then(function(res){
            service.appData        = res.data.init_data;       
            service.appData.device = HWSrv.getDevice();
            return service.appData;
        });        
    }
 // get vocabulary list
    service.getVocabulary = function(vocabulary_json_path)
    {
        return VocabularySrv.getVocabulary(vocabulary_json_path);
    }; 
    // create (if not existent) the audio sentence folder
    service.initFileSystem = function(file_system)
    {
        return FileSystemSrv.init(file_system);
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