// VOICEBANK VOCABULARY
// - user voicebank (uVB)   : sentences created by the user (with ID >= 9000)
// - voicebank (VB)         : SUM of default VB (dVB) voc (shipped with App and updated from server) + uVB voc
// 
// content of uVB are added to the VB vocabulary, which is the only VB voc used by the App
// I create a local file of uVB to make persistent the user sentences
// In fact, the App update procedure ships a new dVB voc and deletes the local VB file
// during first start, the VB file is created reading the new dVB voc and inserting the content of the present uVB voc.
// service check if :
// uVB exist ? Y => load it, N => read www version and create the local json with an empty voicebank_usercommands array
// VB exist  ? Y => load it, N => read www version, merge it with the user VB content and create the local json with the voicebank_commands array

// wav files are stored in AllSpeak/voicebank

// commands format:
// ID is defined as following: TCXX
// T = is type      [1: default sentences, 9: user sentences]
// C = is category  [1:7]
// XX is sentence id....in case of 1 digit number, append a "0". eg. second user's sentence of category 2 is : 9202
// 
// NEW USER SENTENCE ?  : both uVB & VB files/structures are updated

main_module.service('VoiceBankSrv', function($http, $q, FileSystemSrv, StringSrv, EnumsSrv, CommandsSrv) 
{
    user_sentences_digit                    = "9";
    usersentences_id                        = 900;
    voicebank_usercommands                = [];
    voicebank_commands                    = null;
    voicebank_commands_by_category        = null;
    commands_categories                   = null;
    
    voicebank_commands_www_path           = "";   //      ./json/voicebank_commands.json
    voicebank_commands_filerel_path       = "";   //      AllSpeak/json/voicebank_commands.json

    voicebank_usercommands_filerel_path   = "";   //      AllSpeak/json/voicebank_usercommands.json
    voicebank_usercommands_www_path       = "";   //      ./json/voicebank_usercommands.json
    
    voicebank_folder                        = "";   //      AllSpeak/voice_bank
    
    //========================================================================
    // set inner paths, load:
    // - voicebank user vocabulary
    // - voicebank global vocabulary (if present read it, if absent merge "default VB voc" with "user VB voc")
    // if the global json does not exist ( actually only the first time !), read from asset folder and copy to a writable one.
    // load the global voc (voice bank) commands and check how many wav file the user did record
    init = function(default_paths)
    {
        voicebank_usercommands_www_path       = default_paths.voicebank_usercommands_www_path;
        voicebank_usercommands_filerel_path   = default_paths.voicebank_usercommands_filerel_path;
                
        voicebank_commands_www_path           = default_paths.voicebank_commands_www_path;
        voicebank_commands_filerel_path       = default_paths.voicebank_commands_filerel_path;

        voicebank_folder                      = default_paths.voicebank_folder;
        
        return FileSystemSrv.existFile(voicebank_usercommands_filerel_path)
        .then(function(exist)
        {
            if(exist)  return getVoiceBankUserVocabulary(voicebank_usercommands_filerel_path);
            else
            {
                // get default global json (in asset folder) and copy its content to a local file
                return _getDefaultVoiceBankUserVocabulary()
                .then(function()
                {
                    var voc_string = JSON.stringify({"voicebank_usercommands":voicebank_usercommands});
                    return FileSystemSrv.createFile(voicebank_usercommands_filerel_path, voc_string); 
                });
            }
        })        
        .then(function()
        {        
            return FileSystemSrv.existFile(voicebank_commands_filerel_path);
        })
        .then(function(exist)
        {
            // if VB  exist, read and use it !
            // if VB !exist, read dVB and integrate it with uVB
            if(exist)  return getVoiceBankVocabulary(voicebank_commands_filerel_path);
            else
            {
                // VB DOES NOT EXIST !!
                // I have to merge the default VB commands with user VB commands.
                // first I get default global json (in asset folder), merge content and copy it to a local file
                return _getDefaultVoiceBankVocabulary()
                .then(function()
                {
                    // merge dVB + uVB vocabularies
                    voicebank_commands    = _mergeVBVocabularies(voicebank_commands, voicebank_usercommands);
                    var voc_string        = JSON.stringify({"commands_categories":commands_categories, "voicebank_commands":voicebank_commands});
                    return FileSystemSrv.createFile(voicebank_commands_filerel_path, voc_string); 
                })
            }
        })
        .then(function()    // get VB voc
        {
            voicebank_commands_by_category = _splitVocabularyByCategory(voicebank_commands)            
            return updateVoiceBankAudioPresence();
        })
        .catch(function(error)
        {
            console.log(error.message)
            return 0;
        });
    };
    //====================================================================================================================================================
    // gets/update uVB & VB
    getVoiceBankVocabulary = function (path) 
    {
        if(voicebank_commands == null)
        {
            if(path)  voicebank_commands_filerel_path = path;
            return FileSystemSrv.readJSON(voicebank_commands_filerel_path)
            .then(function(content)
            {
                voicebank_commands    = content.voicebank_commands;
                commands_categories   = content.commands_categories;
                return voicebank_commands;
            });
        }
        else return Promise.resolve(voicebank_commands);
    };       

    getVoiceBankUserVocabulary = function (path) 
    {
        if(voicebank_usercommands == null)
        {
            if(path)  voicebank_usercommands_filerel_path = path;
            return FileSystemSrv.readJSON(voicebank_usercommands_filerel_path)
            .then(function(content){
                voicebank_usercommands    = content.voicebank_usercommands;
                return voicebank_usercommands;
            });
        }
        else return Promise.resolve(voicebank_usercommands);
    };       

    // ---------------------------------------------------------------------------------------
    // writes uVB & VB
    setVoiceBankVocabulary = function(cmds, overwrite) 
    {
        if(overwrite == null)   overwrite = 1; // will ask by default
        var vb_string   = JSON.stringify({"commands_categories":commands_categories, "voicebank_commands": cmds});
        
        return FileSystemSrv.createFile(voicebank_commands_filerel_path, vb_string, overwrite, { title: 'Attenzione', template: 'Stai aggiornando la lista dei tuoi comandi, sei sicuro?'})
    }; 
    
    setVoiceBankUserVocabulary = function(cmds, usercmds) 
    {
        var vb_string   = JSON.stringify({"commands_categories":commands_categories, "voicebank_commands": cmds});
        var uvb_string  = JSON.stringify({"voicebank_usercommands": usercmds});
        
        return FileSystemSrv.createFile(voicebank_usercommands_filerel_path, uvb_string, 1, { title: 'Attenzione', template: 'Stai aggiornando la lista dei tuoi comandi, sei sicuro?'})
        .then(function()
        {
            return FileSystemSrv.createFile(voicebank_commands_filerel_path, vb_string, 2);   //don't ask anything
        });
    }; 

    setVoiceBankCommandFilename = function(sentence_id, filename)
    {
        var len_cmds = voicebank_commands.length;
        for(v=0; v<len_cmds; v++)
            if(sentence_id == voicebank_commands[v].id)
            {
                voicebank_commands[v].filename = filename;
                break;
            }
        return setVoiceBankVocabulary(voicebank_commands, 2);
    };

    // ---------------------------------------------------------------------------------------
    // update uVB : sentence = { "title": "XXXX", "id": 0, "filename" : "XXXX.wav", "nrepetitions": 0}}
    // id is calculated here as the first available ID of the given category.
    // uVB sentences' ids starts with a "user_sentences_digit" ("9")
    addUserVoiceBankCommand = function(sentencetitle, categoryid, audiofileprefix)
    {
        if(!_isCommandUnique(sentencetitle)) return Promise.resolve(null);
        
        var len = voicebank_commands_by_category[categoryid].length;  // num of existing sentence of the given category
        var max = parseInt(user_sentences_digit + categoryid.toString() + "00") - 1;  // ID(-1) of the first ID of the given category
        
        // calculates first available ID within given category
        var id, type;
        for(s=0; s<len; s++) 
        {
            id      = parseInt(voicebank_commands_by_category[categoryid][s].id);
            type    = id.toString()[0];
            if(type != user_sentences_digit) continue;
            max     = (id > max ? id : max);
        }    
        max++;
        
        var newsentence = {"title":sentencetitle, "id":max, "filename": audiofileprefix + "_" + max + EnumsSrv.RECORD.FILE_EXT, "readablefilename" : StringSrv.format2filesystem(sentencetitle) + EnumsSrv.RECORD.FILE_EXT, "nrepetitions": 0, "editable":true};
        
        var uvbdeepcopy = JSON.parse(JSON.stringify(voicebank_usercommands));
        var vbdeepcopy  = JSON.parse(JSON.stringify(voicebank_commands));
        
        uvbdeepcopy.push(newsentence);
        vbdeepcopy.push(newsentence);
            
        return setVoiceBankUserVocabulary(vbdeepcopy, uvbdeepcopy)
        .then(function()
        {
            voicebank_commands        = vbdeepcopy;
            voicebank_usercommands    = uvbdeepcopy;
            if(voicebank_commands_by_category[categoryid] == null) voicebank_commands_by_category[categoryid] = []; //should not be necessary
            voicebank_commands_by_category[categoryid].push(newsentence);                
//            return voicebank_commands;
            return newsentence;
        });
    };
    
    removeUserVoiceBankCommand = function(sentence)
    {
        var lenvb       = voicebank_commands.length;
        var lenuvb      = voicebank_usercommands.length;
        
        var uvbdeepcopy = JSON.parse(JSON.stringify(voicebank_usercommands));
        var vbdeepcopy  = JSON.parse(JSON.stringify(voicebank_commands));        
        
        var id2remove   = sentence.id;
        var categoryid  = CommandsSrv.getCategoryFromID(id2remove);
        
        for(s=0; s<lenvb;  s++) if(vbdeepcopy[s].id == id2remove)   vbdeepcopy.splice(s,1);
        for(s=0; s<lenuvb; s++) if(uvbdeepcopy[s].id == id2remove)  uvbdeepcopy.splice(s,1);
        
        return setVoiceBankUserVocabulary(vbdeepcopy, uvbdeepcopy)
        .then(function(res)
        {
            voicebank_commands        = vbdeepcopy;
            voicebank_usercommands    = uvbdeepcopy;

            var len = voicebank_commands_by_category[categoryid].length;
            for(s=0; s<len; s++)
                if(voicebank_commands_by_category[categoryid][s].id == sentence.id)
                    voicebank_commands_by_category[categoryid].splice(s,1);
            return voicebank_commands;
        });        
    };

    // ---------------------------------------------------------------------------------------
    // return updated cmds' Audio presence
    updateVoiceBankAudioPresence = function() 
    {
        return CommandsSrv.getCommandsFilesByPath(voicebank_commands, voicebank_folder)
        .then(function(cmds)
        {
            voicebank_commands = cmds;
            return cmds;
        });
    };
     
    // presently never called..ed io la faccio lo stesso !
    updateUserVoiceBankAudioPresence = function() 
    {
        return CommandsSrv.getCommandsFilesByPath(voicebank_usercommands, voicebank_folder)
        .then(function(cmds)
        {
            voicebank_usercommands = cmds;
            return cmds;
        });
    };

    // ---------------------------------------------------------------------------------------
    getVocabularyCategories = function(path)
    {
        return commands_categories;
    };

    getVoiceBankCommand = function(sentence_id) 
    {
        return CommandsSrv.getCommand(voicebank_commands, sentence_id);
    };

    //======================================================================================================================
    //======================================================================================================================
    // P R I V A T E    M E T H O D S 
    //======================================================================================================================
    //======================================================================================================================
    _getDefaultVoiceBankVocabulary = function (path) 
    {
        if(path) voicebank_commands_www_path = path;
        
        return $http.get(voicebank_commands_www_path)
        .then(function(res){
            voicebank_commands                = res.data.voicebank_commands;
            commands_categories               = res.data.commands_categories;
            return voicebank_commands;
        });
    };
    
    _getDefaultVoiceBankUserVocabulary = function (path) 
    {
        if(path) voicebank_usercommands_www_path = path;
        
        return $http.get(voicebank_usercommands_www_path)
        .then(function(res){
            voicebank_usercommands = res.data.voicebank_usercommands;
            return voicebank_usercommands;
        });
    };
        
    _mergeVBVocabularies = function(voc, voc2add)
    {
        var len = voc2add.length;
        for(s=0; s<len; s++) voc.push(voc2add[s]);
        return voc;
    };
    
    _splitVocabularyByCategory = function(cmds)
    {
        var result = [];
        for(var cat in commands_categories) result[commands_categories[cat].id] = [];
        
        var len = cmds.length;
        for(s=0; s<len; s++)
        {
            var id      = cmds[s].id;
            var categ   = CommandsSrv.getCategoryFromID(id); // 1:7  sentence category
            result[categ].push(cmds[s]);
        }
        return result;
    };
    
    _isCommandUnique = function(newsentence)
    {
        var res = true;
        var len = voicebank_commands.length;
        for(s=0; s<len; s++) if(voicebank_commands[s].title == newsentence) return false;
        return res;
    }
    
    //======================================================================================================================
    //======================================================================================================================
    // public methods      
    return {
        init                                : init,                                 // 
        getVoiceBankVocabulary              : getVoiceBankVocabulary,               // returns promise of voicebank_commands
        getVoiceBankUserVocabulary          : getVoiceBankUserVocabulary,           // returns promise of voicebank_user_vocabulary
        
        setVoiceBankVocabulary              : setVoiceBankVocabulary,               // write voicebank_commands to file
        setVoiceBankUserVocabulary          : setVoiceBankUserVocabulary,               // write voicebank_commands to file
        setVoiceBankCommandFilename         : setVoiceBankCommandFilename,         // set filename of the given VB entry, writes to disc

        addUserVoiceBankCommand             : addUserVoiceBankCommand,             // 
        removeUserVoiceBankCommand          : removeUserVoiceBankCommand,          // 

        updateVoiceBankAudioPresence        : updateVoiceBankAudioPresence,         // updates VBvoc[:].nrepetitions
        updateUserVoiceBankAudioPresence    : updateUserVoiceBankAudioPresence,         // updates VBvoc[:].nrepetitions
        
        getVocabularyCategories             : getVocabularyCategories,              // 
        getVoiceBankCommand                 : getVoiceBankCommand                 // get VB sentence entry given its ID
    };
});
