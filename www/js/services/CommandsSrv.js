/* COMMANDS Service
 * 
 * accessory functions useful for both VB and TV data
 */

main_module.service('CommandsSrv', function($q, FileSystemSrv, StringSrv, FileSystemSrv) 
{
    // for the given command, scan the relpath folder and updates its info
    // updates commands[:].files[] & firstAvailableId & nrepetitions
    // returns:     [{title: String, nrepetitions:int, firstAvailableId:int, files:["vb_123_0.wav", "vb_123_2.wav"]}, ...]
    getCommandFilesByPath = function(command, relpath)
    {    
        if (command == null)   return null;
        return FileSystemSrv.existDir(relpath)
        .then(function(exist)
        {
            if(exist)   return FileSystemSrv.listFilesInDir(relpath, ["wav"])
            else        return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.TRAINFOLDER_NOTEXIST, message:"training folder does not exist"});
        })
        .then(function(files){
            // files = [wav file names with extension]
            return updateCommandFiles(command, files);// update sentence.files[]
        })         
        .catch(function(error){
            error.message = "ERRORE CRITICO in CommandSrv::getCommandFilesByPath, " + error.message;
            return $q.reject(error);
        });         
    };     

    // for an array of commands, scan the relpath folder and updates their info
    // returns:      {title: String, nrepetitions:int, firstAvailableId:int, files:["vb_123_0.wav", "vb_123_2.wav"]}
    getCommandsFilesByPath = function(cmds, relpath)
    {    
        if (cmds == null)   return null;
        return FileSystemSrv.listFilesInDir(relpath, ["wav"])
        .then(function(files){
            // files = [wav file names with extension]
            return updateCommandsFiles(cmds, files);// update sentence.files[]
        })         
        .catch(function(error){
            error.message = "ERRORE CRITICO in CommandSrv::getCommandsFilesByPath " + error.message;
            return $q.reject(error);
        });         
    };     
    
    updateCommandsFiles = function(cmds, files)
    {
        for (s=0; s<cmds.length; s++)
            cmds[s] = updateCommandFiles(cmds[s], files);
        return cmds;
    };     
    
    // calculate audio repetitions number of a given sentence
    // returns: {nrepetitions:int, firstAvailableId:int, files:["vb_123_0.wav", "vb_123_2.wav"]}
    // files is: wav file list with extension (e.g. ["vb_123_11.wav", "vb_123_10.wav", ..., "vb_123_0.wav"] 
    updateCommandFiles = function(command, files)
    {
        command.nrepetitions    = 0;
        command.firstAvailableId= 0;
        command.files           = [];

        var len_files           = files.length;
        var max                 = 0;
        for (f=0; f<len_files; f++)
        {
            var filedata        = getCommandRepetitionData(files[f]);
            if(command.id == filedata.id) 
            {
                if(filedata.nrep > max)    max = filedata.nrep;
                
                command.files[command.nrepetitions] = {label: files[f]};
                command.firstAvailableId            = ++max;
                command.nrepetitions++;
            }            
        }
        return command;
    };     
    
    // calculate last repetition ID of a given command
    // returns: int
    // files is: wav file list (of all commands) with extension (e.g. ["vb_123_11.wav", "vb_123_10.wav", ..., "vb_123_0.wav"] 
