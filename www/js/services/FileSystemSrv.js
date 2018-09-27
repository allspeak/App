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
    
    // =================================================================================================================================================
    // =================================================================================================================================================
    // =================================================================================================================================================
    // =================================================================================================================================================
    //  FILES
    // =================================================================================================================================================
    // =================================================================================================================================================
    // =================================================================================================================================================
    // =================================================================================================================================================
    // 
    // invoke the then, returning 1 or 0, instead of invoking the success or error callbacks
    service.existFile = function(relative_path, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return $cordovaFile.checkFile(res_root, relative_path)
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
    service.existAssetFile = function(relative_path)
    {
        return $cordovaFile.checkFile(service.resolved_assets_folder, service.data_assets_folder + "/" + relative_path)
        .then(function (success){
            return 1;  
        })
        .catch(function (error){
            return $q.resolve(0);
        });        
    };
    
    service.existFilesList = function(fileslist, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        if(fileslist == null || !fileslist.length) return Promise.reject({message:"input fileslist is empty"});
        
        var subPromises = [];
        for (var f=0; f<fileslist.length; f++) 
            subPromises.push(service.existFile(fileslist[f], res_root));

        return $q.all(subPromises);
    };      
    //--------------------------------------------------------------------------
    service.readJSON = function(relative_path, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return service.existFile(relative_path, res_root)
        .then(function(exist)
        {
            if(!exist)  return $q.reject({message:"ERROR : Attempt to read a NON existing file (" + relative_path + ")"});
            else        return $cordovaFile.readAsText(res_root, relative_path);
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
    service.createFile = function(relative_path, jsonstrcontent, overwrite, textobj, alternative_resolved_root)
    {
        var res_root    = (alternative_resolved_root    ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        var _overwrite  = (overwrite == null            ?   service.ASK_OVERWRITE       :   overwrite); // default behaviour: ask before overwriting
        var _textobj    = (textobj == null              ?   { title: UITextsSrv.labelAlertTitle, template: 'IL FILE ESISTE GIA\'.<br>VUOI SOVRASCRIVERLO ?'}    :   textobj);

        //-----------------------------------------------------------------------------------------------------------------------------    
        // already exist?
        return service.existFile(relative_path, res_root)
        .then(function(exist)
        {
            if(exist)
            { // exist...see if can overwrite
                switch (_overwrite)
                {
                    case service.OVERWRITE:
                        // overwrite
                        return service.overwriteFile(relative_path, jsonstrcontent, res_root);
                        
                    case service.ASK_OVERWRITE:
                        // prompt for overwrite permissions
                        return $ionicPopup.confirm(_textobj)
                        .then(function(res) 
                        {
                            if(res)     return service.overwriteFile(relative_path, jsonstrcontent, res_root);               
                            else        return false;
                        });
                }
            }
            else    return service._saveFile(relative_path, jsonstrcontent, res_root); // file doesn't exist => save it
        });
    };

    //--------------------------------------------------------------------------
    service.createJSONFileFromObj = function(relative_path, obj, overwrite, textobj, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        var str_obj = JSON.stringify(obj);
        return service.createFile(relative_path, str_obj, overwrite, textobj, res_root);      
    };    

    //--------------------------------------------------------------------------
    service.updateJSONFileWithObj = function(relative_path, obj, overwrite, textobj, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return service.readJSON(relative_path, res_root)
        .then(function(content)
        {
            for(var item in obj)
                content[item] = obj[item];
            var str_obj = JSON.stringify(content);
            
            return service.createFile(relative_path, str_obj, overwrite, textobj, res_root);      
        });
    };    
    //--------------------------------------------------------------------------
    // if file exists, it gives error...so is called internally by :
    // - overwriteFile
    // - createFile
    // after managing what to do with the existing file
    service._saveFile = function(relative_path, content, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return $cordovaFile.writeFile(res_root, relative_path, content, 1)
        .then(function(){
            console.log("created file " + res_root + relative_path);
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
    service.overwriteFile = function(relative_path, content, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return $cordovaFile.removeFile(res_root, relative_path)
        .then(function(){
           return service._saveFile(relative_path, content, res_root); 
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
    service.renameFile = function(source_relative_path, target_relative_path, overwrite, textobj, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        var _overwrite = 1; // default behaviour: ask before overwriting
        if(overwrite != null)
        {
            if(overwrite)   _overwrite = 2; // overwrite without asking
            else            _overwrite = 0; // do not overwrite
        }
        if(textobj == null) textobj = { title: UITextsSrv.labelAlertTitle, template: 'Il File esiste già, vuoi sovrascriverlo?'}        
        
        //-----------------------------------------------------------------------------------------------------------------------------    
        // already exist?
        return service.existFile(target_relative_path, res_root)
        .then(function(exist)
        {
            if(exist)
            { // exist...see if can overwrite
                switch (_overwrite)
                {
                    case 2:
                        // overwrite
                        return service.deleteFile(target_relative_path, res_root);
                        
                    case 1:
                        // prompt for overwrite permissions
                        return $ionicPopup.confirm(textobj)
                        .then(function(res) 
                        {
                            if(res)     return service.deleteFile(target_relative_path, res_root);               
                            else        return false;
                        });
                }
            }
            else    return true;
        })
        .then(function(dorename){
            if(dorename) return $cordovaFile.moveFile(res_root, source_relative_path, service.resolved_data_storage_root, target_relative_path);
            else        return dorename;
        })
        .catch(function(error){
            console.log("FileSystemSrv::renameFile" + JSON.stringify(error));            
            return $q.reject(error);
        });        
    };
        
    service.renameFilesInFolder = function(source_relative_folder_path, target_relative_folder_path, valid_extensions, overwrite, textobj, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return service.listFilesInDir(source_relative_folder_path, valid_extensions, res_root)
        .then(function(files)
        {
            var subPromises = [];
            for (var f=0; f<files.length; f++) 
            {
                (function(src_fpath, dest_fpath, ow, to, arr) 
                {
                    var subPromise  = service.renameFile(src_fpath, dest_fpath, ow, to, arr)
                    subPromises.push(subPromise);
                })(source_relative_folder_path + "/" + files[f], target_relative_folder_path + "/" + files[f], overwrite, textobj, res_root);
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
        
    service.copyFilesFromAssetsSubFolder = function(source_wwwrelative_folder_path, target_datarootrelative_folder_path, valid_extensions, overwrite, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return service.listFilesInAssetsSubDir(source_wwwrelative_folder_path, valid_extensions)
        .then(function(files)
        {
            var subPromises = [];
            for (var f=0; f<files.length; f++) 
            {
                (function(src_fpath, dest_fpath, arr) 
                {
                    var subPromise  = service.copyFromAssets(src_fpath, dest_fpath, 1, arr)
                    subPromises.push(subPromise);
                })(source_wwwrelative_folder_path + "/" + files[f], target_datarootrelative_folder_path + "/" + files[f], res_root);
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
    // returns 0 if did not delete anything
    service.deleteFile = function(relative_path, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return service.existFile(relative_path, res_root)
        .then(function(exist){        
            if (exist)  return $cordovaFile.removeFile(res_root, relative_path);
            else        return false;
        })
        .catch(function(error){
            console.log("FileSystemSrv::deleteFile" + JSON.stringify(error));            
            return $q.reject(error);
        });
    };
    
    // delete all files fullfilling valid_extensions/contains and returns their path
    service.deleteFilesInFolder = function(relative_path, valid_extensions, filecontains, alternative_resolved_root)
    {
        var res_root            = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        var filepaths2delete    = [];
        
        return service.listFilesInDir(relative_path, valid_extensions, filecontains, res_root)
        .then(function(files)
        {
            if(files.length)
            {
                var subPromises = [];
                for (var f=0; f<files.length; f++) 
                {
                    filepaths2delete.push(relative_path + "/" + files[f]);
                    subPromises.push(service.deleteFile(relative_path + "/" + files[f], res_root));
                }
                return $q.all(subPromises);
            }
            else return false;
        })
        .then(function(res)
        {
            if(res == false)    return [];
            else                return filepaths2delete;
        });
    };
    //--------------------------------------------------------------------------
    // if source file does NOT exist                                    => reject 
    // overwrite = 1    : if dest file exist, substitute with new one   => return 1
    // overwrite = 0    : if dest file exist, don't do anything         => return 0
    service.copyFromAssets = function(wwwrelative_src_path, relative_dest_path, overwrite, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        if(relative_dest_path == null)  relative_dest_path  = wwwrelative_src_path;
        
        var do_overwrite                                    = (overwrite == null ? true : overwrite);
        var relative_src_path                               = service.data_assets_folder + "/" + wwwrelative_src_path;
        
        return service.existAssetFile(wwwrelative_src_path)     // exists source file ?
        .then(function(exist){        
            if (exist)  return 1;
            else        return $q.reject({"message":"ERROR: Source file (" + wwwrelative_src_path + ") does not exist"});
        })
        .then(function()
        {      
            return service.existFile(relative_dest_path, res_root);             // exists dest file ?
        })
        .then(function(exist){        
            if (!exist)  return $cordovaFile.copyFile(service.resolved_assets_folder, relative_src_path, res_root, relative_dest_path); // copyFile(path, fileName, newPath, newFileName)
            else
            {
                // dest file already exists: delete existing and copy src OR skip ?
                if(do_overwrite)
                {
                    return service.deleteFile(relative_dest_path, res_root)
                    .then(function(){
                        console.log("created file " + res_root + relative_dest_path);  
                        return $cordovaFile.copyFile(service.resolved_assets_folder, relative_src_path, res_root, relative_dest_path); // copyFile(path, fileName, newPath, newFileName)
                    });
                }
                else return 0;
            }
        })
        .catch(function(error){
            console.log("FileSystemSrv::copyFromAssets" + JSON.stringify(error));            
            return $q.reject(error);
        });
    };
 
    // =================================================================================================================================================
    // =================================================================================================================================================
    // =================================================================================================================================================
    // =================================================================================================================================================
    // DIRECTORIES
    // =================================================================================================================================================
    // =================================================================================================================================================
    // =================================================================================================================================================
    // =================================================================================================================================================
    // invoke the success callback (then) returning 1 or 0 instead of invoking the success or error callbacks
    service.existDir = function(relative_path, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return $cordovaFile.checkDir(res_root, relative_path)
        .then(function (success) {
            return 1;  
        })
        .catch(function (error)   {
            return $q.resolve(0);
        });        
    };
        
    // returns: 0 : directory already existed and force=false
    //          1 : directory was created
    service.createDir = function(relative_path, force, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        if(force == null)   force = 0;
        if (!force)
        {
            return $cordovaFile.checkDir(res_root, relative_path)
            .then(function () {return 0;})   // folder already existed and it was not created
            .catch(function()
            {
                // folder did not exist, create it !
                $cordovaFile.createDir(res_root, relative_path, true)
                .then(function (success) 
                {
                    if (success) 
                    {
                        console.log("created directory", res_root + relative_path);
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
            $cordovaFile.createDir(res_root, relative_path, true)
            .then(function (success) {
                if (success) {
                    console.log("created directory", res_root + relative_path);
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
    service.listDir = function(relative_path, foldercontains, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return $cordovaFile.listDir(res_root, relative_path)
        .then(function(dirs)
        {
            return service._filterFolders(dirs, foldercontains);
        })
        .catch(function(error){
            console.log("FileSystemSrv::listDir" + JSON.stringify(error));            
            return $q.reject(error);
        });
    };
    
    //--------------------------------------------------------------------------
    // return [{name:"", isDirectory:true}, ..]
    service.listAssetsSubDir = function(relative_path, foldercontains)
    {
        return $cordovaFile.listDir(service.resolved_assets_folder, service.data_assets_folder + "/" + relative_path)
        .then(function(dirs)
        {
            return service._filterFolders(dirs, foldercontains);
        })
        .catch(function(error){
            console.log("FileSystemSrv::listDir" + JSON.stringify(error));            
            return $q.reject(error);
        });
    };
    
    //--------------------------------------------------------------------------
    //return if a folder is empty
    service.isDirEmpty = function(relative_path, valid_extensions, filecontains, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return service.countFilesInDir(relative_path, valid_extensions, filecontains, res_root)
        .then(function(files){
            return (files.length ? true : false);
        });
    };
    //--------------------------------------------------------------------------
    //return the number of files contained in a folder, belonging to the [valid_extensions] formats.
    service.countFilesInDir = function(relative_path, valid_extensions, filecontains, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return service.listFilesInDir(relative_path, valid_extensions, filecontains, res_root)
        .then(function(files){
            return files.length;
        });
    };
    //--------------------------------------------------------------------------
    //return all the files contained in a folder, belonging to the [valid_extensions] formats.
    // valid_extensions = ["ext1_without_dot", "", ..., ""], 
    // contains = "string"
    service.listFilesInDir = function(relative_path, valid_extensions, filecontains, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return $cordovaFile.listDir(res_root, relative_path)
        .then(function(entries)
        {
            return service._filterFiles(entries, valid_extensions, filecontains);
        })
        .catch(function(error){
            console.log(error.message);
            return $q.reject(error);
        });
    };
    //--------------------------------------------------------------------------
    //return all the files contained in a folder, belonging to the [valid_extensions] formats.
    service.listFilesInAssetsSubDir = function(relative_path, valid_extensions, filecontains)
    {
        return $cordovaFile.listDir(service.resolved_assets_folder, service.data_assets_folder + "/" + relative_path)
        .then(function(dirs) //dirs = [{"isDirectory", "name"}, ..., {}]
        {
            return service._filterFiles(dirs, valid_extensions, filecontains);
        })
        .catch(function(error){
            console.log(error.message);
            return $q.reject(error);
        });
    };

    //--------------------------------------------------------------------------
    service.deleteDir = function(relative_path, alternative_resolved_root)
    {
        var res_root = (alternative_resolved_root   ?   alternative_resolved_root   :   service.resolved_data_storage_root);
        
        return $cordovaFile.removeRecursively(res_root, relative_path)
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
   
    // dirs = [{"isDirectory", "name"}, ..., {}] as returned from $cordovaFile.listDir
    service._filterFolders = function(dirs, contains)
    {
        var onlydirs = [];
        for(var d=0; d<dirs.length; d++)    
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
    };
    
    // dirs = [{"isDirectory", "name"}, ..., {}] as returned from $cordovaFile.listDir
    service._filterFiles = function(dirs, valid_extensions, contains)
    {
        var len_ext = 0;
        if(valid_extensions != null) len_ext = valid_extensions.length;
        
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
    };
    
    service.getResolvedPath = function(unresolved_path)
    {
        return cordova.file[unresolved_path];
    }
    // =========================================================================
    return service;
}
main_module.service('FileSystemSrv', FileSystemSrv);