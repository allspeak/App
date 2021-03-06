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

main_module.service('VocabularySrv', function($q, $ionicPopup, $state, VoiceBankSrv, CommandsSrv, FileSystemSrv, TfSrv, StringSrv, EnumsSrv, UITextsSrv, ErrorSrv) 
{
    universalJsonFileName   = "";               // training.json
    vocabularies_folder     = "";               // AllSpeak/vocabularies
    recordings_folder       = "";               // AllSpeak/recordings
    voicebank_folder        = "";               // AllSpeak/voicebank
    
    pluginInterface         = null;
    plugin_enum             = null;

    //========================================================================
    // just set inner paths
    init = function(default_paths, plugin, initappsrv)
    {
        voicebank_folder        = default_paths.voicebank_folder;        
        vocabularies_folder     = default_paths.vocabularies_folder;
        recordings_folder       = default_paths.recordings_folder;
        
        universalJsonFileName   = UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;
        
        pluginInterface         = plugin;
        plugin_enum             = pluginInterface.ENUM.PLUGIN;
        
        initAppSrv              = initappsrv;
        
    };

    //====================================================================================================================================================
    //  GET VOCABULARIES 
    //====================================================================================================================================================
    // return all the information associated to a train vocabulary:
    // {voc:{..,.., status:{}, ..., ..}, net: {} }
    getFullTrainVocabularyName = function(uservocabularyname)
    {
        var voc_and_net = null;
        return getTrainVocabularySelectedNet(getTrainVocabularyJsonPath(uservocabularyname))
        .then(function(v_and_c)
        {    
            voc_and_net = v_and_c;
            return getStatus(voc_and_net.voc, voc_and_net.net);
        })
        .then(function(vocstatus)
        { 
            voc_and_net.voc.status = vocstatus;
            return voc_and_net;
        });
    };    
    
    // read the content of a volatile vocabulary.json (given a localfoldername)
    getTrainVocabularyName = function(foldername) 
    {
        return getTrainVocabulary(getTrainVocabularyJsonPath(foldername));
    };
    
    // read the content of a vocabulary.json, checking if the json file exist
    // if not exist:  - try to recover it => returning a voc 
    //                - or reject with mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST whether it was not possible or user did not want to do it.     
    getTrainVocabulary = function(path, ignorerecover) 
    {       
        if(ignorerecover == null) ignorerecover = false;
        
        return FileSystemSrv.existFile(path)            
        .then(function(exist)
        {
            if(exist)   return FileSystemSrv.readJSON(path);
            else        return $q.reject({mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST, message:"ERROR in VocabularySrv::getTrainVocabulary....input file does not exist: " + path + " !"});
        })
        .catch(function(error)
        {
            if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST && !ignorerecover)
            {            
                return recoverMissingVocJsonFile(StringSrv.getFileFolderName(path), StringSrv.getFileFolderName(path))             // error.mydata !exist
                .then(function(voc)
                {
                    if(voc != false)    return $q.resolve(voc);     // go on with the corrected voc.
                    else                return $q.reject(error);    // voc deleted : as user wanted it or there weren't any net
                })              
            }
            else
            {
                error.mymsg = "Error in VocabularySrv::getTrainVocabularySelectedNet : " + error.message;
                console.log(error.mymsg);
                return $q.reject(error);
            }
        })          
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
    
    // look into a folder, load the vocabulary.json 
    // if a net is selected, read its content & then check if the pb file is present
    // returns{voc:vocabulary, net:selected_net | null}
    // or rejects : JSONFILE_NOTEXIST       => mydata = null
    //              NETJSONFILE_NOTEXIST    => mydata = {voc:{}, net:null}
    //              NETPBFILE_NOTEXIST      => mydata = {voc:{}, net:{}}
    getTrainVocabularySelectedNetName = function(foldername) 
    {
        return getTrainVocabularySelectedNet(getTrainVocabularyJsonPath(foldername));
    }
    
    getTrainVocabularySelectedNet = function(path) 
    {
        var voc_and_net = {voc:null, net:null};
        return getTrainVocabulary(path)     
        .then(function(voc) // voc (possibly corrected) or reject {mycode: ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST, ..}
        {
            voc_and_net.voc = voc;
            if(voc.sModelFileName != null && voc.sModelFileName != "")
            {
                var selected_net_relpath = StringSrv.getFileFolder(path) + "/" + voc.sModelFileName + ".json";
                return getTrainVocabulary(selected_net_relpath)
                .catch(function(error)
                {
                    if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST)
                    {
                        error.mycode = ErrorSrv.ENUMS.VOCABULARY.NETJSONFILE_NOTEXIST
                        error.mydata = voc_and_net;     //  voc_and_net={voc:{}, net=null}
                    }
                    return $q.reject(error); 
                })
                .then(function(net)
                { 
                    voc_and_net.net = net;
                    return FileSystemSrv.existFile(StringSrv.getFileFolder(path) + "/" + net.sModelFileName + ".pb");
                })
                .then(function(existpb)
                { 
                    if(!existpb)
                    {
                        var err = {mycode:ErrorSrv.ENUMS.VOCABULARY.NETPBFILE_NOTEXIST, mydata:voc_and_net, message:"selected net pb file is missing"};
                        return $q.reject(err);          //  err.mydata={voc:{}, net={}} but net is invalid !!!
                    }
                    else return voc_and_net;            // {voc:{}, net={}}
                });               
            }
            else   return voc_and_net;                  // {voc:{}, net=null}
        })
        .catch(function(err)
        {
            err.mymsg = "Error in VocabularySrv::getTrainVocabularySelectedNet : " + err.message;
            console.log(err.mymsg);
            return $q.reject(err);
        });
    }; 
 
    // list folder for net_xxxxx.json, return the first (there should be just one when called)
    getNetInFolder = function(folder)
    {
        return FileSystemSrv.listFilesInDir(folder, ["json"], "net_")
        .then(function(files)
        {
            if(files.length)    return getTrainVocabulary(folder + "/" + files[0], false);
            else                return null;
        });
    };
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
    
    // returns [{id,filepath}]
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
                        cmds[t] = {id:id, filepath:voicebank_folder + "/" + vbcmds[v].filename};
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
        return getTrainVocabularyVoicesPaths(voc) // returns [{id,filepath}]
        .then(function(fileslist)
        {
            files = fileslist;
            return FileSystemSrv.existFilesList(fileslist.map(function(item) { return item.filepath;}));
        })
        .then(function(exists)
        {
            var l = files.length;
            for(var f=0; f<l; f++)
                if(!exists[f])  files[f].filepath = "";
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
    
    // returns: String, vocabulary.json full path given a voc folder name
    getNetJsonPath = function(net)
    {
        if(net.sModelFileName.length)   return vocabularies_folder + "/" + net.sLocalFolder + "/" + net.sModelFileName + ".json"; 
        else                            return "";
    };
    
    // returns: String, vocabulary.json full path given a voc folder name
    getTrainVocabularyFolder = function(localfoldername)
    {
        return vocabularies_folder + "/" + localfoldername; 
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
        .then(function(created)
        {
            if(!created)    return $q.reject({"message":"NON HO POTUTO SALVARE IL VOCABOLARIO"});
            else            return voc;
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
                    oldvoc.sLabel           = newLabelname;
                    oldvoc.sLocalFolder     = newLocalFolder;
                    oldvoc.sModelFileName   = "";
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

    // TODO: get list of nets, try to remove server versions
    deleteTrainVocabulary = function(foldername, selectedfoldername, showresult)
    {
        if(showresult == null)  showresult = true;
        
        return FileSystemSrv.deleteDir(getTrainVocabularyFolder(foldername))
        .then(function()
        {
            if(foldername == selectedfoldername)
                return initAppSrv.setStatus({"userActiveVocabularyName":"default"});
            else
               return true;
        })
        .then(function()
        {
            if(showresult)
                return $ionicPopup.alert({title: UITextsSrv.labelAlertTitle, template:UITextsSrv.VOCABULARY.DELETED})
            else
                return true;
        })
    };
    
    // called when vocabulary.json is missing. look for net_XX_XX_XX.json,
    // if at least one exist, retrieve info from first one and set it as selected and a)go to vocabulary or b) return voc
    // if no net_XXXX exist => delete voc and 1) go to vocabularies or 2) return false
    recoverMissingVocJsonFile = function(foldername, selfoldername, okstate, cancelstate) //okstate: vocabulary, cancelstate: vocabularies
    {
        if(selfoldername == null)   selfoldername   = foldername;   // when not specified, if it deletes the vocabulary => select the default
        if(okstate == null)         okstate         = "";
        if(cancelstate == null)     cancelstate     = "";
        
        var relpath = getTrainVocabularyFolder(foldername);
        
        return $ionicPopup.confirm({title: UITextsSrv.labelAlertTitle, 
                                    template: UITextsSrv.VOCABULARY.labelErrorMissingVocabularyJson1 + foldername + UITextsSrv.VOCABULARY.labelErrorMissingVocabularyJson2,
                                    cancelText: UITextsSrv.labelDelete, okText: UITextsSrv.labelRecovery})
        .then(function(res)
        {
            if(res)
            {
                return FileSystemSrv.listFilesInDir(relpath, ["json"], "net_")    // AllSpeak/vocabularies/gigi/   files: net_*
                .then(function(jsonfiles)
                {
                    var subPromises = [];
                    for (var v=0; v<jsonfiles.length; v++) 
                            subPromises.push(getTrainVocabulary(relpath + "/" + jsonfiles[v]));
                        
                    if(subPromises.length)  return $q.all(subPromises);     // gets nets' vocabularies
                    else                    return null;
                })   
                .then(function(nets_or_null)
                {
                    if(nets_or_null)
                    {
                        // there is at least a net, copy data from it
                        var voc = {};
                        voc.sLocalFolder        = foldername;
                        voc.sLabel              = foldername;
                        voc.commands            = nets_or_null[0].commands;
                        voc.nItems2Recognize    = nets_or_null[0].nItems2Recognize;
                        voc.sModelFileName      = nets_or_null[0].sModelFileName;
                        return setTrainVocabulary(voc, FileSystemSrv.OVERWRITE)
                        .then(function()
                        {
                            if(okstate.length)
                            {
                                    $state.go(okstate);
                                    return true;
                            } 
                            else    return voc;
                        })                         
                    }
                    else
                    {
                        // there isn't any net => delete the folder
                        return deleteTrainVocabulary(foldername, selfoldername, false)
                        .then(function()                
                        {     
                            return $ionicPopup.alert({title: UITextsSrv.labelAlertTitle,template: UITextsSrv.VOCABULARY.labelErrorMissingVocabularyJsonVocDeleted})                            
                            .then(function()                
                            {                         
                                if(okstate.length)
                                {                            
                                        $state.go(cancelstate); 
                                        return false;
                                }
                                else    return false;
                            })                        
                        })                            
                    }
                })       
            }
            else
            {
                return deleteTrainVocabulary(foldername, selfoldername)
                .then(function()                
                {                    
                    if(okstate.length)
                    {                            
                            $state.go(cancelstate); 
                            return false;
                    }
                    else    return false;
                })                    
            }
        })
    }
    
    // net's json file is missing:
    // present solution: alert user, set to empty sModelFileName and delete the net pb whether exist. user shall select a new net
    // TODO: try to retrieve the net from the server. 
    recoverMissingNetJsonFile = function(foldername, net_noextension)
    {
        var pb_path = getTrainVocabularyFolder(foldername) + "/" + net_noextension + ".pb";

        return $ionicPopup.alert({title: UITextsSrv.labelAlertTitle, 
                                  template: UITextsSrv.VOCABULARY.labelErrorMissingNetJson})
        .then(function()
        {
            return FileSystemSrv.updateJSONFileWithObj(getTrainVocabularyJsonPath(foldername), {"sModelFileName":""}, FileSystemSrv.OVERWRITE)
        })
        .then(function()
        {
            return FileSystemSrv.deleteFile(pb_path);   // return true if existed, false if did not.
        })
    }
    
    // net's pb file is missing:
    // present solution: set to empty sModelFileName and delete the net json. user shall select a new net
    // TODO: try to retrieve the net from the server
    recoverMissingNetPbFile = function (foldername, net_noextension)
    {
        return recoverMissingNetJsonFile(foldername)
        .then(function ()
        {
            return FileSystemSrv.deleteFile(net_noextension + ".json");
        });
    };    
    //====================================================================================================================================================
    //  CHECK STATUS
    //====================================================================================================================================================  
    // calculate the status of a vocabulary, given a voc object (called by RuntimeStatusSrv.loadVocabulary/Default
    
    getStatus = function(voc, net)
    {
        var vocstatus                       = {};
        vocstatus.vocabularyHasVoices       = false;
        vocstatus.haveValidTrainingSession  = false;
        vocstatus.haveFeatures              = false;        // this is managed in ManageTrainingCtrl page
        vocstatus.haveZip                   = false;
        vocstatus.isNetAvailableLocale      = false;
        vocstatus.isNetLoaded               = false;        

        vocstatus.hasTrainVocabulary        = (voc ? voc.commands.length : false);
        if(!vocstatus.hasTrainVocabulary)   return Promise.resolve(vocstatus);        // ==> NO commands in the vocabulary (may exists but without any commands, as user deleted later all the commands)

        var train_folder                    = recordings_folder; // + "/" + voc.sLocalFolder;
        var zip_file                        = train_folder + "/" + "data.zip";
        
        return hasVoicesTrainVocabulary(voc)                  // ? vocabularyHasVoices
        .then(function(res)
        {
            vocstatus.vocabularyHasVoices   = res;
            
            if(voc.nModelType == plugin_enum.TF_MODELTYPE_COMMON)
            {
                // the default voc cannot be modified or retrained
                vocstatus.isNetLoaded       = TfSrv.isModelLoaded(voc.sLocalFolder);
                return vocstatus;              // ==> NO recordings folder                
            }
            else
            {
                return existCompleteRecordedTrainSession(train_folder, voc, 1)  // ? haveValidTrainingSession : should be called with EnumsSrv.RECORD.SESSION_MIN_REPETITIONS
                .then(function(existtrainsession)
                {
                    // TODO: I put 1...it's problematic
                    vocstatus.haveValidTrainingSession = existtrainsession;
                    return FileSystemSrv.existFile(zip_file);                       // ? haveZip
                })
                .then(function(existzip)
                {
                    vocstatus.haveZip              = (existzip ? true : false);
                    vocstatus.isNetAvailableLocale = (net == null ? false : true);
                    vocstatus.isNetLoaded          = TfSrv.isModelLoaded(voc.sLocalFolder);
                    return vocstatus;
                });        
            }   
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
            
            var subPromises = [];
            for (var v in existingNets) 
            {
                if(existingNets[v].exist)
                    subPromises.push(getTrainVocabulary(existingNets[v].path));
                else
                    subPromises.push(Promise.resolve(true));
            }
            return $q.all(subPromises)// Promises cycle !!    LEGGO CONTENUTO NETS' JSONS
        })
        .then(function(vocs)
        {
            var subPromises = [];    
            var subPromise  = null;
            var id = 0;
            for (var v in existingNets) 
            {           
                if(existingNets[v].exist)
                {
                    existingNets[v].voc = vocs[id];
                    if(vocs[id].sModelFilePath.length)
                        subPromises.push(FileSystemSrv.existFileResolved(vocs[id].sModelFilePath));
                    else
                        subPromises.push(Promise.resolve(false));
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
    };      
    
    // given a foldername, returns an objectarray{pu/pua/pura/ca/cra} with the netobjects of the last net of the two families (1)PURA <= (2) PUA <= (3) PU or (1) CRA (2) CA ...that can recognize
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
    
    // get the temp sessions list (shoulb be ONE at max) and returns it
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
    
    // get all the training wav files, given the vocabulary folder name
    getTrainVocabularyRecordingsName = function(foldername)
    {
        return getTrainVocabularyName(foldername)
        .then(function(voc)
        {
            return getTrainVocabularyRecordings(voc);
        });
    };
    
    // get all the training wav files, given a voc object
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
        
        // GET
        getFullTrainVocabularyName              : getFullTrainVocabularyName,           // returns promise of {voc:train_vocabulary, net:selected net} with a status object in voc
        getTrainVocabulary                      : getTrainVocabulary,                   // returns promise of a train_vocabulary, given a vocabulary.json rel path (AllSpeak/vocabularies/gigi/vocabulary.json)
        getTrainVocabularyName                  : getTrainVocabularyName,               // returns promise of a volatile train_vocabulary, given a foldername
        getTrainVocabularySelectedNet           : getTrainVocabularySelectedNet,        // returns promise of a {voc:train_vocabulary, net:selected net}, given a vocabulary.json rel path (AllSpeak/vocabularies/gigi/vocabulary.json)
        getTrainVocabularySelectedNetName       : getTrainVocabularySelectedNetName,    // returns promise of a {voc:train_vocabulary, net:selected net}, given a foldername (AllSpeak/vocabularies/gigi/vocabulary.json)
        getAllTrainVocabulary                   : getAllTrainVocabulary,                // returns the content of all the vocabulary.json of each vocabulary
        getNetInFolder                          : getNetInFolder,                       // list folder for net_xxxxx.json, return the first (there should be just one when called)

        // SET, MODIFY
        setTrainVocabulary                      : setTrainVocabulary,                   // write train_vocabulary to file
        copyVocabularyName                      : copyVocabularyName,                   // create a copy of the given vocname, named as "newname": returns true/null or error
        copyVocabulary                          : copyVocabulary,                       // create a copy of the given voc, named as "newname": returns true/null or error
        resetVocabularyNets                     : resetVocabularyNets,                  // when commands list change, all the nets must be deleted
        resetVocabulariesNets                   : resetVocabulariesNets,                // call the above method for a list of foldername
        removeCommandFromVocabulary             : removeCommandFromVocabulary,          // remove from the given vocabulary the given command_id
        removeCommandFromVocabularies           : removeCommandFromVocabularies,        // call the above method for a list of foldername
        deleteTrainVocabulary                   : deleteTrainVocabulary,                // delete a vocabulary and if selected, select default
        recoverMissingVocJsonFile               : recoverMissingVocJsonFile,            // when vocabulary.json is missing, but nets are present. TODO: send an alert to developers
        recoverMissingNetJsonFile               : recoverMissingNetJsonFile,            // when net_xxxxxx.json is missing, TODO: send an alert to developers
        recoverMissingNetPbFile                 : recoverMissingNetPbFile,              // when net_xxxxxx.pb   is missing, TODO: send an alert to developers
        
        // get ELEMENTS, STATUS
        existsTrainVocabulary                   : existsTrainVocabulary,                // returns voc.commands.length ? 1 : 0 
        getTrainCommand                         : getTrainCommand,                      // get TV's sentence entry given its ID
        getTrainVocabularyIDs                   : getTrainVocabularyIDs,                // returns [ids] of commands within the train_vocabulary
        getTrainVocabularyIDLabels              : getTrainVocabularyIDLabels,           // returns [labels] of commands within the train_vocabulary
        getTrainCommandsByArrIDs                : getTrainCommandsByArrIDs,             // get array of commands with given IDs
        getTrainVocabularyJsonPath              : getTrainVocabularyJsonPath,           // get the vocabulary.json path given a sLocalFolder or "" if input param is empty
        getNetJsonPath                          : getNetJsonPath,                       // get the json path name (vocabularies/gigi/net_xxxxxx.json) of a given net.
        getTrainVocabularyFolder                : getTrainVocabularyFolder,             // get the rel path of the vocabulary
        getExistingTrainVocabularyJsonPath      : getExistingTrainVocabularyJsonPath,   // get the voc.json path given a sLocalFolder or "" if not existent
        getVocabulariesNamesUsingCommandId      : getVocabulariesNamesUsingCommandId,   // returns [foldername] of vocabularies containing the given command id
        
        getStatus                               : getStatus,                            // {status_obj}:  set 7 flags regarding the availability of the following training components :
        hasVoicesTrainVocabulary                : hasVoicesTrainVocabulary,             // [true | false]:  check if all the to-be-recognized commands have their corresponding playback wav
        hasVoicesTrainVocabularyName            : hasVoicesTrainVocabularyName,         // [true | false]:  check if all the to-be-recognized commands have their corresponding playback wav
        updateTrainVocabularyAudioPresence      : updateTrainVocabularyAudioPresence,   // list wav files in vb folder and updates train_vocabulary[:].nrepetitions
        existCompleteRecordedTrainSession       : existCompleteRecordedTrainSession,    // check if the given train session has at least 5 repetitions of each command
        getTrainVocabularyVoicesPaths           : getTrainVocabularyVoicesPaths,        // get the rel paths of the to-be-recognized wav files 
        getExistingTrainVocabularyVoicesPaths   : getExistingTrainVocabularyVoicesPaths,// get the rel paths of the to-be-recognized wav files, = "" if file is absent 
        
        getTrainVocabularyRecordings            : getTrainVocabularyRecordings,         // get all the training wav files, given a voc object
        getTrainVocabularyRecordingsName        : getTrainVocabularyRecordingsName,     // get all the training wav files, given the vocabulary folder name
        
        getExistingNets                         : getExistingNets,                      // get the available nets within a vocabulary folder
        getExistingLastNets                     : getExistingLastNets,                  // get the LAST (of the two families, PU & CA) available nets within a vocabulary folder,given a foldername (returns an array[2])
        getTempSessions                         : getTempSessions                       // get the temp sessions list (shoulb be ONE at max) and returns it
        
        // REMOVED
//        existFeaturesTrainSession               : existFeaturesTrainSession,            // check if in the given folder, exist one dat file for each wav one
//        getValidTrainVocabularies               : getValidTrainVocabularies,            // returns the list of train vocabularies that can recognize
    };
});


// REMOVED
    
//    // return: boolean
//    // check if the given train session has at least EnumsSrv.RECORD.SESSION_MIN_REPETITIONS repetitions of each command
//    existFeaturesTrainSession = function(audio_relpath) 
//    {
//        var featuresfiles   = [];
//        var audiofiles      = [];
//        
//        var missingfeatures = [];
//        
//        return FileSystemSrv.listFilesInDir(audio_relpath, ["dat"])
//        .then(function(features)
//        {
//            featuresfiles = features;
//            return FileSystemSrv.listFilesInDir(audio_relpath, ["wav"])
//        })
//        .then(function(audios)
//        {
//            audiofiles = audios;
//            var exist = false;
//            var laudio = audiofiles.length;
//            var lfeat = featuresfiles.length;
//            for(var a=0; a<laudio; a++)
//            {
//                var audioname = StringSrv.removeExtension(audiofiles[a])
//                exist = false;
//                for(var f=0; f<lfeat; f++)
//                {
//                    var featurename = StringSrv.removeExtension(featuresfiles[f]);
//                    if(audioname == featurename)    exist = true;
//                }
//                if(!exist)  missingfeatures.push(audioname)
//            }
//            return missingfeatures;
//        });
//    }; 

    
//    // ###################
//    // U N U S E D !!!
//    // given a folder, returns the object of each net that can recognize
//    getValidTrainVocabularies = function(dir)
//    {    
//        var existing_vocs           = [];
//        
//        return FileSystemSrv.listFilesInDir(dir, ["json"], "net_")    // AllSpeak/vocabularies/gigi/   files: net_*
//        .then(function(netjsonfiles)  // array of net file names+ext
//        {
//            var len = netjsonfiles.length;
//            if(len)
//            {
//                var subPromises = [];
//                for (var v=0; v<len; v++) 
//                    subPromises.push(getTrainVocabulary(dir + "/" + netjsonfiles[v]));
//                
//                return $q.all(subPromises);     // gets nets' vocabularies
//            }
//            else return null;
//        })
//        .then(function(vocs_or_null)        
//        {
//            if(vocs_or_null == null || !vocs_or_null.length) return null;
//            
//            existing_vocs   = vocs_or_null;       // vocs has the same ordering as: existing_jsonfiles
//            var len         = existing_vocs.length
//            var subPromises = [];
//            for(var v=0; v<len; v++)
//            {
//                if(voc.sModelFilePath.length)
//                    subPromises.push(FileSystemSrv.existFileResolved(existing_vocs[v].sModelFilePath));
//            }
//            return $q.all(subPromises);
//        })
//        .then(function(trues) 
//        {      
//            if(trues == null)   return null;
//            
//            for(var v=0; v<existing_vocs.length; v++)
//            {
//                if(trues[v])
//                    existing_vocs[v].sStatus = "PRONTO";
//            }
//            return existing_vocs;
//        });
//    };