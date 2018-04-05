basically you list files within a folder and then create a promises' array that delete each single file 
works with ionic-native and ionic 1.x
In your controller inject FileSystemSrv and then create this method:

$scope.deleteSession = function() 
{
    FileSystemSrv.init("externalRootDirectory");
    
    return FileSystemSrv.deleteFilesInFolder($scope.relpath, ["wav", "jpg"])       // relpath = "AFolder/asubfolder"
    .then(function()
    {
        // do something  
    })
    .catch(function(error){
        alert(error.message);
    });
};



function FileSystemSrv($cordovaFile, $q)
{
    var service                         = {}; 
    service.data_storage_root           = "";
    service.resolved_data_storage_root  = "";
    
    // =========================================================================
    service.init = function(data_storage_root)
    {  
        service.data_storage_root           = data_storage_root;
        service.resolved_data_storage_root  = cordova.file[service.data_storage_root];
        return service.resolved_data_storage_root;        
    };    
    //--------------------------------------------------------------------------
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
    //--------------------------------------------------------------------------
    service.getExtension = function(fullname)
    {
        var arr = fullname.split(".");
        return arr[arr.length-1];
    };     
    //--------------------------------------------------------------------------
    //return all the files contained in a folder, belonging to the [valid_extensions] formats.
    service.listFilesInDir = function(relative_path, valid_extensions)
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
                        var ext = service.getExtension(dirs[d].name);
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
            console.log("FileSystemSrv::listFilesInDir" + error.message);
            return $q.reject(error);
        });
    };    
    
    service.deleteFile = function(relative_path)
    {
        return service.existFile(relative_path)
        .then(function(exist){        
            if (exist)  return $cordovaFile.removeFile(service.resolved_data_storage_root, relative_path);
            else        return 1;
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
            console.log("FileSystemSrv::deleteFilesInFolder" + JSON.stringify(error));            
            $q.reject(error);
        });
    };
    return service;
}
main_module.service('FileSystemSrv', FileSystemSrv);