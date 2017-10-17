function RemoteAPISrv($http, $q)
{
    ServerCfg         = null;
    pluginInterface   = null;
    
    subject_id        = 0;
    session_id        = 0;
    // ==========================================================================================================================
    // PUBLIC
    // ==========================================================================================================================
    init = function(servercfg, plugin)
    {  
        ServerCfg       = servercfg;
        pluginInterface = plugin;
        
        ServerCfg.url   = "http://10.255.110.100:8095";
    };
    
    loginServer = function()
    {
//        var api_url = _getUrl("login");
//        return $http.get(api_url)
//        .then(function(res) 
//        {
//            return subject_id = res.data.subj_id;
//        })
//        .catch(function(err) 
//        {
//            alert("ERROR in RemoteAPISrv::loginServer : " + err.toString());
//            return 0;
//        }); 
        subject_id = 1;
        Promise.resolve(subject_id);
    };
    
    uploadTrainingData = function(localfilepath, callback, errorCallback, progressCallback) 
    {
        var api_url = _getUrl("upload_training_session");
        return _uploadFile(localfilepath, api_url, callback, errorCallback, progressCallback)
        .then(function(sess_id)
        {
            session_id = sess_id;
        })
        .catch(function(errorstring) 
        {
            alert(errorstring);
        });        
    };

    getNet = function(session_id, callback, errorCallback, progressCallback) 
    {
        var api_url = _getUrl("get_net");
//        return $http.get(api_url)
//        .then(function(res) 
//        {
//            return subject_id = res.data.subj_id;
//        })
//        .catch(function(err) 
//        {
//            alert("ERROR in RemoteAPISrv::getNet : " + err.toString());
//            return 0;
//        });         
        
    };
    
    // =======================================================================================================================
    //  PRIVATE
    // =======================================================================================================================
    // compose api url
    _getUrl = function(api_str) 
    {
        return ServerCfg.url + "/users/" + subject_id + "/" + ServerCfg.api[api_str];
    };
    
    _onUploadError = function(error)
    {
//      FILE_NOT_FOUND_ERR              : 1 Return when file was not found 
//      INVALID_URL_ERR                 : 2 Return when url was invalid 
//      CONNECTION_FILE_NOT_FOUND_ERR   : 3 Return on connection error 
//      ABORT_ERR                       : 4 Return on aborting 
//      NOT_MODIFIED_ERR                : 5 Return on ‘304 Not Modified’ HTTP response        
        var err_code    = error.code;
        var str         = "";
        switch(err_code)
        {
            case 1:
                str = "FILE_NOT_FOUND_ERR"; break;
            case 2:
                str = "INVALID_URL_ERR"; break;   
            case 3:
                str = "CONNECTION_FILE_NOT_FOUND_ERR"; break;                
            case 4:
                str = "ABORT_ERR"; break;                
            case 5:
                str = "NOT_MODIFIED_ERR"; break;                
        } 
        return "ERROR in RemoteAPISrv::_uploadFile : " + str + " | " + JSON.stringify(error);
    };
    
    _uploadFile = function(localfilepath, api_name, callback, errorCallback, progressCallback) 
    {
        var fileTransfer = new $cordovaTransfer();

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
        var api_url                 = encodeURI(remote_url + api_name);
        
        var resolved_file_path      = FileSystemSrv.getResolvedOutDataFolder() + localfilepath; // file:///storage/....
        resolved_file_path          = resolved_file_path.split("file://")[1];                   // /storage/....
        
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
            return respobj.training_session_id;
        })
        .catch(function(error) 
        {
            $q.reject(_onUploadError(error));
        });        
    };
        
    _downloadZip = function(fileUrl, outFolder, localFilename, callback, errorCallback, progressCallback) 
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
        
        fileTransfer.download(fileUrl, localFilename, function(entry) 
        {
            allback();
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
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                        : init,
        loginServer                 : loginServer,
        uploadTrainingData          : uploadTrainingData,
        getNet                      : getNet
    };  
    //==========================================================================
}
main_module.service('RemoteAPISrv', RemoteAPISrv);