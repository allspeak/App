function RemoteSrv($http)
{
    var service = {}; 
    
    service.loginServer = function()
    {
        return 1;
    };
    
    
    return service;
}

 main_module.service('RemoteSrv', RemoteSrv);
 
 
 
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