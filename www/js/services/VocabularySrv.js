/* VOCABULARY
 * 
 * its a static service. It doesn't store any variable, just expose methods that manipulate the input VOC.
 * 
 * commands are a subset of VB voc
 * each commands list (a trained vocabulary) have its own folders under : AllSpeak/vocabulary & AllSpeak/recordings.
 * The former folder contains: vocabulary.json & XXXXXX.pb
 *
 * ID is defined as following: TCXX
 * T = is type      [1: default sentences, 9: user sentences]
 * C = is category  [1:7]
 * XX is sentence id....in case of 1 digit number, append a "0". eg. second user's sentence of category 2 is : 9202
 * 
 * NEW USER SENTENCE ?  : both uVB & VB files/structures are updated
*/

main_module.service('VocabularySrv', function($q, VoiceBankSrv, CommandsSrv, FileSystemSrv, TfSrv, StringSrv, EnumsSrv, UITextsSrv, ErrorSrv, MiscellaneousSrv) 
{
    universalJsonFileName                   = "";               // training.json
    vocabularies_folder                     = "";               // AllSpeak/vocabularies
    recordings_folder                       = "";               // AllSpeak/recordings
    voicebank_folder                        = "";               // AllSpeak/voicebank
    
    pluginInterface                         = null;
    plugin_enum                             = null;

    //========================================================================
    // just set inner paths
    init = function(default_paths, plugin)
    {
        voicebank_folder                        = default_paths.voicebank_folder;        
        vocabularies_folder                     = default_paths.vocabularies_folder;
        recordings_folder                       = default_paths.recordings_folder;
        
        universalJsonFileName                   = UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;
        
        pluginInterface     = plugin;
        plugin_enum         = pluginInterface.ENUM.PLUGIN;
    };

    //====================================================================================================================================================
    //  GET VOCABULARIES 
    //====================================================================================================================================================
    // read the content of a volatile vocabulary.json (given a localfoldername)
    getTrainVocabularyName = function(localfoldername) 
    {
        return getExistingTrainVocabularyJsonPath(localfoldername)
        .then(function(jsonpath)
        {
            return getTrainVocabulary(jsonpath)        
        })
    };
    
    // read the content of a vocabulary.json
    getTrainVocabulary = function(path, silentcheck) 
    {
        if(path == null || path == "" || path == false)   return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILEVARIABLE_EMPTY, message:"ERROR in VocabularySrv::getTrainVocabulary....called with null input path"});
        var reportmissing = (silentcheck == null ? true : false);
        
        return FileSystemSrv.existFile(path)            
        .then(function(exist)
        {
            if(exist)   return FileSystemSrv.readJSON(path);
            else        
            {
                if(reportmissing)   alert("Error in VocabularySrv::getTrainVocabulary :  input file does not exist " + path);
                return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST, message:"ERROR in VocabularySrv::getTrainVocabulary....input file does not exist: " + path + " !"});
            }
        })
        .catch(function(err)
        {
            console.log("Error in VocabularySrv::getTrainVocabulary : " + err.message);
            return $q.reject(err);
        });
    }; 
    
    // get the content of all the vocabulary.json of each vocabulary
    getAllTrainVocabulary = function() 
    {
        return FileSystemSrv.listDir(vocabularies_folder)    // AllSpeak/vocabularies/
        .then(function(folders)
        {
            var subPromises = [];
            for (var v=0; v<folders.length; v++) 
                subPromises.push(getTrainVocabulary(vocabularies_folder + "/" + folders[v] + "/" + universalJsonFileName));
            return $q.all(subPromises);
        });        
    };    
    // look into a folder, load the vocabulary.json and if a net is present, read also its content
    // returns{voc:vocabulary, net:selected_net | null}
    getTrainVocabularySelectedNet = function(path, silentcheck) 
    {
        var retvoc = {};
        return getTrainVocabulary(path, silentcheck)
        .then(function(voc)
        {
            retvoc.voc = voc;
            if(voc.sModelFileName != null && voc.sModelFileName != "")
            {
                var selected_net_relpath = StringSrv.getFileFolder(path) + "/" + voc.sModelFileName + ".json";
                return getTrainVocabulary(selected_net_relpath);
            }
            else
                return null;
        })
        .then(function(net)
        {            
            retvoc.net = net;
            return retvoc;
        })
        .catch(function(err)
        {
            console.log("Error in VocabularySrv::getTrainVocabularySelectedNet : " + err.message);
            return $q.reject(err);
        });
    }; 
    
    // given a folder, returns the object of each net that can recognize
    getValidTrainVocabularies = function(dir)
    {    
        var existing_vocs           = [];
        var existing_jsonfiles      = [];
        
        return FileSystemSrv.listFilesInDir(dir, ["json"], "net_")    // AllSpeak/vocabularies/gigi/   files: net_*
        .then(function(jsonfiles)
        {
            existing_jsonfiles = jsonfiles;
            var subPromises = [];
            for (var v=0; v<existing_jsonfiles.length; v++) 
            {
                var jsonfile = existing_jsonfiles[v];
                (function(json_file) 
                {
                    var subPromise  = getTrainVocabulary(json_file);
                    subPromises.push(subPromise);
                })(dir + "/" + jsonfile);           
            }
            if(subPromises.length)  return $q.all(subPromises);     // gets nets' vocabularies
            else                    return null;
        })
        .then(function(vocs)        
        {
            if(vocs == null || !vocs.length) return null;
            
            existing_vocs = vocs;       // vocs has the same ordering as: existing_jsonfiles
            var subPromises = [];
            for(var v=0; v<existing_vocs.length; v++)
            {
                (function(voc) 
                {
                    if(voc.sModelFilePath.length)
                    {
                        var subPromise  = FileSystemSrv.existFileResolved(voc.sModelFilePath);
                        subPromises.push(subPromise);
                    }
                })(existing_vocs[v]);                        
            }
            return $q.all(subPromises);
        })
        .then(function(trues) 
        {      
            if(trues == null)   return null;
            
            for(var v=0; v<existing_vocs.length; v++)
            {
//                existing_vocs[v].jsonpath = existing_jsonfiles[v];
                if(trues[v])
                    existing_vocs[v].sStatus = "PRONTO";
            }
            return existing_vocs;
        });
    };
 
 
 
    // given a foldername, returns an array[2] with the netobjects of the last net of the two families (1)PURA <= (2) PUA <= (3) PU or (1) CRA (2) CA ...that can recognize
    getExistingLastNets = function(uservocabularyname)
    { 
        return getExistingNets(uservocabularyname)
        .then(function(existingnets)
        {
            var lastnets = [null,null];
            // PURE USER
            if(existingnets.pura.exist)
                lastnets[0] = existingnets.pura.voc;
            else
            {
                if(existingnets.pua.exist)
                    lastnets[0] = existingnets.pua.voc;
                else 
                {
                    if(existingnets.pu.exist)
                        lastnets[0] = existingnets.pu.voc;                    
                }
            }
            // COMMON ADAPTED
            if(existingnets.cra.exist)
                lastnets[1] = existingnets.cra.voc;
            else
            {
                if(existingnets.ca.exist)
                    lastnets[1] = existingnets.ca.voc;
            }         
            return lastnets;
        })
    }  
 
    //====================================================================================================================================================
    //  GET SOME COMMANDS
    //==================================================================================================================================================== 
    getTrainCommand = function(command_id, voc) 
    {
        if(voc == null)             return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY, message:"ERROR in VocabularySrv::getTrainCommand....called with null voc"});
        if(voc.commands == null)    return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL, message:"ERROR in VocabularySrv::getTrainCommand....called with empty voc commands"});
        
        return CommandsSrv.getCommand(voc.commands, command_id);
    };

    getTrainCommandsByArrIDs = function(arr_ids, voc) 
    {
        if(voc == null)             return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY, message:"ERROR in VocabularySrv::getTrainCommandsByArrIDs....called with null voc"});
        if(voc.commands == null)    return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL, message:"ERROR in VocabularySrv::getTrainCommandsByArrIDs....called with empty voc commands"});
        if(arr_ids == null)         return Promise.reject({message:"ERROR in VocabularySrv::getTrainCommandsByArrIDs....called with null arr_ids"});
                
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
        if(voc == null)             return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY, message:"ERROR in VocabularySrv::getTrainVocabularyIDLabels....called with null voc"});
        if(voc.commands == null)    return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL, message:"ERROR in VocabularySrv::getTrainVocabularyIDLabels....called with empty voc commands"});
        
        return voc.commands.map(function(item) { return {"title": item.title, "id": item.id} });
    };    

    getTrainVocabularyIDs = function(voc)
    {
        if(voc == null)             return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY, message:"ERROR in VocabularySrv::getTrainVocabularyIDs....called with null voc"});
        if(voc.commands == null)    return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL, message:"ERROR in VocabularySrv::getTrainVocabularyIDs....called with empty voc commands"});
        
        return voc.commands.map(function(item) { return item.id });
    };    

    // get ONLY those VB voc elements that belongs to the training list    // get updated commands[:].files[] & firstAvailableId & nrepetitions looking into the voicebank folder, not the training one.
    // thus MUST receive a voc, cannot act on the loaded vocabulary, which must point to the training_sessios content (not voicebank one)
    updateTrainVocabularyAudioPresence = function(audio_relpath, voc) 
    {
        if(voc == null)             return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY, message:"ERROR in VocabularySrv::updateTrainVocabularyAudioPresence....input voc cannot be null"});
        if(voc.commands == null)    return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL, message:"ERROR in VocabularySrv::updateTrainVocabularyAudioPresence....called with empty voc commands"});
        if(audio_relpath == null)   audio_relpath = voicebank_folder;
        
        return CommandsSrv.getCommandsFilesByPath(voc.commands, audio_relpath) //updates vocabulary.commands[:].nrepetitions
        .then(function(cmds)
        {
            voc.commands = cmds;
            return voc;    
        });       
    };
    
    // get paths of voicebank user-voices-to-playback files associated to vocabulary's commands ( AllSpeak/voicebank/vb_1314.wav )
    // called by RecognitionCtrl::startVoiceActivityMonitoring
    getTrainVocabularyVoicesPaths = function(voc) 
    {
        if(voc == null)             return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY, message:"ERROR in VocabularySrv::getTrainVocabularyVoicesPaths....input voc cannot be null"});
        if(voc.commands == null)    return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL, message:"ERROR in VocabularySrv::getTrainVocabularyVoicesPaths....called with empty voc commands"});
        
        return VoiceBankSrv.getVoiceBankVocabulary()
        .then(function(vbcmds)
        {
            var cmds = [];
            var lent = voc.commands.length;
            var lenv = vbcmds.length;
            for(var t=0; t<lent; t++) 
            {
                cmds[t] = "";
                var id = voc.commands[t].id;
                for(var v=0; v<lenv; v++) 
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
    
    // get paths of voicebank user-voices-to-playback files associated to vocabulary's commands ( AllSpeak/voicebank/vb_1314.wav )
    // if file does not exist, filename=""
    // called by RecognitionCtrl::startVoiceActivityMonitoring
    getExistingTrainVocabularyVoicesPaths = function(voc) 
    {
        var files = [];
        return getTrainVocabularyVoicesPaths(voc)
        .then(function(fileslist)
        {
            files = fileslist;
            return FileSystemSrv.existFilesList(fileslist)
        })
        .then(function(exists)
        {
            var l = files.length;
            for(var f=0; f<l; f++)
                if(!exists[f])  files[f] = "";
            return files;
        });
    };   
 
    //====================================================================================================================================================
    //  GET JSON PATH FROM FOLDER
    //====================================================================================================================================================     
    // returns: String, vocabulary.json full path given a voc folder name
    getTrainVocabularyJsonPath = function(localfoldername)
    {
        return vocabularies_folder + "/" + localfoldername + "/" + UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME; 
    };

    // returns: String.  determine vocabulary.json full path given a voc folder name, check if exist before returning it
    getExistingTrainVocabularyJsonPath = function(localfoldername)
    {
        var jsonfilepath = getTrainVocabularyJsonPath(localfoldername);
        return FileSystemSrv.existFile(jsonfilepath)
        .then(function(exist)
        {
            if(exist)   return jsonfilepath;
            else        return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST, message:"Error in VocabularySrv. the given localfolder does not have a json"});
        })
        .catch(function(error){
            return $q.reject(error);
        });        
    };
 
    getVocabulariesNamesUsingCommandId = function(cmd_id)
    {
        return getAllTrainVocabulary()
        .then(function(vocs)
        {
            var invalid_vocs = [];
            var l = vocs.length;
            for(var v=0; v<l; v++)
            {
                var cmds = vocs[v].commands;
                var ll = cmds.length;
                for(var c=0; c<ll; c++)
                {
                    if(cmds[c].id == cmd_id)
                        invalid_vocs.push(vocs[v].sLocalFolder);
                }
            }
            return invalid_vocs;
        });
    };
    //====================================================================================================================================================
    //  MODIFY VOCABULARIES  
    //====================================================================================================================================================        
    // writes a voc to disk: create vocabulary & training folder + vocabulary.json
    // determines if a voc already exist. if something fails during the process, in case is a new voc, remove all the folders
    setTrainVocabulary = function(voc, overwrite, textobj) 
    {
        if(overwrite == null)   overwrite = FileSystemSrv.ASK_OVERWRITE;
        
        if(voc == null)
        {
            var msg = "Error in VocabularySrv::setTrainVocabulary : input train_obj is null";
            return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY, message:msg});
        }        
        if(voc.commands == null)
        {
            var msg = "Error in VocabularySrv::setTrainVocabulary : input vocabulary is null";
            return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL, message:msg});
        }        
