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

main_module.service('RemoteAPISrv', function($http, $q, $cordovaTransfer)
{
    ServerCfg           = null;
    pluginInterface     = null;
    initAppSrv          = null;
    
    device              = null;
    api_key             = "";
    
    isDeviceRegistered  = false;
    
    user                = {};
    user_id             = 0;
    session_id          = 0;
    // ==========================================================================================================================
    // PUBLIC
    // ==========================================================================================================================
    init = function(servercfg, plugin, initappserv)
    {  
        ServerCfg       = servercfg;
        pluginInterface = plugin;
        initAppSrv      = initappserv;
        
        ServerCfg.url   = "http://193.168.1.70:8095";     // OVERWRITE FOR DEBUG
//        ServerCfg.url   = "http://192.168.43.69:8095";     // OVERWRITE FOR DEBUG
    };
    
    getApiKey = function()
    {
        return ServerCfg.api_key;
    };
    
    registerDevice = function(apikey)
    {
        api_key     = apikey;
        device      = initAppSrv.getDevice();
        
        return _postApi("register_device", api_key, device)
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

    isNetAvailable = function(session_id)
    {
        return _getApi("get_training_session_network", api_key, session_id)
    }

    getNet = function(session_id, callback, errorCallback, progressCallback) 
    {
        var api_url = ServerCfg.url + "api/v1/training_sessions/" + session_id + "/network";
        _downloadZip(api_url, outFolder, localFilename, callback, errorCallback, progressCallback) 
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
    _postApi = function(apiurl, key, data)
    {
        var url     = _getUrl(apiurl);
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
        var url = ServerCfg.url + "/api/v1/" + ServerCfg.api[api_str];
        if(param != null && param.length) url = "/" + param.toString();
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
            if (evt.lengthComputable)   label += ' (' + evt.loaded + '/' + evt.total + ')';
            else                        label += '...';
            
            progressCallback({'status': 'downloading', 'label': label, 'detail': evt});
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
        }, errorCallback, false, {headers:{"api_key":api_key}});
    }       
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
        getActivities               : getActivities,
        backupData                  : backupData,
        restoreData                 : restoreData
    };  
    //==========================================================================
});
