//      /storage/emulated/0/AllSpeak/audio_sentences


function FileSystemSrv($cordovaFile, $ionicPopup)
{
    var service = {}; 
    
    service.init = function(file_system_app_data)
    {
        service.output_data_root    = file_system_app_data.output_data_root;
        service.training_folder     = file_system_app_data.training_folder;
        return service.createDir(service.training_folder, 0)
        .then(function(success){
            return 1;
        });
    };

    service.createDir = function(relative_path, force)
    {
        service.forceDirCreation = force;
        if (!force)
        {
            return $cordovaFile.checkDir(cordova.file[service.output_data_root], relative_path)
                    .then(function (success) {return 1;}
                         ,function (error)   {
                            $cordovaFile.createDir(cordova.file[service.output_data_root], relative_path, true).then(
                                    function (success) {
                                        if (success) {
                                            console.log("created directory", cordova.file[service.output_data_root]+ relative_path);
                                            return 1;
                                        }
                                    },
                                    function (error) {
                                        console.log("createDir error: " + error.message);
                                        return 0;
                                    });                            
                        });   
        }
        else
        {
            $cordovaFile.createDir(cordova.file[service.output_data_root], relative_path, true).then(
                    function (success) {
                        if (success) {
                            console.log("created directory", cordova.file[service.output_data_root]+ relative_path);
                            return 1;
                        }
                    },
                    function (error) {
                        console.log("createDir error: " + error.message);
                        return 0;                        
                    });             
        }
    };
    
    service.showConfirm = function(title, text) 
    {
        return confirmPopup = $ionicPopup.confirm({
            title: title,
            template: text
        });

        confirmPopup.then(function(res) {
            return res;
        });
    };
    
    service.getResolvedOutDataFolder = function()
    {
        return cordova.file[service.output_data_root];
    }
    
    service.saveFile = function(relative_path, content, overwrite)
    {
        return $cordovaFile.writeFile(cordova.file[service.output_data_root], relative_path, content, overwrite)
        .then(function(){
                return 1;
            },
            function(err){
                console.log(err);
            });
//            return $cordovaFile.checkFile(cordova.file[service.output_data_root], relative_path)
//                    .then(
//                        function() {
//                            if(!overwrite)
//                            {
//                                return service.showConfirm("Il file audio esiste gia", "Vuoi sovrascrivere il file?")
//                                .then(function(res){
//                                    if(res)
//                                       return $cordovaFile.createFile(cordova.file[service.output_data_root], relative_path);
//                                    else
//                                       return 0;
//                                })
//                            }
//                            else    return $cordovaFile.createFile(cordova.file[service.output_data_root], relative_path);
//                        },
//                        function(error){
//                            return $cordovaFile.createFile(cordova.file[service.output_data_root], relative_path);
//                        }
//                    )
//                    .then(function (do_write){
//                            if (do_write)
//                            {
//                                return $cordovaFile.writeFile(cordova.file[service.output_data_root], relative_path, content, true)
//                                .then(function(){
//                                        return 1;
//                                    },
//                                    function(err){
//                                        console.log(err);
//                                    });
//                            }
//                        }
//                    );
    };
    
    return service;
}

 main_module.service('FileSystemSrv', FileSystemSrv);
 
 
 
// 
//        if (filename == null)
//        {
//            window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dir) 
//            {
//                dir.getFile(filename, {create: true}, function (file) 
//                {
//                    file.createWriter(function (fileWriter) { fileWriter.write(blob);},
//                                      function () { alert("FileWriter error!"); });
//                });
//            });        
//        }
//        else
//        {
////            $cordovaFile.checkFile(service.sentencesAudioFolder, filename).then(
////                function(success) {
////                    if (success)
////                        $cordovaFile.createFile(service.sentencesAudioFolder, filename);
////                }, function(error){
////                    console.log(error);
////                });
//                    
//                    
//            $cordovaFile.writeFile(service.sentencesAudioFolder, filename, blob, true).then(
//                    function(res){
//                        console.log(res);
//                    },
//                    function(err){
//                        console.log(err);
//
//                    });
//                        
//        }
//    };
//  
 
 
//    service.getDataDirEntry = function()
//    {
//        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, 
//                    function(dir) {
//                        service.dataDirectory = dir;
//                    }, 
//                    function(error) {console.log("error accessing dataDirectory folder", error.message);}
//                    );
//    };

 
 
 
//     service.createDir = function(relative_path, force)
//    {
//        service.forceDirCreation = force;
//        return $cordovaFile.checkDir(cordova.file[service.outputDataRoot], relative_path)
//            .then(function (){
//                if (service.forceDirCreation)
//                {
//                    //cancella e 
//                }
//            
//            })
//            .catch(function (error) 
//            {
//                return $cordovaFile.createDir(cordova.file[service.outputDataRoot], relative_path, true);
//            })
//            .then(function (success) {
//                console.log("created directory", cordova.file[service.outputDataRoot]+ relative_path);
//                return 1;
//            });
//    };
//    return service;
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

 
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