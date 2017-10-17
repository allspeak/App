 main_module.service('RemoteTrainingSrv', function($http, FileSystemSrv, $cordovaTransfer, StringSrv, $cordovaZip)
{
    remote_url = "http://10.255.110.100:8095";

    api_upload_data = "/users/1/training-sessions"

    
    uploadZip = function(localfilepath, callback, errorCallback, progressCallback) 
    {
        fileTransfer = new $cordovaTransfer();

        progressCallback({
            'status': 'uploading',
            'label': 'Uploading audio traces',
        });
        fileTransfer.onProgress = function(evt) 
        {
            var label = 'Downloading';
            if (evt.lengthComputable) {
                label += ' (' + evt.loaded + '/' + evt.total + ')';
            } else {
                label += '...';
            }
            progressCallback({
                'status': 'downloading',
                'label': label,
                'detail': evt
            });
        };      
        var filename                = StringSrv.getFileNameExt(localfilepath);
        var api_url                 = encodeURI(remote_url + api_upload_data);
        
        var resolved_file_path      = FileSystemSrv.getResolvedOutDataFolder() + localfilepath;
        resolved_file_path          = resolved_file_path.split("file://")[1];
        
        var uploadOptions           = new FileUploadOptions();
        uploadOptions.fileKey       = "file";
        uploadOptions.fileName      = filename;
        uploadOptions.httpMethod    = "POST";
        uploadOptions.chunkedMode   = false,
        uploadOptions.headers       = {};
        
        fileTransfer.upload(resolved_file_path, api_url, uploadOptions, true)
        .then(function(result) 
        {
            var respobj             = JSON.parse(result.response);
            callback(respobj.training_session_id);
        })
        .catch(function(err) 
        {
            errorCallback("ERROR: " + JSON.stringify(err));
        });        
    };
    
    
    downloadZip = function(zipUrl, outFolder, localFilename, callback, errorCallback, progressCallback) 
    {
        var fileTransfer    = new FileTransfer();

        progressCallback({
            'status': 'downloading',
            'label': 'Downloading model files',
        });
        fileTransfer.onprogress = function(evt) 
        {
            var label = 'Downloading';
            if (evt.lengthComputable) {
                label += ' (' + evt.loaded + '/' + evt.total + ')';
            } else {
                label += '...';
            }
            progressCallback({
                'status': 'downloading',
                'label': label,
                'detail': evt
            });
        };
        
        fileTransfer.download(zipUrl, localFilename, function(entry) 
        {
            progressCallback({
                'status': 'unzipping',
                'label': 'Extracting contents'
            });
            zip.unzip(localFilename, outFolder, function(result) 
            {
                if (result == -1) {
                    errorCallback('Error unzipping file');
                    return;
                }
                callback();
            });
        }, errorCallback);
    }    
  
    
    return {
        downloadZip : downloadZip,
        uploadZip : uploadZip
    };
});


 
 
 
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