//        if(!voc.commands.length)
//        {
//            var msg = "Error in VocabularySrv::setTrainVocabulary : input vocabulary is empty";
//            return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_EMPTY, message:msg});
//        }    
        
        var vocfile     = getTrainVocabularyJsonPath(voc.sLocalFolder);
        var vocfolder   = vocabularies_folder + "/" + voc.sLocalFolder;
        var trainfolder = recordings_folder; // + "/" + voc.sLocalFolder;
        
        voc.nItems2Recognize = voc.commands.length;
        
        var newvoc      = true;     // I determine if I'm overwriting an existing voc, if not...delete all the folders if something fails
        voc.commands    = voc.commands.map(function(item) { return {"title":item.title, "id":item.id};}); // I write into the json only title & id
        
        return FileSystemSrv.createDir(vocfolder, false)    // return 0 if the folder already exists
        .then(function(created)
        {
            newvoc = created;
            return FileSystemSrv.createDir(trainfolder, false);
        })
        .then(function()
        {
            return FileSystemSrv.createFile(vocfile, JSON.stringify(voc), overwrite, textobj);
        })      
        .catch(function(error)
        {
            // if is a new voc, delete all the folders created and reject error. 
            // if a voc already existed...just reject error
            if(newvoc)
            {
                return FileSystemSrv.deleteDir(vocfolder)
                .then(function()
                {
                    return FileSystemSrv.deleteDir(trainfolder);
                })
                .then(function()
                {
                    return $q.reject(error);
                })             
                .catch(function(error2)
                {
                    return $q.reject(error2);
                });
            }
            return $q.reject(error);
        });
    }; 
    
    // create a copy of the given vocname, named as "newname"
    // returns true/null or error
    copyVocabularyName = function(newLabelname, oldname)
    {
        var newLocalFolder  = StringSrv.format2filesystem(newLabelname);
        var newpath         = vocabulariesFolder + "/" + newLocalFolder;
        
        return FileSystemSrv.existDir(newpath)
        .then(function(existdir)
        {
            if(!existdir)
            {
                return getTrainVocabularyName(oldname)
                .then(function(oldvoc)
                {
                    oldvoc.sLabel       = newLabelname;
                    oldvoc.sLocalFolder = newLocalFolder;
                    return setTrainVocabulary(oldvoc);
                });
            }
            else return null;
        });
    };
    
    // create a copy of the given voc, named as "newname"
    // returns true/null or error
    copyVocabulary = function(newLabelname, oldvoc)
    {
        var newLocalFolder  = StringSrv.format2filesystem(newLabelname);
        var newpath         = vocabulariesFolder + "/" + newLocalFolder;
        
        return FileSystemSrv.existDir(newpath)
        .then(function(existdir)
        {
            if(!existdir)
            {
                oldvoc.sLabel       = newLabelname;
                oldvoc.sLocalFolder = newLocalFolder;
                return setTrainVocabulary(oldvoc);
            }
            else return null;
        });
    };
    
    // delete all net_ files of the given vocabulary and set its sModelFileName->""
    resetVocabularyNets = function(foldername, overwrite)
    {
        var ow = (overwrite == null ?   FileSystemSrv.ASK_OVERWRITE :   overwrite);
        
        return getTrainVocabularyName(foldername)
        .then(function(voc)
        {
            var vocpath = vocabularies_folder + "/" + foldername;
            return FileSystemSrv.deleteFilesInFolder(vocpath, null, "net_"); // delete all "net_xxxxxx" files, either json and pb
        })
        .then(function(voc)
        {
            return FileSystemSrv.updateJSONFileWithObj(getTrainVocabularyJsonPath(foldername), {sModelFileName:""}, ow);
        });     
    };
    
    resetVocabulariesNets = function(foldernames, overwrite)
    {
        var promises = [];
        var l = foldernames.length;
        for(var v=0; v<l; v++)
            promises.push(resetVocabularyNets(foldernames[v], overwrite));
        return $q.all(promises);
    };    
    
    // delete all net_ files of the given vocabulary and set its sModelFileName->""
    removeCommandFromVocabulary = function(foldername, cmd_id, overwrite)
    {
        var ow = (overwrite == null ?   FileSystemSrv.OVERWRITE :   overwrite);
        
        return getTrainVocabularyName(foldername)
        .then(function(voc)
        {
            var cmds    = JSON.parse(JSON.stringify(voc.commands)); // deepcopy of commands
            var lcmds   = cmds.length;
            
            for(var c=0; c<lcmds; c++)
            {
                if(cmds[c].id == cmd_id)
                {
                    cmds.splice(c);
                    break;
                }
            }
            voc.commands            = cmds;
            voc.nItems2Recognize    = cmds.length;
            return FileSystemSrv.updateJSONFileWithObj(getTrainVocabularyJsonPath(foldername), voc, ow);
        });     
    };
        
    removeCommandFromVocabularies = function(foldernames, cmd_id, overwrite)
    {
        var promises = [];
        var l = foldernames.length;
        for(var v=0; v<l; v++)
            promises.push(removeCommandFromVocabulary(foldernames[v], cmd_id, overwrite));
        return $q.all(promises);
    };     

    //====================================================================================================================================================
    //  CHECK STATUS
    //====================================================================================================================================================  
    // calculate the status of a vocabulary, given a voc object (called by RuntimeStatusSrv.loadVocabulary/Default
    getUpdatedStatus = function(voc)
    {
        if(voc.status == null)  voc.status         = {};
        voc.net = null;
        
        voc.status.vocabularyHasVoices             = false;
        voc.status.haveValidTrainingSession        = false;
        voc.status.haveFeatures                    = false;
        voc.status.haveZip                         = false;
        voc.status.isNetAvailableLocale            = false;
        voc.status.isNetLoaded                     = false;        

        voc.status.hasTrainVocabulary              = (voc ? voc.commands.length : false);
        if(!voc.status.hasTrainVocabulary) return Promise.resolve(voc);        // ==> NO commands in the vocabulary (may exists but without any commands, as user deleted later all the commands)

        var voc_folder                  = vocabularies_folder + "/" + voc.sLocalFolder;
        var train_folder                = recordings_folder; // + "/" + voc.sLocalFolder;
        var zip_file                    = train_folder + "/" + "data.zip";
        var selmodelpath                = "";
        
        return hasVoicesTrainVocabulary(voc)                  // ? vocabularyHasVoices
        .then(function(res)
        {
            voc.status.vocabularyHasVoices = res;
            
            if(voc.nModelType == plugin_enum.TF_MODELTYPE_COMMON)
            {
                // the default voc cannot be modified or retrained
                voc.status.isNetLoaded  = TfSrv.isModelLoaded(voc.sLocalFolder);
                return voc;     // ==> NO recordings folder                
            }
            else
            {
                return existCompleteRecordedTrainSession(train_folder, voc)  // ? haveValidTrainingSession
                .then(function(existtrainsession)
                {
                    // TODO: should set to existtrainsession....but it's problematic
                    voc.status.haveValidTrainingSession = true;
                    return existFeaturesTrainSession(train_folder);   // ? haveFeatures
                })
                .then(function(res)
                {
                    voc.status.haveFeatures = res; //(!res.length ?   true    :   false);
                    return FileSystemSrv.existFile(zip_file);                       // ? haveZip
                })
                .then(function(existzip)
                {
                    voc.status.haveZip = (existzip ? true : false);
                    if(voc.sModelFileName != null)
                        if(voc.sModelFileName.length)
                            selmodelpath = vocabularies_folder + "/" + voc.sLocalFolder  + "/" + voc.sModelFileName + ".json";

                    if(selmodelpath != "")  return getTrainVocabulary(selmodelpath) 
                    else                    return null;
                    
                })
                .then(function(net_or_null)
                {  
                    if(net_or_null)
                    {
                        voc.net = net_or_null
                        var selnetpath = vocabularies_folder + "/" + voc.sLocalFolder  + "/" + voc.sModelFileName + ".pb";
                        return FileSystemSrv.existFile(selnetpath)
                    }
                    else                    return false;
                })
                .then(function(existmodel)
                {
                    voc.status.isNetAvailableLocale    = existmodel;
                    voc.status.isNetLoaded             = TfSrv.isModelLoaded(voc.sLocalFolder);
                    return voc;
                });        
            }   
        })
    }
    
    // calculate the status of a vocabulary, given a voc folder.
    // it can not be empty...thus go on processing
    getUpdatedStatusName = function(uservocabularyname)
    {
        if(uservocabularyname == null || uservocabularyname == "") return getUpdatedStatus(null);
        vocabularyjsonpath = vocabularies_folder + "/" + uservocabularyname + "/" + UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;

        return getTrainVocabulary(vocabularyjsonpath)
        .then(function(voc)
        {    
            return getUpdatedStatus(voc);
        });
    };    
    
    // return voc.commands.length ? 1 : 0 
    existsTrainVocabulary = function(localfoldername)
    {
        return getExistingTrainVocabularyJsonPath(localfoldername)
        .then(function(jsonfilepath)
        {        
            return getTrainVocabulary(jsonfilepath)
        })
        .then(function(voc)
        {
            if(voc)
               if(voc.commands != null) return true;
            return false;
        })
        .catch(function(error)
        {
            if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST) return $q.resolve(false);   // raised by getExistingTrainVocabularyJsonPath: the vocabulary.json file does not exist
            else                                                            return $q.reject(error);
        });
    };

    // returns: boolean
    // calculate if each training command has its own voicebank audio
    hasVoicesTrainVocabularyName = function(localfoldername) 
    {
        return getTrainVocabularyName(localfoldername)   
        .then(function(voc)
        {
            return hasVoicesTrainVocabulary(voc);
        })
    };
    // returns: boolean
    // calculate if each training command has its own voicebank audio
    hasVoicesTrainVocabulary = function(voc) 
    {
        if(voc == null)             return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY, message:"ERROR in VocabularySrv::hasVoicesTrainVocabulary....input voc cannot be null"});
        if(voc.commands == null)    return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL, message:"ERROR in VocabularySrv::hasVoicesTrainVocabulary....called with empty voc commands"});
                
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
                        if(!CommandsSrv.getCommandProperty(vbcmds, idvb, "nrepetitions")) 
                            return false;
                }
            }  
            return true;
        });
    };

    // return: boolean 
    // check if the given train session has at least EnumsSrv.RECORD.SESSION_MIN_REPETITIONS repetitions of each command
    existCompleteRecordedTrainSession = function(audio_relpath, voc, min_num_rep) 
    {
        if(min_num_rep == null) min_num_rep = EnumsSrv.RECORD.SESSION_MIN_REPETITIONS;
        
        if(voc == null)             return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY, message:"ERROR in VocabularySrv::existCompleteRecordedTrainSession....input voc cannot be null"});
        if(voc.commands == null)    return Promise.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL, message:"ERROR in VocabularySrv::existCompleteRecordedTrainSession....called with empty voc commands"});
        
        return CommandsSrv.getCommandsFilesByPath(voc.commands, audio_relpath)
        .then(function(cmds)
        {
            var len = cmds.length;
            for(c=0; c<len; c++) if(cmds[c].nrepetitions < min_num_rep) return false;
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
    
    // returns existingNets{{exist, path, voc},..,{exist, path, voc}}
    getExistingNets = function(uservocabularyname)
    {    
        var voc_relpath = vocabularies_folder + "/" + uservocabularyname
        var existingNets = {
            "pu":   {"exist":false, path:"", "voc":{}},
            "pua":  {"exist":false, path:"", "voc":{}},
            "ca":   {"exist":false, path:"", "voc":{}},
            "pura": {"exist":false, path:"", "voc":{}},
            "cra":  {"exist":false, path:"", "voc":{}}
        };
        
        return FileSystemSrv.listFilesInDir(voc_relpath , ["json"], "net_")
        .then(function(jsonnames)
        {
            for(var j in jsonnames)
            {
                var jsonname    = jsonnames[j];
                var vocpath     = voc_relpath + "/" + jsonname;

                var modeltype = parseInt(jsonname.split("_")[1]);
                switch(modeltype)
                {
                    case plugin_enum.TF_MODELTYPE_COMMON:
                        break;
                        
                    case plugin_enum.TF_MODELTYPE_USER:
                        existingNets.pu.exist = true;
                        existingNets.pu.path = vocpath;
                        break;

                    case plugin_enum.TF_MODELTYPE_USER_ADAPTED:
                        existingNets.pua.exist = true;
                        existingNets.pua.path = vocpath;
                        break;

                    case plugin_enum.TF_MODELTYPE_COMMON_ADAPTED:
                        existingNets.ca.exist = true;
                        existingNets.ca.path = vocpath;
                        break;

                    case plugin_enum.TF_MODELTYPE_USER_READAPTED:
                        existingNets.pura.exist = true;
                        existingNets.pura.path = vocpath;
                        break;

                    case plugin_enum.TF_MODELTYPE_COMMON_READAPTED:
                        existingNets.cra.exist = true;
                        existingNets.cra.path = vocpath;
                        break;

                    default:
                        var errortxt = "Errore. Il codice del modello è sconosciuto. \nIl nome del file e : " + jsonname;
                        return $q.reject({"message":errortxt });
                }
            }
            // Promises cycle !!    LEGGO CONTENUTO NETS' JSONS
            var subPromises = [];
//            for (var v=0; v<jsonnames.length; v++) 
            for (var v in existingNets) 
            {
                if(existingNets[v].exist)
                {
                    (function(netpath) 
                    {
                        subPromises.push(getTrainVocabulary(netpath));
                    })(existingNets[v].path);           
                }
                else
                    subPromises.push(Promise.resolve(true));
            }
            return $q.all(subPromises)
        })
        .then(function(vocs)
        {
            var subPromises = [];            
            var id = 0;
            for (var v in existingNets) 
            {           
                if(existingNets[v].exist)
                {
                    existingNets[v].voc = vocs[id];
                    (function(voc) 
                    {
                        if(voc.sModelFilePath.length)
                            var subPromise  = FileSystemSrv.existFileResolved(voc.sModelFilePath)
                        subPromises.push(subPromise);
                    })(existingNets[v].voc);                       
                    
                }
                else subPromises.push(Promise.resolve(true));
                id++;
            }
            return $q.all(subPromises); // Promises cycle !!    VERIFICO PRESENZA PBS
        })
        .then(function(netexists)
        {   
            var id = 0;            
            for (var v in existingNets) 
            {           
                if(existingNets[v].exist)
                {
                    if(netexists[id])
                        existingNets[v].voc.sStatus = "PRONTO";
                    else
                    {
                        var e = {"message":"La rete " + existingNets[v].voc.sModelFilePath + " e\' assente"};
                        return $q.reject(e);                                     
                    }
                }  
                id++;
            }
//            console.log(MiscellaneousSrv.printObjectArray(existingNets));
            return existingNets;
        })
        .catch(function(error)
        {
           return $q.reject(error); 
        }); 
    };      
    
    
    // given a foldername, returns an array[2] with the netobjects of the last net of the two families (1)PURA <= (2) PUA <= (3) PU or (1) CRA (2) CA ...that can recognize
    getExistingLastNets = function(uservocabularyname)
    { 
        return getExistingNets(uservocabularyname)
        .then(function(existingnets)
        {
            var lastnets = {};
            // PURE USER
            if(existingnets.pura.exist)
            {
                lastnets.pura = existingnets.pura;
                lastnets.pura.voc.sLabel2 = "UTENTE";
            }
            else
            {
                if(existingnets.pua.exist)
                {
                    lastnets.pua = existingnets.pua;
                    lastnets.pua.voc.sLabel2 = "UTENTE";
                }
                else 
                {
                    if(existingnets.pu.exist)
                    {
                        lastnets.pu = existingnets.pu;                    
                        lastnets.pu.voc.sLabel2 = "UTENTE";
                    }
                }
            }
            // COMMON ADAPTED
            if(existingnets.cra.exist)
            {
                lastnets.cra = existingnets.cra;
                lastnets.cra.voc.sLabel2 = "COMUNE ADATTATA";
            }
            else
            {
                if(existingnets.ca.exist)
                {
                    lastnets.ca = existingnets.ca;
                    lastnets.ca.voc.sLabel2 = "COMUNE ADATTATA";
                }
            }         
            return lastnets;
        })
    }   
    
    getTempSessions = function(temp_session_folder)     //  vocabularies/gigi/train_....
    {
        var temp_voc        = null;
        var temp_voc_name   = "";
        var exist_netjson   = false;
        var exist_pb        = false;
        var res             = 0;
        
        return FileSystemSrv.listFilesInDir(temp_session_folder, ["json"], "net_")
        .then(function(jsonnameslist)
        {
            if(jsonnameslist.length)
            {
                temp_voc_name = jsonnameslist[0];    // at least one net_*json is present : TODO verify only one is present...manage exception
                exist_netjson = true;
                return FileSystemSrv.readJSON(temp_session_folder + "/" + temp_voc_name);
            }
            else return FileSystemSrv.readJSON(temp_session_folder + "/" + universalJsonFileName);       // no "net_****.json" is present ==> read "vocabulary.json"
        })
        .then(function(voc) // can be like uploaded json + sessionid, or valid if net is to be downloaded
        {
            temp_voc = voc;
            return FileSystemSrv.countFilesInDir(temp_session_folder, ["pb"]); // check pb presence
        })
        .then(function(npb)
        {
            if(npb)  exist_pb = true;      // pb is present
                                                                    // presumably is:
            if(!exist_netjson        && !exist_pb)   res = 1;       // crashed/aborted training => delete it !
            else if(exist_netjson    && !exist_pb)   res = 2;       // valid train, still to be download => ask to download | delete it | cancel
            else if(exist_netjson    &&  exist_pb)   res = 3;       // valid train, under local evaluation => ask whether confirming | delete it | cancel
            return {"res":res, "path":temp_session_folder, voc:temp_voc, voc_name:temp_voc_name};
        });       
    };
    
    getTrainVocabularyRecordingsName = function(foldername)
    {
        return getTrainVocabularyName(foldername)
        .then(function(voc)
        {
            return getTrainVocabularyRecordings(voc);
        });
    };
    
    getTrainVocabularyRecordings = function(voc)
    {
        var recordings              = [];
        var ncmds                   = voc.commands.length;
        
        var subPromises = [];
        for (var cmd=0; cmd<ncmds; cmd++) 
        {
            var subPromise  = FileSystemSrv.listFilesInDir(recordings_folder, ["wav"], "_" + voc.commands[cmd].id.toString() + "_");
            subPromises.push(subPromise);
        }
        if(!subPromises.length) 
            return Promise.resolve(null);
        else                    
            return $q.all(subPromises) 
            .then(function(arr_arr_wavs)
            {
                var wavs = [];
                var l = arr_arr_wavs.length;
                for(var w=0; w<l; w++)
                {
                    var ll = arr_arr_wavs[w].length;
                    for(ww=0; ww<ll; ww++)
                        wavs.push(arr_arr_wavs[w][ww]);
                }
                return wavs;
            });        
    };
    //====================================================================================================================================================
    // public methods      
    //====================================================================================================================================================  
    return {
        init                                    : init,                                 // 
        
        getTrainVocabulary                      : getTrainVocabulary,                   // returns promise of a train_vocabulary, given a vocabulary.json rel path (AllSpeak/vocabularies/gigi/vocabulary.json)
        getAllTrainVocabulary                   : getAllTrainVocabulary,                // returns the content of all the vocabulary.json of each vocabulary
        getTrainVocabularySelectedNet           : getTrainVocabularySelectedNet,        // returns promise of a {voc:train_vocabulary, net:selected net}, given a vocabulary.json rel path (AllSpeak/vocabularies/gigi/vocabulary.json)
        getTrainVocabularyName                  : getTrainVocabularyName,               // returns promise of a volatile train_vocabulary, given a foldername
        getValidTrainVocabularies               : getValidTrainVocabularies,            // returns the list of train vocabularies that can recognize

        setTrainVocabulary                      : setTrainVocabulary,                   // write train_vocabulary to file
        copyVocabularyName                      : copyVocabularyName,                   // create a copy of the given vocname, named as "newname": returns true/null or error
        copyVocabulary                          : copyVocabulary,                       // create a copy of the given voc, named as "newname": returns true/null or error
        resetVocabularyNets                     : resetVocabularyNets,                  // when commands list change, all the nets must be deleted
        resetVocabulariesNets                   : resetVocabulariesNets,                // call the above method for a list of foldername
        removeCommandFromVocabulary             : removeCommandFromVocabulary,          // remove from the given vocabulary the given command_id
        removeCommandFromVocabularies           : removeCommandFromVocabularies,      // call the above method for a list of foldername

        existsTrainVocabulary                   : existsTrainVocabulary,                // returns voc.commands.length ? 1 : 0 
        getTrainCommand                         : getTrainCommand,                      // get TV's sentence entry given its ID
        getTrainVocabularyIDs                   : getTrainVocabularyIDs,                // returns [ids] of commands within the train_vocabulary
        getTrainVocabularyIDLabels              : getTrainVocabularyIDLabels,           // returns [labels] of commands within the train_vocabulary
        getTrainCommandsByArrIDs                : getTrainCommandsByArrIDs,             // get array of commands with given IDs
        getTrainVocabularyJsonPath              : getTrainVocabularyJsonPath,           // get the vocabulary.json path given a sLocalFolder or "" if input param is empty
        getExistingTrainVocabularyJsonPath      : getExistingTrainVocabularyJsonPath,   // get the voc.json path given a sLocalFolder or "" if not existent
        getVocabulariesNamesUsingCommandId      : getVocabulariesNamesUsingCommandId,   // returns [foldername] of vocabularies containing the given command id
        
        getUpdatedStatus                        : getUpdatedStatus,                     // {status_obj}:  set 7 flags regarding the availability of the following training components :
        getUpdatedStatusName                    : getUpdatedStatusName,                 // cmds, rec, feature, zip, remote model, local model
        hasVoicesTrainVocabulary                : hasVoicesTrainVocabulary,             // [true | false]:  check if all the to-be-recognized commands have their corresponding playback wav
        hasVoicesTrainVocabularyName            : hasVoicesTrainVocabularyName,         // [true | false]:  check if all the to-be-recognized commands have their corresponding playback wav
        updateTrainVocabularyAudioPresence      : updateTrainVocabularyAudioPresence,   // list wav files in vb folder and updates train_vocabulary[:].nrepetitions
        existCompleteRecordedTrainSession       : existCompleteRecordedTrainSession,    // check if the given train session has at least 5 repetitions of each command
        existFeaturesTrainSession               : existFeaturesTrainSession,            // check if in the given folder, exist one dat file for each wav one
        getTrainVocabularyVoicesPaths           : getTrainVocabularyVoicesPaths,        // get the rel paths of the to-be-recognized wav files 
        getExistingTrainVocabularyVoicesPaths   : getExistingTrainVocabularyVoicesPaths,// get the rel paths of the to-be-recognized wav files, = "" if file is absent 
        
        getTrainVocabularyRecordings            : getTrainVocabularyRecordings,         // get all the training wav files, given a voc object
        getTrainVocabularyRecordingsName        : getTrainVocabularyRecordingsName,     // get all the training wav files, given the vocabulary folder name
        
        getExistingNets                         : getExistingNets,                      // get the available nets within a vocabulary folder
        getExistingLastNets                     : getExistingLastNets,                  // get the LAST (of the two families, PU & CA) available nets within a vocabulary folder,given a foldername (returns an array[2])
        getTempSessions                         : getTempSessions                       // get the temp sessions list (shoulb be ONE at max) and returns it
    };
});