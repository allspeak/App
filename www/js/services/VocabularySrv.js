/* VOCABULARY
 * 
 *  commands are a subset of VB voc
 *  each commands list (a trained vocabulary) have its own folders under : AllSpeak/models & AllSpeak/training_sessions.
 * The former folder contains: train_vocabulary.json & user_net.pb
 *
 * ID is defined as following: TCXX
 * T = is type      [1: default sentences, 9: user sentences]
 * C = is category  [1:7]
 * XX is sentence id....in case of 1 digit number, append a "0". eg. second user's sentence of category 2 is : 9202
 * 
 * NEW USER SENTENCE ?  : both uVB & VB files/structures are updated
*/


// each commands list (a trained vocabulary) have its own folders under : AllSpeak/models & AllSpeak/training_sessions.
// The former folder contains: train_vocabulary.json & user_net.pb

// ID is defined as following: TCXX
// T = is type      [1: default sentences, 9: user sentences]
// C = is category  [1:7]
// XX is sentence id....in case of 1 digit number, append a "0". eg. second user's sentence of category 2 is : 9202
// 
// NEW USER SENTENCE ?  : both uVB & VB files/structures are updated

main_module.service('VocabularySrv', function($q, VoiceBankSrv, CommandsSrv, FileSystemSrv, StringSrv, EnumsSrv) 
{
    vocabulary                            = {"commands":null};// store the currently loaded vocabulary 
    train_vocabulary_filerel_path           = "";               // AllSpeak/vocabularies/GIGI/vocabulary.json
    universalJsonFileName                   = "";               // training.json
    vocabularies_folder                     = "";               // AllSpeak/vocabularies
    training_folder                         = "";               // AllSpeak/training_sessions
    voicebank_folder                        = "";               // AllSpeak/voicebank

    exists_train_vocabulary                 = false;
    //========================================================================
    // set inner paths, load:
    // - voicebank user vocabulary
    // - voicebank global vocabulary (if present read it, if absent merge "default VB voc" with "user VB voc")
    // - training vocabulary
    // returns 1 if a train_vocabulary file has been already created by the user, 0 otherwise.
    // if the global json does not exist ( actually only the first time !), read from asset folder and copy to a writable one.
    // load the global voc (voice bank) commands and check how many wav file the user did record
    // look for a train_vocabulary json, if present load it
    init = function(default_paths)
    {
        training_folder                         = default_paths.training_folder;        
        voicebank_folder                        = default_paths.voicebank_folder;        
        vocabularies_folder                     = default_paths.vocabularies_folder;
        
        train_vocabulary_filerel_path           = "";
        universalJsonFileName                   = "";
        // I DON'T LOAD THE DEFAULT VOC
         
//            // load, if necessary, trainvocabulary & set exists_train_vocabulary
//            return existsTrainVocabulary(train_vocabulary_filerel_path);
//        .catch(function(error)
//        {
//            console.log(error.message)
//            return 0;
//        });
    };

     
    //====================================================================================================================================================
    //====================================================================================================================================================
    //  TRAIN VOCABULARIES 
    //====================================================================================================================================================
    //====================================================================================================================================================
    // if path empty => return current vocabulary
    // else read input json file, updates vocabulary
    // use getTempTrainVocabulary if you don't want to update vocabulary 
    getTrainVocabulary = function (path) 
    {
        if(path == null)
            if(vocabulary.commands != null) return Promise.resolve(vocabulary);
            else                            return Promise.reject({"message":"getTrainVocabulary: empty path and no model loaded"});
        
        train_vocabulary_filerel_path = path;
        return FileSystemSrv.existFile(train_vocabulary_filerel_path)            
        .then(function(exist)
        {
            if(exist)   return FileSystemSrv.readJSON(train_vocabulary_filerel_path);
            else        return null;
        })
        .then(function(content)
        {
            if(content == null)   vocabulary        = {"commands":null};
            else                  vocabulary        = content;

            return vocabulary;
        })
        .catch(function(err)
        {
            alert("Error in VocabularySrv : " + err.message);
            vocabulary        = {"commands":null};
            return vocabulary;
        });
    }; 
    
    // read the content of a volatile vocabulary.json (given a localfoldername), do not update VocabularySrv
    getTempTrainVocabularyName = function(localfoldername) 
    {
        return getTempTrainVocabulary(getTrainVocabularyJsonPath(localfoldername));
    };
    
    // read the content of a volatile vocabulary.json, do not update VocabularySrv
    getTempTrainVocabulary = function(path) 
    {
        return FileSystemSrv.existFile(path)            
        .then(function(exist)
        {
            if(exist)   return FileSystemSrv.readJSON(path);
            else        
            {
                alert("Error in VocabularySrv::getTempTrainVocabulary :  input file does not exist " + path);
                return null;
            }
        })
        .catch(function(err)
        {
            alert("Error in VocabularySrv::getTempTrainVocabulary : " + err.message);
            return null;
        });
    }; 
        
    // train_obj already contains : sLabel, commands[{title,id}], rel_local_path  ...may also contain : nProcessingScheme, nModelType
    // also SET  vocabulary   &    train_vocabulary_filerel_path
    setTrainVocabulary = function(train_obj, filepath) 
    {
        if(train_obj == null)
        {
            var msg = "Error in VocabularySrv::setTrainVocabulary : input train_obj is null";
            return Promise.reject(msg);
        }        
        if(!train_obj.commands.length)
        {
            var msg = "Error in VocabularySrv::setTrainVocabulary : input vocabulary is empty";
            return Promise.reject(msg);
        }        
        if(filepath == null)
        {
            if(train_vocabulary_filerel_path != "")   filepath = train_vocabulary_filerel_path;
            else return Promise.reject("Error in VocabularySrv::setTrainVocabulary : train_vocabulary_filerel_path is empty");
        }
        
        return FileSystemSrv.createFile(filepath, JSON.stringify(train_obj))
        .then(function()
        {
            vocabulary                      = train_obj;
            train_vocabulary_filerel_path   = filepath;
        })
        .catch(function(error)
        {
            vocabulary                      = null;
            train_vocabulary_filerel_path   = "";
            $q.reject(error);
        });
    }; 
    
    // writes a train_obj to disk, without updating current train_obj
    setTempTrainVocabulary = function(train_obj, filepath) 
    {
        if(train_obj == null)
        {
            var msg = "Error in VocabularySrv::setTrainVocabulary : input train_obj is null";
            return Promise.reject(msg);
        }        
        if(!train_obj.commands.length)
        {
            var msg = "Error in VocabularySrv::setTrainVocabulary : input vocabulary is empty";
            return Promise.reject(msg);
        }        
        if(filepath == null)
        {
            if(train_vocabulary_filerel_path != "")   filepath = train_vocabulary_filerel_path;
            else return Promise.reject("Error in VocabularySrv::setTrainVocabulary : train_vocabulary_filerel_path is empty");
        }
        
        return FileSystemSrv.createFile(filepath, JSON.stringify(train_obj));
    }; 
    
    //-----------------------------------------------------------
    // return voc.commands.length ? 1 : 0 
    existsTrainVocabulary = function(foldername)
    {
        var folderpath = vocabularies_folder + "/" + foldername;
        var jsonpath = folderpath + "/" + foldername;
        return getTrainVocabulary(path)
        .then(function(voc)
        {
            if(voc.commands != null)
            {
                if(voc.commands.length)
                {
                    exists_train_vocabulary = true;
                    return true;
                }    
            }
            exists_train_vocabulary = false;
            return exists_train_vocabulary;
        });
    };

    getTrainCommand = function(command_id, voc) 
    {
        if(voc == null)
        {
            if(vocabulary == null)
            {
                alert("ERROR in VocabularySrv::getTrainVocabularyIDs....called with null input and vocabulary null");
                return Promise.reject("ERROR in VocabularySrv::getTrainVocabularyIDs....called with null input and vocabulary null");
            }
            else voc = vocabulary;
        }        
                  
        return CommandsSrv.getCommand(voc.commands, command_id);
    };


    getTrainCommandsByArrIDs = function(arr_ids, voc) 
    {
        if(voc == null)
        {
            if(vocabulary == null)
            {
                alert("ERROR in VocabularySrv::getTrainVocabularyIDs....called with null input and vocabulary null");
                return Promise.reject("ERROR in VocabularySrv::getTrainVocabularyIDs....called with null input and vocabulary null");
            }
            else voc = vocabulary;
        }        
                
        var len_voc     = voc.length;
        var len_ids     = arr_ids.length;
        var cmds   = [];
        
        for (n = 0; n < len_ids; n++)
        {
            var id = arr_ids[n];
            for(v = 0; v < len_voc; v++)
            {
                if(id == voc[v].id)
                {
                    cmds.push(voc.commands[v]);
                    break;
                }
            }
        }
        return cmds;
    };    

    getTrainVocabularyIDLabels = function(voc)
    {
        if(voc == null)
        {
            if(vocabulary == null)
            {
                alert("ERROR in VocabularySrv::getTrainVocabularyIDs....called with null input and vocabulary null");
                return Promise.reject("ERROR in VocabularySrv::getTrainVocabularyIDs....called with null input and vocabulary null");
            }
            else voc = vocabulary;
        }        
        return voc.commands.map(function(item) { return {"title": item.title, "id": item.id} });
//        var ids = [];
//        var len = voc.commands.length;
//        for(s=0; s<len; s++)  ids.push({"title": vocabulary.commands[s].title, "id":voc.commands[s].id});
//        return ids;
    };    

    getTrainVocabularyIDs = function(voc)
    {
        if(voc == null)
        {
            if(vocabulary == null)
            {
                alert("ERROR in VocabularySrv::getTrainVocabularyIDs....called with null input and vocabulary null");
                return Promise.reject("ERROR in VocabularySrv::getTrainVocabularyIDs....called with null input and vocabulary null");
            }
            else voc = vocabulary;
        }        
                 
        return voc.commands.map(function(item) { return item.id });
//        var ids = [];
//        var len = vocabulary.commands.length;
//        for(s=0; s<len; s++)  ids.push(vocabulary.commands[s].id);
//        return ids;
    };    

    // returns: String, vocabulary.json full path given a voc folder name
    getTrainVocabularyJsonPath = function(localfoldername)
    {
        if(localfoldername == null || localfoldername == "")    return "";
        return vocabularies_folder + "/" + localfoldername + "/vocabulary.json"; 
    };

    // returns: String.  determine vocabulary.json full path given a voc folder name, check if exist before returning it
    getExistingTrainVocabularyJsonPath = function(localfoldername)
    {
        var jsonfilepath = getTrainVocabularyJsonPath(localfoldername);
        if(jsonfilepath == "")  return "";
        return FileSystemSrv.existFile(jsonfilepath)
        .then(function(exist)
        {
            if(exist)   return jsonfilepath;
            else        return $q.reject("Error in VocabularySrv. the given localfolder does not have a json");
        })
        .catch(function(error){
            return $q.reject(error);
        });        
    };
    
    // returns: boolean
    // calculate if each training command has its own voicebank audio
    hasVoicesTrainVocabularyName = function(vocfolder) 
    {
        
    }
    // returns: boolean
    // calculate if each training command has its own voicebank audio
    hasVoicesTrainVocabulary = function(voc) 
    {
        if(voc == null)
        {
            if(vocabulary == null)
            {
                alert("ERROR in VocabularySrv::hasVoicesTrainVocabularyByObj....called with null input and vocabulary null");
                return Promise.reject("ERROR in VocabularySrv::hasVoicesTrainVocabularyByObj....called with null input and vocabulary null");
            }
            else voc = vocabulary;
        }        
                
        return VoiceBankSrv.updateVoiceBankAudioPresence()    // update voicebank cmds
        .then(function(vbcmds)
        {
            var lvb = vbcmds.length;
            var lcmds = voc.commands.length;
            for(c=0; c<lcmds; c++)
            {
                var id = voc.commands[c].id;
                for(v=0; v<lvb; v++)
                {
                    var idvb = vbcmds[v].id;
                    if(id == idvb)
                        if(!CommandsSrv.getCommandProperty(vbcmds, idvb, "nrepetitions")) return false;
                }
            }  
            return true;
        });
    };
    
    // updates commands[:].files[] & firstAvailableId & nrepetitions of the voicebank folder, not the training one.
    // thus MUST receive a voc, cannot act on the loaded vocabulary, which must point to the training_sessios content (not voicebank one)
    updateTrainVocabularyAudioPresence = function(audio_relpath, voc) 
    {
        if(voc == null)
        {
            alert("ERROR in VocabularySrv::updateTrainVocabularyAudioPresence....input voc cannot be null");
            return Promise.reject("ERROR in VocabularySrv::updateTrainVocabularyAudioPresence....input voc cannot be null");
        }        
        
        if(audio_relpath == null) audio_relpath = voicebank_folder;
        
        return CommandsSrv.getCommandsFilesByPath(voc.commands, audio_relpath) //updates vocabulary.commands[:].nrepetitions
        .then(function(cmds)
        {
            voc.commands = cmds;
            return voc;    
        });       
    };
    
    // return: boolean
    // check if the given train session has at least EnumsSrv.RECORD.SESSION_MIN_REPETITIONS repetitions of each command
    existCompleteRecordedTrainSession = function(audio_relpath, voc) 
    {
        if(voc == null)
        {
            if(vocabulary == null)
            {
                alert("ERROR in VocabularySrv::existCompleteRecordedTrainSession....called with null input and vocabulary null");
                return Promise.reject("ERROR in VocabularySrv::existCompleteRecordedTrainSession....called with null input and vocabulary null");
            }
            else voc = vocabulary;
        }
        
        return CommandsSrv.getCommandsFilesByPath(voc.commands, audio_relpath)
        .then(function(cmds)
        {
            var len = cmds.length;
            for(c=0; c<len; c++) if(cmds[c].nrepetitions < EnumsSrv.RECORD.SESSION_MIN_REPETITIONS) return false;
            return true;
        });
    };    
    
    // return: boolean
    // check if the given train session has at least EnumsSrv.RECORD.SESSION_MIN_REPETITIONS repetitions of each command
    existFeaturesTrainSession = function(audio_relpath) 
    {
        var featuresfiles   = [];
        var audiofiles      = [];
        
        var missingfeatures = [];
        
        return FileSystemSrv.listFilesInDir(audio_relpath, ["dat"])
        .then(function(features)
        {
            featuresfiles = features;
            return FileSystemSrv.listFilesInDir(audio_relpath, ["wav"])
        })
        .then(function(audios)
        {
            audiofiles = audios;
            var exist = false;
            var laudio = audiofiles.length;
            var lfeat = featuresfiles.length;
            for(var a=0; a<laudio; a++)
            {
                var audioname = StringSrv.removeExtension(audiofiles[a])
                exist = false;
                for(var f=0; f<lfeat; f++)
                {
                    var featurename = StringSrv.removeExtension(featuresfiles[f]);
                    if(audioname == featurename)    exist = true;
                }
                if(!exist)  missingfeatures.push(audioname)
            }
            return missingfeatures;
        });
    };    

    getTrainVocabularyVoicesPaths = function(voc) 
    {
        if(voc == null)
        {
            if(vocabulary == null)
            {
                alert("ERROR in VocabularySrv::getTrainVocabularyVoicesPaths....called with null input and vocabulary null");
                return Promise.reject("ERROR in VocabularySrv::getTrainVocabularyVoicesPaths....called with null input and vocabulary null");
            }
            else                    voc = vocabulary;
        }
        return VoiceBankSrv.getVoiceBankVocabulary()
        .then(function(vbcmds)
        {
            var cmds = [];
            var lent = voc.commands.length;
            var lenv = vbcmds.length;
            for(t=0; t<lent; t++) 
            {
                var id = vocabulary.commands[t].id;
                for(v=0; v<lenv; v++) 
                {
                    if(id == vbcmds[v].id)
                    {
                        cmds[t] = voicebank_folder + "/" + vbcmds[v].filename;
                        break;
                    }
                }
            }
            return cmds;
        });
    };   
    //======================================================================================================================
    //======================================================================================================================
    // public methods      
    
    return {
        init                                : init,                                 // 
        
        getTrainVocabulary                  : getTrainVocabulary,                   // returns promise of train_vocabulary, updates vocabulary
        getTempTrainVocabulary              : getTempTrainVocabulary,               // returns promise of a volatile train_vocabulary, given a vocabulary.json rel path (AllSpeak/vocabularies/gigi/vocabulary.json)
        getTempTrainVocabularyName          : getTempTrainVocabularyName,           // returns promise of a volatile train_vocabulary, given a foldername
        setTrainVocabulary                  : setTrainVocabulary,                   // write train_vocabulary to file
        setTempTrainVocabulary              : setTempTrainVocabulary,               // write train_vocabulary to file

        existsTrainVocabulary               : existsTrainVocabulary,                // returns voc.commands.length ? 1 : 0 
        getTrainCommand                     : getTrainCommand,                      // get TV's sentence entry given its ID
        getTrainVocabularyIDs               : getTrainVocabularyIDs,                // returns [ids] of commands within the train_vocabulary
        getTrainVocabularyIDLabels          : getTrainVocabularyIDLabels,           // returns [labels] of commands within the train_vocabulary
        getTrainCommandsByArrIDs            : getTrainCommandsByArrIDs,             // get array of commands with given IDs
        getTrainVocabularyJsonPath          : getTrainVocabularyJsonPath,           // get the voc.json path given a sLocalFolder or "" if input param is empty
        getExistingTrainVocabularyJsonPath  : getExistingTrainVocabularyJsonPath,   // get the voc.json path given a sLocalFolder or "" if not existent
        
        hasVoicesTrainVocabulary            : hasVoicesTrainVocabulary,             // [true | false]:  check if all the to-be-recognized commands have their corresponding playback wav
        updateTrainVocabularyAudioPresence  : updateTrainVocabularyAudioPresence,   // list wav files in vb folder and updates train_vocabulary[:].nrepetitions
        existCompleteRecordedTrainSession   : existCompleteRecordedTrainSession,    // check if the given train session has at least 5 repetitions of each command
        existFeaturesTrainSession           : existFeaturesTrainSession,            // check if in the given folder, exist one dat file for each wav one
        getTrainVocabularyVoicesPaths       : getTrainVocabularyVoicesPaths        // get the rel paths of the to-be-recognized wav files 
    };
});
