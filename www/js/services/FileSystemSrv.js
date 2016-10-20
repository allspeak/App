function FileSystemSrv($cordovaFile)
{
    
    var service = {}; 

    service.outputDataRoot = "externalDataDirectory";
    
    service.init = function()
    {
        return service.createDir("audio_sentences", 0)
        .then()
    }
//    service.init = function()
//    {
//        return $cordovaFile.checkDir(cordova.file[service.outputDataRoot], "audio_sentences").then(
//                function(res){
//                    if(!res)
//                    {
//                        $cordovaFile.createDir(cordova.file[service.outputDataRoot], "audio_sentences", true).then(
//                            function(success){
//                                if(success){
//                                   return 1; 
//                                }
//                            },
//                            function(error){
//                               console.log("createDir error: "+ error.message);
//                               throw error;
//                            });
//                    }
//                },
//                function(error){
//                    console.log("checkDir error: "+ error.message);
//                   throw error;
//                }
//                );
//    };
    
    service.getDataDirEntry = function()
    {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, 
                    function(dir) {
                        service.dataDirectory = dir;
                    }, 
                    function(error) {console.log("error accessing dataDirectory folder", error.message);}
                    );
    };
    
    
    service.createDir = function(relative_path, force)
    {
        service.forceDirCreation = force;
        if (!force)
        {
            return $cordovaFile.checkDir(cordova.file[service.outputDataRoot], relative_path)
                    .then(function (success) {
                            if (!success) {
                                //console.log("directory to be created already exist", dirEntry);
                                return 1;
                            }
                        }
                        ,function (error) {
                            $cordovaFile.createDir(cordova.file[service.outputDataRoot], relative_path, true).then(
                                    function (success) {
                                        if (success) {
                                            console.log("created directory", cordova.file[service.outputDataRoot]+ relative_path);
                                            return 1;
                                        }
                                    },
                                    function (error) {
                                        console.log("createDir error: " + error.message);
                                    });                            
                        });   
        }
        else
        {
            $cordovaFile.createDir(cordova.file[service.outputDataRoot], relative_path, true).then(
                    function (success) {
                        if (success) {
                            console.log("created directory", cordova.file[service.outputDataRoot]+ relative_path);
                            return 1;
                        }
                    },
                    function (error) {
                        console.log("createDir error: " + error.message);
                    });             
        }
    };
    return service;
}

 main_module.service('FileSystemSrv', FileSystemSrv);
 
 
 
 //                        console.log('cordova.file.externalDataDirectory: ' + cordova.file.externalDataDirectory);
//                        console.log('cordova.file.DataDirectory: ' + cordova.file.dataDirectory);
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