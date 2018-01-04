/* COMMANDS Service
 * 
 * accessory functions useful for both VB and TV data
 */

main_module.service('CommandsSrv', function($q, FileSystemSrv, StringSrv, EnumsSrv) 
{
    // for the given command, scan the relpath folder and updates its info
    // updates commands[:].files[] & firstAvailableId & nrepetitions
    // returns:     [{title: String, nrepetitions:int, firstAvailableId:int, files:["vb_123_0.wav", "vb_123_2.wav"]}, ...]
    getCommandFilesByPath = function(command, relpath)
    {    
        if (command == null)   return null;
        return FileSystemSrv.listFilesInDir(relpath, ["wav"])
        .then(function(files){
            // files = [wav file names with extension]
            return updateCommandFiles(command, files);// update sentence.files[]
        })         
        .catch(function(error){
            error.message = "ERRORE CRITICO in CommandSrv::getCommandFilesByPath " + error.message;
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
            var curr_file       = StringSrv.removeExtension(files[f]);   // xxx_1112_2.wav or xxx_9101_2.wav

            var arr             = curr_file.split("_");
            var idfile          = arr[1];
            var rep_num         = arr[2];
            if(command.id == idfile) 
            {
                var             id  = parseInt(rep_num);
                if(id > max)    max = parseInt(id);
                
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
    getFirstAvailable = function(command, files)
    {
        return updateCommandFiles(command, files).firstAvailableId;
    };     
    
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
    //---------------------------------------------------------------------------
    // public methods      
    return {
        getCommandFilesByPath           : getCommandFilesByPath,
        updateCommandsFiles             : updateCommandsFiles,
        updateCommandFiles              : updateCommandFiles,
        getCommandsFilesByPath          : getCommandsFilesByPath,
        getCommandProperty              : getCommandProperty,
        getCommand                      : getCommand,
        getCategoryFromID               : getCategoryFromID
    };
});