//    getFirstAvailable = function(command, files)
//    {
//        return updateCommandFiles(command, files).firstAvailableId;
//    };     
    
    getCommandProperty = function(cmds, sentence_id, property)
    {
        return getCommand(cmds, sentence_id)[property];
    };
    
    getCommand = function(cmds, sentence_id)
    {
        var len_cmds = cmds.length;
        for(v=0; v<len_cmds;v++)
            if(sentence_id == cmds[v].id)
                return cmds[v];                    
    };
    
    getCategoryFromID = function(id)
    {
        return id.toString()[1];
    }

    // convert a file name "prefix_id_rep.wav" => [id, rep] both as int
    getCommandRepetitionData = function(repetition_name)
    {
        var curr_file       = StringSrv.removeExtension(repetition_name);   // xxx_1112_2.wav or xxx_9101_2.wav
        var arr             = curr_file.split("_");
        return {"id":parseInt(arr[1]), "nrep":parseInt(arr[2])};
    };
    
    // compare two folders. 
    // if a file is present in src_path and absent in dest_path :   source => dest
    // if a file is present in both src_path and dest_path      :   dest => backup & source => dest
    // 
    // 1)   I create the backup folder
    // 2)   I get the list of source files
    // 3)   I create the unique list of repetitions to backup & replace
    // 4)   I get the list of dest files
    // 5)   I calculate the list og dest files to be moved to backup folder
    // 6)   I move the latter files
    // 7)   I move all source files to dest one
    mergeDirs = function(src_path, dest_path, backup_path, valid_extensions)
    {
        var source_files = [];
        var dest_files = [];
        
        var source_files = [];
        var dest_files = [];
        
        var uniqueID2replace = [];
        
        var dest_files2backup = [];
        var newpath_of_dest_files2backup = [];

        return FileSystemSrv.createDir(backup_path)                             // 1
        .then(function(res)
        {       
            return FileSystemSrv.listFilesInDir(src_path, valid_extensions);    // 2
        })
        .then(function(srcfiles)
        {
            source_files = srcfiles;
            
            // get unique list of commands to replace                           // 3
            var s_id, addit;
            for(var fs=0; fs<source_files.length; fs++)
            {
                s_id = getCommandRepetitionData(source_files[fs]).id;     
                addit = true;
                for(var c=0; c<uniqueID2replace.length; c++)
                    if(s_id == uniqueID2replace[c]) addit = false;
                if(addit) uniqueID2replace.push(s_id);
            }             

            return FileSystemSrv.listFilesInDir(dest_path, valid_extensions);   // 4
        })
        .then(function(destfiles)
        {
            dest_files = destfiles;
            
            // define dest files to be replaced in the backup folder            
            var s_id, d_id;
            for(var fd=0; fd<dest_files.length; fd++)
            {
                d_id = getCommandRepetitionData(dest_files[fd]).id;
                for(var fs=0; fs<uniqueID2replace.length; fs++)
                {
                    if(d_id == uniqueID2replace[fs])
                    {
                        dest_files2backup.push(dest_path + "/" + dest_files[fd]);
                        newpath_of_dest_files2backup.push(backup_path + "/" + dest_files[fd]);  // 5
                    }
                }
            }
            
            // DO MOVE files 2 backup
            var subPromises = [];
            for (var f=0; f<dest_files2backup.length; f++) 
            {
                (function(src, dest) 
                {
                    var subPromise  = FileSystemSrv.renameFile(src, dest, FileSystemSrv.OVERWRITE);    // force renaming
                    subPromises.push(subPromise);
                })(dest_files2backup[f], newpath_of_dest_files2backup[f]);
            }
            return $q.all(subPromises);                                         // 6
        })
        .then(function()
        {
            // DO MOVE source files to dest folder (recordings_folder)
            var subPromises = [];
            for (var f=0; f<source_files.length; f++) 
            {
                (function(src, dest) 
                {
                    var subPromise  = FileSystemSrv.renameFile(src, dest, FileSystemSrv.OVERWRITE);    // force renaming
                    subPromises.push(subPromise);
                })(src_path + "/" + source_files[f], dest_path + "/" + source_files[f]);
            }
            return $q.all(subPromises);                                         // 7
        })
        .then(function()
        {
            return $q.defer().resolve(true);
        })
        .catch(function(error){
            error.message = "ERRORE CRITICO in CommandSrv::mergeDirs " + error.message;
            return $q.reject(error);
        });        
    };
    //---------------------------------------------------------------------------
    // public methods      
    return {
        getCommandFilesByPath           : getCommandFilesByPath,
        updateCommandsFiles             : updateCommandsFiles,
        updateCommandFiles              : updateCommandFiles,
        getCommandsFilesByPath          : getCommandsFilesByPath,
        getCommandProperty              : getCommandProperty,
        getCommand                      : getCommand,
        getCategoryFromID               : getCategoryFromID,
        mergeDirs                       : mergeDirs
    };
});
