/*  FileSystemSrv
 * 
 * 
 * 
 * 
 * 
 */

function FileSystemSrv($cordovaFile, $ionicPopup, $q, StringSrv)
{
    var service                         = {}; 
    service.data_storage_root           = "";       // used to get the storage
    service.data_assets_folder          = "";       // "www" : root folder for the assets folder, to be added to any rel path received
    service.resolved_data_storage_root  = "";
    service.resolved_assets_folder      = "";      
    
    service.OVERWRITE                   = 2;
    service.ASK_OVERWRITE               = 1;
    service.PRESERVE_EXISTING           = 0;

    // =========================================================================
    service.init = function(data_storage_root, data_assets_folder)
    {  
        service.data_storage_root           = data_storage_root;
        service.resolved_data_storage_root  = cordova.file[service.data_storage_root];
        
        service.data_assets_folder          = data_assets_folder;
        service.resolved_assets_folder      = cordova.file.applicationDirectory;
        
        return service.resolved_data_storage_root;        
    };
    // =========================================================================
    // FILES
    // =========================================================================    
    // invoke the then, returning 1 or 0, instead of invoking the success or error callbacks
    service.existFile = function(relative_path)
    {
        return $cordovaFile.checkFile(service.resolved_data_storage_root, relative_path)
        .then(function (success){
            return 1;  
        })
        .catch(function (error){
            return $q.resolve(0);
        });        
    };
    
    service.existFileResolved = function(resolved_path)
    {
       var unresolved_path = resolved_path.split(service.getResolvedOutDataFolder())[1];
       return service.existFile(unresolved_path);
    };
    
    // invoke the success callback (then) returning 1 or 0 instead of invoking the success or error callbacks
    // assume a src path relative to =>      /.../assets/www
    service.existWWWAssetFile = function(relative_path)
    {
        return $cordovaFile.checkFile(service.resolved_assets_folder, service.data_assets_folder + "/" + relative_path)
        .then(function (success){
            return 1;  
        })
        .catch(function (error){
            return $q.resolve(0);
        });        
    };
    //--------------------------------------------------------------------------
    service.readJSON = function(relative_path)
    {
        return service.existFile(relative_path)
        .then(function(exist)
        {
            if(!exist)  return $q.reject({message:"ERROR : Attempt to read an existing file (" + relative_path + ")"});
            else        return $cordovaFile.readAsText(service.resolved_data_storage_root, relative_path);
        })        
        .then(function(content) 
        {
            return JSON.parse(content);  
        })
        .catch(function(error)   
        {
            error.message = "ERRORE CRITICO in FileSystemSrv " + error.message;
            return $q.reject(error);
        });        
    };
    
    //--------------------------------------------------------------------------
    // OVERWRITING
    // 2 : overwrite explicitly set to true  => do ovewrite
    // 1 : overwrite not specified           => ask if can overwrite
    // 0 : overwrite explicitly set to false => doesn't ovewrite
    // textobj is {title: 'xxxxxx', template: 'yyyyyyyyyyyyyyyyyyyyy'}
    // returns false if file was not created
    //--------------------------------------------------------------------------
    service.createFile = function(relative_path, jsonstrcontent, overwrite, textobj)
    {
        var _overwrite = 1; // default behaviour: ask before overwriting
        if(overwrite != null)
        {
            if(overwrite)   _overwrite = 2; // overwrite without asking
            else            _overwrite = 0; // do not overwrite
        }
        if(textobj == null) textobj = { title: 'Attenzione', template: 'Il File esiste già, vuoi sovrascriverlo?'}

        //-----------------------------------------------------------------------------------------------------------------------------    
        // already exist?
        return service.existFile(relative_path)
        .then(function(exist)
        {
            if(exist)
            { // exist...see if can overwrite
                switch (_overwrite)
                {
                    case 2:
                        // overwrite
                        return service.overwriteFile(relative_path, jsonstrcontent);
                        
                    case 1:
                        // prompt for overwrite permissions
                        return $ionicPopup.confirm(textobj)
                        .then(function(res) 
                        {
                            if(res)     return service.overwriteFile(relative_path, jsonstrcontent);               
                            else        return false;
                        });
                }
            }
            else    return service._saveFile(relative_path, jsonstrcontent); // file doesn't exist => save it
        });
    };

    //--------------------------------------------------------------------------
    service.createJSONFileFromObj = function(relative_path, obj, overwrite, textobj)
    {
        var str_obj = JSON.stringify(obj);
        return service.createFile(relative_path, str_obj, overwrite, textobj);      
    };    

    //--------------------------------------------------------------------------
    service.updateJSONFileWithObj = function(relative_path, obj, overwrite, textobj)
    {
        return service.readJSON(relative_path)
        .then(function(content)
        {
            for(var item in obj)
                content[item] = obj[item];
            var str_obj = JSON.stringify(content);
            
            return service.createFile(relative_path, str_obj, overwrite, textobj);      
        });
    };    
    //--------------------------------------------------------------------------
    // if file exists, it gives error...so is called internally by :
    // - overwriteFile
    // - createFile
    // after managing what to do with the existing file
    service._saveFile = function(relative_path, content)
    {
        return $cordovaFile.writeFile(service.resolved_data_storage_root, relative_path, content, 1)
        .then(function(){
            console.log("created file " + service.resolved_data_storage_root + relative_path);
            return 1;
        })
        .catch(function(error){
            console.log("FileSystemSrv::_saveFile" + JSON.stringify(error));            
            return $q.reject(error);
        });
    };    
    
    //--------------------------------------------------------------------------
    // BUG !!!!! only works if file doesn't exist...
    // so is called by createFile after having checked that the file doesn't exist
    // patch....first delete the file and then call _saveFile
    // the error raises at line 104 of the DirectoryEntry.js file in the function DirectoryEntry.prototype.getFile
    service.overwriteFile = function(relative_path, content)
    {
        return $cordovaFile.removeFile(service.resolved_data_storage_root, relative_path)
        .then(function(){
           return service._saveFile(relative_path, content); 
        })
        .catch(function(error){
            console.log("FileSystemSrv::overwriteFile" + JSON.stringify(error));            
            return $q.reject(error);
        });
//        return $cordovaFile.writeExistingFile(service.resolved_data_storage_root, relative_path, content)
//        .then(function(){ return 1;}).catch(function(error){ console.log(error.message);  return $q.reject(error);  });
    };    
    
    //--------------------------------------------------------------------------
    // delete target file if existing && force, rename source
    service.renameFile = function(source_relative_path, target_relative_path, overwrite, textobj)
    {
        var _overwrite = 1; // default behaviour: ask before overwriting
        if(overwrite != null)
        {
            if(overwrite)   _overwrite = 2; // overwrite without asking
            else            _overwrite = 0; // do not overwrite
        }
        if(textobj == null) textobj = { title: 'Attenzione', template: 'Il File esiste già, vuoi sovrascriverlo?'}        
        
        //-----------------------------------------------------------------------------------------------------------------------------    
        // already exist?
        return service.existFile(target_relative_path)
        .then(function(exist)
        {
            if(exist)
            { // exist...see if can overwrite
                switch (_overwrite)
                {
                    case 2:
                        // overwrite
                        return service.deleteFile(target_relative_path);
                        
                    case 1:
                        // prompt for overwrite permissions
                        return $ionicPopup.confirm(textobj)
                        .then(function(res) 
                        {
                            if(res)     return service.deleteFile(target_relative_path);               
                            else        return false;
                        });
                }
            }
            else    return true;
        })
        .then(function(dorename){
            if(dorename) return $cordovaFile.moveFile(service.resolved_data_storage_root, source_relative_path, service.resolved_data_storage_root, target_relative_path);
            else        return dorename;
        })
        .catch(function(error){
            console.log("FileSystemSrv::renameFile" + JSON.stringify(error));            
            return $q.reject(error);
        });        
    };
    
    //--------------------------------------------------------------------------
    // returns 0 if did not delete anything
    service.deleteFile = function(relative_path)
    {
        return service.existFile(relative_path)
        .then(function(exist){        
            if (exist)  return $cordovaFile.removeFile(service.resolved_data_storage_root, relative_path);
            else        return false;
        })
        .catch(function(error){
            console.log("FileSystemSrv::deleteFile" + JSON.stringify(error));            
            return $q.reject(error);
        });
    };
    
    service.deleteFilesInFolder = function(relative_path, valid_extensions)
    {
        return service.listFilesInDir(relative_path, valid_extensions)
        .then(function(files)
        {
            var subPromises = [];
            for (var f=0; f<files.length; f++) 
            {
                (function(fname) 
                {
                    var subPromise  = service.deleteFile(fname)
                    subPromises.push(subPromise);
                })(relative_path + "/" + files[f]);
            }
            return $q.all(subPromises);
        })
        .then(function()
        {
            return $q.defer().resolve(1);
        })
        .catch(function(error)
        {
            $q.reject(error);
        });
    };
    //--------------------------------------------------------------------------
    // if source file does NOT exist                                    => reject 
    // overwrite = 1    : if dest file exist, substitute with new one   => return 1
    // overwrite = 0    : if dest file exist, don't do anything         => return 0
    service.copyFromAssets = function(wwwrelative_src_path, relative_dest_path, overwrite)
    {
        if(relative_dest_path == null)  relative_dest_path  = wwwrelative_src_path;
        
        var do_overwrite                                    = (overwrite == null ? true : overwrite);
        var relative_src_path                               = service.data_assets_folder + "/" + wwwrelative_src_path;
        
        return service.existWWWAssetFile(wwwrelative_src_path)     // exists source file ?
        .then(function(exist){        
            if (exist)  return 1;
            else        return $q.reject({"message":"ERROR: Source file (" + wwwrelative_src_path + ") does not exist"});
        })
        .then(function()
        {      
            return service.existFile(relative_dest_path);             // exists dest file ?
        })
        .then(function(exist){        
            if (!exist)  return $cordovaFile.copyFile(service.resolved_assets_folder, relative_src_path, service.resolved_data_storage_root, relative_dest_path); // copyFile(path, fileName, newPath, newFileName)
            else
            {
                // dest file already exists: delete existing and copy src OR skip ?
                if(do_overwrite)
                {
                    return service.deleteFile(relative_dest_path)
                    .then(function(){
                        return $cordovaFile.copyFile(service.resolved_assets_folder, relative_src_path, service.resolved_data_storage_root, relative_dest_path); // copyFile(path, fileName, newPath, newFileName)
                    })
                }
                else return 0;
            }
        })
        .catch(function(error){
            console.log("FileSystemSrv::copyFromAssets" + JSON.stringify(error));            
            return $q.reject(error);
        });
    };
 
    // =========================================================================
    // DIRECTORIES
    // =========================================================================    
    // invoke the success callback (then) returning 1 or 0 instead of invoking the success or error callbacks
    service.existDir = function(relative_path)
    {
        return $cordovaFile.checkDir(service.resolved_data_storage_root, relative_path)
        .then(function (success) {
            return 1;  
        })
        .catch(function (error)   {
            return $q.resolve(0);
        });        
    };
        
    // returns: 0 : directory already existed and force=false
    //          1 : directory was created
    service.createDir = function(relative_path, force)
    {
        if(force == null)   force = 0;
        if (!force)
        {
            return $cordovaFile.checkDir(service.resolved_data_storage_root, relative_path)
            .then(function () {return 0;})   // folder already existed and it was not created
            .catch(function()
            {
                // folder did not exist, create it !
                $cordovaFile.createDir(service.resolved_data_storage_root, relative_path, true)
                .then(function (success) 
                {
                    if (success) 
                    {
                        console.log("created directory", service.resolved_data_storage_root+ relative_path);
                        return 1;
                    }
                })
                .catch(function (error) {
                    console.log("FileSystemSrv::createDir" + JSON.stringify(error));            
                    return $q.reject(error);
                });      
            });   
        }
        else
        {
            $cordovaFile.createDir(service.resolved_data_storage_root, relative_path, true)
            .then(function (success) {
                if (success) {
                    console.log("created directory", service.resolved_data_storage_root+ relative_path);
                    return 1;
                }
            })
            .catch(function(error){
                console.log("FileSystemSrv::createDir" + JSON.stringify(error));            
                return $q.reject(error);
            });            
        }
    };    
    
    //--------------------------------------------------------------------------
    // return [{name:"", isDirectory:true}, ..]
    service.listDir = function(relative_path, contains)
    {
        return $cordovaFile.listDir(service.resolved_data_storage_root, relative_path)
        .then(function(dirs)
        {
            var onlydirs = [];
            for(d=0; d<dirs.length; d++)    
            {
                if(dirs[d].isDirectory)
                {    
                    if(contains != null)
                    {
                        if(dirs[d].name.indexOf(contains) !== -1)
                            onlydirs.push(dirs[d].name);
                    }
                    else    onlydirs.push(dirs[d].name);
                }
            }
            return onlydirs;
        })
        .catch(function(error){
            console.log("FileSystemSrv::listDir" + JSON.stringify(error));            
            return $q.reject(error);
        });
    };
    
    //--------------------------------------------------------------------------
    //return if a folder is empty
    service.isDirEmpty = function(relative_path, valid_extensions)
    {
        return service.countFilesInDir(relative_path, valid_extensions)
        .then(function(files){
            return (files.length ? true : false);
        })
    }
    
    //--------------------------------------------------------------------------
    //return the number of files contained in a folder, belonging to the [valid_extensions] formats.
    service.countFilesInDir = function(relative_path, valid_extensions, contains)
    {
        return service.listFilesInDir(relative_path, valid_extensions, contains)
        .then(function(files){
            return files.length;
        })
    }
    //--------------------------------------------------------------------------
    //return all the files contained in a folder, belonging to the [valid_extensions] formats.
    service.listFilesInDir = function(relative_path, valid_extensions, contains)
    {
        var len_ext = 0;
        if(valid_extensions != null) len_ext = valid_extensions.length;
        
        return $cordovaFile.listDir(service.resolved_data_storage_root, relative_path)
        .then(function(dirs)
        {
            var len = dirs.length;
            var arr = [];
            var cnt = 0;
            for (d=0; d<len; d++)
            {
                if (!dirs[d].isDirectory)
                {
                    var insert = false;
                    if(len_ext)
                    {
                        // filter input files: show only some extensions
                        var ext = StringSrv.getExtension(dirs[d].name);
                        for (e=0; e<valid_extensions.length; e++)
                        {    
                            if( ext == valid_extensions[e])
                            {
                                insert = true; 
                                break;
                            }
                        }
                    }
                    else insert = true;
                    
                    if(contains != null)
                        if(dirs[d].name.indexOf(contains) == -1)
                            insert = false;
                    
                    if(insert)
                    {
                        arr[cnt] = dirs[d].name;
                        cnt++;
                    }
                }
            }
            return arr;            
        })
        .catch(function(error){
            console.log(error.message);
            return $q.reject(error);
        });
    };
    
    //--------------------------------------------------------------------------
    service.deleteDir = function(relative_path)
    {
        return $cordovaFile.removeRecursively(service.resolved_data_storage_root, relative_path)
        .then(function(success){
            console.log("Deleted folder " + relative_path);
            return success;
        })
        .catch(function(error){
            return $q.reject(error);
        });
    };

    // =========================================================================
    // ACCESSORY
    // =========================================================================
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
    
    // returns extension without dot
    service.removeExtension = function(fullname)
    {
        var arr = fullname.split(".");
        arr.splice(-1,1);
        arr.join(".");
        return arr;
    };

    service.getResolvedOutDataFolder = function()
    {
        return service.resolved_data_storage_root;
    };    
    // =========================================================================
    return service;
}
main_module.service('FileSystemSrv', FileSystemSrv);