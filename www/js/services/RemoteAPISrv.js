/*
 * Main activities
 * 
 * Login
 * RegisterDevice
 * uploadTrainingData
 * isNetAvailable
 * getNet
 * 
 * Possible Activities
 * 
 *  - download updated elements (common_net, vb voc, defaults)
 *  - perform suggested tasks (retrain, do rec test, do measure)
 *  - backup/restore data
 */

main_module.service('RemoteAPISrv', function($http, $q, $cordovaTransfer, FileSystemSrv, StringSrv)
{
    ServerCfg           = null;
    pluginInterface     = null;
    initAppSrv          = null;
    
    device              = null;
    api_key             = "";
    
    isDeviceRegistered  = false;
    
    user                = {};
    user_id             = 0;
    
    // training process
    is_training         = false;    // indicate whether a training process have been started on the server
    session_id          = 0;        // got from server (after uploadTrainingData) 
    
    sModelFileName      = "";       // set by the server (without extension) and returned from : /api/v1/training-sessions/<session_uid>
                                    // I add the extension the first time I receive it.
                                    
    fileTransfer        = null;     // instance of new $cordovaTransfer(); used also to abort the transfer
    
    oldUploadPerc       = 0;
    oldDownloadPerc     = 0;
    // ==========================================================================================================================
    // PUBLIC
    // ==========================================================================================================================
    init = function(servercfg, plugin, initappserv)
    {  
        ServerCfg       = servercfg;
        pluginInterface = plugin;
        initAppSrv      = initappserv;
        
//        ServerCfg.url   = "http://192.168.1.65:8095";     // OVERWRITE FOR DEBUG
//        ServerCfg.url   = "http://192.168.43.69:8095";     // OVERWRITE FOR DEBUG
//        ServerCfg.url   = "http://192.168.1.71:8095";     // OVERWRITE FOR DEBUG
//        ServerCfg.url   = "http://192.168.1.90:8095";     // OVERWRITE FOR DEBUG
//        ServerCfg.url   = "http://192.168.0.8:8095";     // OVERWRITE FOR DEBUG
        ServerCfg.url   = "http://192.168.0.12:8095";     // OVERWRITE FOR DEBUG
//        ServerCfg.url   = "http://192.168.1.77:8095";     // OVERWRITE FOR DEBUG
//        ServerCfg.url   = "http://192.168.1.133:8095";     // OVERWRITE FOR DEBUG
//        ServerCfg.url   = "http://api.allspeak.eu";     // OVERWRITE FOR DEBUG
    };
    
    getApiKey = function()
    {
        return ServerCfg.api_key;
    };
    
    registerDevice = function(apikey)
    {
        api_key     = apikey;
        device      = initAppSrv.getDevice();
        
        var url     = _getUrl("register_device")
        return _postApi(url, api_key, device)
        .then(function(res)
        {
            if(res.config.data)    return initAppSrv.setStatus({"isDeviceRegistered":true, "api_key":api_key});
            else                   return $q.resolve({"result":true, "message":"Errore inatteso, utente registrato, ma device assente"});
        })
        .then(function(res)
        {
            return({"result": true});
        })
        .catch(function(error)
        {
            if(error.headers != null)   return({"result":false, "status": error.status,"message":_onServerError(error)});  // server error
            else                        return $q.reject(error);                                               // generic error (coding)
        });
    };
    
    uploadTrainingData = function(foldername, localfilepath, callback, errorCallback, progressCallback) 
    {
        var api_url = _getUrl("upload_training_session");
        return _uploadFile(localfilepath, api_url, api_key, progressCallback)
        .then(function(sess_id)
        {
            is_training = true;            
            session_id  = sess_id;
            callback(sess_id);
        })
        .catch(function(error) 
        {
            alert(error);
            is_training = false;
            session_id  = 0;
            errorCallback(error);
        });        
    };

    isNetAvailable = function(sess_id)
    {
        if(sess_id != null)  session_id = sess_id;
        else
        {
            if(session_id == 0)         return $q.reject({"message":"Session id is not defined"});
        }
        return _getApi("is_training_session_available", api_key, session_id)
        .then(function(result)
        {
            var respobj = result.data;  //JSON.parse(result.data);                
            var status  = respobj.status;
            if(status == "pending") return null;
            else
            {
                sModelFileName  = respobj.sModelFileName;
                is_training     = false;
                return respobj;
            }
        })
        .catch(function(error) 
        {
            return $q.reject(error);
        });            
    };

    getNet = function(destlocalfolder, callback, errorCallback, progressCallback) 
    {
        if(session_id == null || !session_id.length)
        {
            alert("ERROR: sessionid is empty");
            return;
        }
        var url = _getUrl("get_training_session_network", session_id);
        return _downloadZip(url, destlocalfolder, sModelFileName, progressCallback)
        .then(function(fileentry)
        {
            callback(fileentry);
        })
        .catch(function(error) 
        {
            alert(error);
            errorCallback(error);
        });
    };
    
    // look for pending activities
    getActivities = function() 
    {
        return Promise.resolve(true);
    }; 

    //-----------------------------------------------------------------------------------------------------------------------
    // exchange data with the server
    //  - userVBvocabulary
    //  - vocabularies folder
    //  - training sessions folder
    //  - voicebank folder
    backupData = function(data2backup) 
    {
        // determine upload file list
        // start upload : TODO ..do in background, in the plugin ?
    }; 
    
    restoreData = function(data2restore) 
    {
        // determine download file list
        // start download : TODO ..do in background, in the plugin ?
    }; 
    
    // =======================================================================================================================
    //  PRIVATE
    // =======================================================================================================================
    // do backup
    _postApi = function(url, key, data)
    {
        var req     = {
                        method      : 'POST',
                        url         : url,
                        headers     : {"api_key": key},
                        data        : data                
                    };
       
        return $http(req)        
    }
    
    _getApi = function(apiurl, key, param)
    {
        var url     = _getUrl(apiurl, param);
        var req     = {
                        method      : 'GET',
                        url         : url,
                        headers     : {"api_key": key} 
                    };
       
        return $http(req)        
    }
    
    // compose api url
    _getUrl = function(api_str, param) 
    {
        switch(api_str)
        {
            case "upload_training_session":
                var url = ServerCfg.url + "/api/v1/" + ServerCfg.api[api_str];
                break;
            
            case "is_training_session_available":
                if(param == null || !param.length) return "";   // param is session_uid
                var url = ServerCfg.url + "/api/v1/" + ServerCfg.api[api_str] + "/" + param.toString();
                break;
            
            case "get_training_session_network":
                if(param == null || !param.length) return "";   // param is session_uid
                var url = ServerCfg.url + "/api/v1/" + ServerCfg.api[api_str] + "/" + param.toString() + "/network";
                break;
            
            default:
                var url = ServerCfg.url + "/api/v1/" + ServerCfg.api[api_str];
                break;
        }
        return url;    
    };
    
    _onServerError = function(error)
    {
        var str = "ERRORE: ";
        if(error.data != null )
        {
            switch(error.data.error)
            {
                case "Forbidden":
                    if(error.status == 401)
                        str += "Il codice che hai inserito è sbagliato.\nVerifica di aver inserito il codice corretto e riprova.\nIn caso l'errore si ripresenti, prego contatta il tuo medico"
                    else if(error.status == 403)
                        str += "non specificato. stato: " + error.statusText + ", codice: " + error.status.toString();
                    break;
                case "Wrong request":
                    str += "wrong request. stato: " + error.statusText + ", codice: " + error.status.toString();
                    break;
                case "Required URL does not exist":
                    str += "Required URL does not exist. stato: " + error.statusText + ", codice: " + error.status.toString();

                    break;
            }
        }
        else
        {
            if(error.statusText != "") str += error.statusText + "\n";
            str = "Il server non risponde, controlla la tua connessione o riprova piu tardi.\n";
        };
        return str;        
    }
    
    _onTransferError = function(error)
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
    
    _uploadFile = function(localfilepath, api_url, api_key, progressCallback) 
    {
        fileTransfer = new $cordovaTransfer();

        progressCallback({
            'status': 'uploading',
            'label': 'Uploading audio traces',
            'perc':0
        });
        fileTransfer.onProgress(function(evt) 
        {
            var label = 'Uploading';
            if (evt.lengthComputable) 
            {
                uploadProgress = parseInt(evt.loaded / evt.total * 100);
                label += ' ' + uploadProgress.toString()  + ' %  (' + evt.loaded + '/' + evt.total + ')';
            }
            else                label += '...';
            if(uploadProgress > oldUploadPerc)
            {            
                progressCallback({
                    'status': 'downloading',
                    'label': label,
                    'perc': uploadProgress,
                    'detail': evt
                });      
                oldUploadPerc = uploadProgress;
            }
        });
        
        var filename                = StringSrv.getFileNameExt(localfilepath);
//        var api_url                 = encodeURI(remote_url + api_name);
        
        var resolved_file_path      = FileSystemSrv.getResolvedOutDataFolder() + localfilepath; // file:///storage/....
        resolved_file_path          = resolved_file_path.split("file://")[1];                   // /storage/....
        
        var uploadOptions           = new FileUploadOptions();
        uploadOptions.fileKey       = "file";
        uploadOptions.fileName      = filename;
        uploadOptions.httpMethod    = "POST";
        uploadOptions.chunkedMode   = false,
        uploadOptions.headers       = {"api_key" : api_key};
        
        return fileTransfer.upload(resolved_file_path, api_url, uploadOptions, true)
        .then(function(result) 
        {
            var respobj             = JSON.parse(result.response);
            fileTransfer            = null;
            return respobj.session_uid;
        })
        .catch(function(error) 
        {
            fileTransfer = null;
            return $q.reject({"code":error.code, "message":_onTransferError(error)});
        });        
    };
        
//    _downloadZip = function(fileUrl, outFolder, localFilename, callback, errorCallback, progressCallback) 
    _downloadZip = function(fileUrl, outFolder, localFilename, progressCallback) 
    {
        fileTransfer    = new $cordovaTransfer();

        progressCallback({
            'status': 'downloading',
            'label': 'Downloading model files',
        });
        
        fileTransfer.onProgress(function(evt) 
        {
            var label = 'Downloading';
            if (evt.lengthComputable) 
            {
                downloadProgress = parseInt(evt.loaded / evt.total * 100);
                label += ' ' + downloadProgress.toString()  + ' %  (' + evt.loaded + '/' + evt.total + ')';
            }
            else                label += '...';
            
            if(downloadProgress > oldDownloadPerc)
            {              
                progressCallback({
                    'status': 'downloading',
                    'label': label,
                    'perc':downloadProgress,
                    'detail': evt
                });
                oldDownloadPerc = downloadProgress;
            }
        });
        var resolved_dest_file = FileSystemSrv.getResolvedOutDataFolder() + outFolder + "/" + localFilename;
        return fileTransfer.download(fileUrl, resolved_dest_file, true, {headers:{"api_key":api_key}})
        .then(function(entry) 
        {
            console.log('download complete: ' + entry.toURL());         
            fileTransfer = null;
            return entry;
        })
        .catch(function(error)
        {
            fileTransfer = null;
            return $q.reject({"code":error.code, "message":_onTransferError(error)});
        });
    };      
    
    cancelTransfer = function()
    {
        if(fileTransfer != null)
        {
            fileTransfer.abort();
            fileTransfer = null;
        }
    };
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                        : init,
        getApiKey                   : getApiKey,
        registerDevice              : registerDevice,
        uploadTrainingData          : uploadTrainingData,
        isNetAvailable              : isNetAvailable,
        getNet                      : getNet,
        cancelTransfer              : cancelTransfer,
        getActivities               : getActivities,
        backupData                  : backupData,
        restoreData                 : restoreData
    };  
    //==========================================================================
});
