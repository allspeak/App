// 3 vocabulary exist:
// - user voicebank (uVB)   : sentences created by the user (with ID >= 9000)
// - voicebank (VB)         : SUM of default VB (dVB) voc (shipped with App and updated from server) + uVB voc
// - training               : subset of VB voc

// content of uVB are added to the VB vocabulary, which is the only VB voc used by the App
// I create a local file of uVB to make persistent the user sentences
// In fact, the App update procedure ships a new dVB voc and deletes the local VB file
// during first start, the VB file is created reading the new dVB voc and inserting the content of the present uVB voc.
// service check if :
// uVB exist ? Y=> load it, N=> read www version and create the local json with an empty voicebank_uservocabulary array
// VB exist  ? Y=> load it, N=> read www version, merge it with the user VB content and create the local json with the voicebank_vocabulary array

// ID is defined as following: TCXX
// T = is type      [1: default sentences, 9: user sentences]
// C = is category  [1:7]
// XX is sentence id....in case of 1 digit number, append a "0". eg. second user's sentence of category 2 is : 9202
// 
// NEW USER SENTENCE ?  : both uVB & VB files/structures are updated

main_module.service('VocabularySrv', function($http, $q, FileSystemSrv, StringSrv, EnumsSrv) 
{
    user_sentences_digit                    = "9";
    usersentences_id                        = 900;
    voicebank_uservocabulary                = [];
    voicebank_vocabulary                    = null;
    voicebank_vocabulary_by_category        = null;
    vocabulary_categories                   = null;
    
    train_object                            = {"vocabulary":null};
    
    voicebank_vocabulary_www_path           = "";   //      ./json/voicebank_vocabulary.json
    voicebank_vocabulary_filerel_path       = "";   //      AllSpeak/json/voicebank_vocabulary.json

    voicebank_uservocabulary_filerel_path   = "";   //      AllSpeak/json/voicebank_uservocabulary.json
    voicebank_uservocabulary_www_path       = "";   //      ./json/voicebank_uservocabulary.json

    train_vocabulary_filerel_path           = "";   //      AllSpeak/training_sessions/default/train_vocabulary.json
    
    voicebank_folder                        = "";   //      AllSpeak/voice_bank
    training_folder                         = "";   //      AllSpeak/audio_files
    
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
    initApp = function(default_paths)
    {
        voicebank_uservocabulary_www_path       = default_paths.voicebank_uservocabulary_www_path;
        voicebank_uservocabulary_filerel_path   = default_paths.voicebank_uservocabulary_filerel_path;
                
        voicebank_vocabulary_www_path           = default_paths.voicebank_vocabulary_www_path;
        voicebank_vocabulary_filerel_path       = default_paths.voicebank_vocabulary_filerel_path;
        
        train_vocabulary_filerel_path           = default_paths.train_vocabulary_filerel_path;
        
        voicebank_folder                        = default_paths.voicebank_folder;
        training_folder                         = default_paths.training_folder;
        
        return FileSystemSrv.existFile(voicebank_uservocabulary_filerel_path)
        .then(function(exist)
        {
            if(exist)  return getVoiceBankUserVocabulary(voicebank_uservocabulary_filerel_path);
            else
            {
                // get default global json (in asset folder) and copy its content to a local file
                return _getDefaultVoiceBankUserVocabulary()
                .then(function()
                {
                    var voc_string = JSON.stringify({"voicebank_uservocabulary":voicebank_uservocabulary});
                    return FileSystemSrv.createFile(voicebank_uservocabulary_filerel_path, voc_string); 
                });
            }
        })        
        .then(function()
        {        
            return FileSystemSrv.existFile(voicebank_vocabulary_filerel_path);
        })
        .then(function(exist)
        {
            // if VB  exist, read and use it !
            // if VB !exist, read dVB and integrate it with uVB
            if(exist)  return getVoiceBankVocabulary(voicebank_vocabulary_filerel_path);
            else
            {
                // VB DOES NOT EXIST !!
                // I have to merge the default VB vocabulary with user VB vocabulary.
                // first I get default global json (in asset folder), merge content and copy it to a local file
                return _getDefaultVoiceBankVocabulary()
                .then(function()
                {
                    // merge dVB + uVB vocabularies
                    voicebank_vocabulary    = _mergeVBVocabularies(voicebank_vocabulary, voicebank_uservocabulary);
                    var voc_string          = JSON.stringify({"vocabulary_categories":vocabulary_categories, "voicebank_vocabulary":voicebank_vocabulary});
                    return FileSystemSrv.createFile(voicebank_vocabulary_filerel_path, voc_string); 
                })
            }
        })
        .then(function()
        {
            voicebank_vocabulary_by_category = _splitVocabularyByCategory(voicebank_vocabulary)            
            return checkVoiceBankAudioPresence();
        })
        .then(function()
        {            
            // load, if necessary, trainvocabulary & set exists_train_vocabulary
            return existsTrainVocabulary(train_vocabulary_filerel_path);
        })
        .catch(function(error)
        {
            console.log(error.message)
            return 0;
        });
    };
    
    // same as init but for...if train_vocabulary is empty...copy voice_bank to it.
    // doesn't check for voicebank audio presence
    initRecorder = function(default_paths)
    {
        voicebank_vocabulary_www_path       = default_paths.voicebank_vocabulary_www_path;
        voicebank_vocabulary_filerel_path   = default_paths.voicebank_vocabulary_filerel_path;
        train_vocabulary_filerel_path       = default_paths.train_vocabulary_filerel_path;
        
        voicebank_folder                    = default_paths.voicebank_folder;
        training_folder                     = default_paths.training_folder;
        
        return FileSystemSrv.existFile(voicebank_vocabulary_filerel_path)
        .then(function(exist)
        {
            if(exist)  return getVoiceBankVocabulary(voicebank_vocabulary_filerel_path);
            else
            {
                // get default global json (in asset folder) and copy its content to a local file
                return _getDefaultVoiceBankVocabulary()
                .then(function()
                {
                    var voc_string = JSON.stringify({"vocabulary_categories":vocabulary_categories, "voicebank_vocabulary":voicebank_vocabulary});
                    return FileSystemSrv.createFile(voicebank_vocabulary_filerel_path, voc_string); 
                })
            }
        })
        .then(function()
        {            
            return FileSystemSrv.existFile(train_vocabulary_filerel_path)
        })
        .then(function(exist)
        {
            if(exist)  return getTrainVocabulary(train_vocabulary_filerel_path);
            else
            {
                train_vocabulary = {"train_vocabulary": voicebank_vocabulary};
                var voc_string = JSON.stringify(train_vocabulary);
                return FileSystemSrv.createFile(train_vocabulary_filerel_path, voc_string); 
            }
        })
        .catch(function(error)
        {
            console.log(error.message);
            return 0;
        });
    };
    
    //==========================================================================
    // get the 3 vocabularies (& fill the corresponding internal properties)
    //==========================================================================
    getVoiceBankVocabulary = function (path) 
    {
        if(voicebank_vocabulary == null)
        {
            if(path)  voicebank_vocabulary_filerel_path = path;
            return FileSystemSrv.readJSON(voicebank_vocabulary_filerel_path)
            .then(function(content){
                voicebank_vocabulary    = content.voicebank_vocabulary;
                vocabulary_categories   = content.vocabulary_categories;
                return voicebank_vocabulary;
            });
        }
        else return Promise.resolve(voicebank_vocabulary);
    };       

    getVoiceBankUserVocabulary = function (path) 
    {
        if(voicebank_uservocabulary == null)
        {
            if(path)  voicebank_uservocabulary_filerel_path = path;
            return FileSystemSrv.readJSON(voicebank_uservocabulary_filerel_path)
            .then(function(content){
                voicebank_uservocabulary    = content.voicebank_uservocabulary;
                return voicebank_uservocabulary;
            });
        }
        else return Promise.resolve(voicebank_uservocabulary);
    };       

    getVocabularyCategories = function(path)
    {
        return vocabulary_categories;
    };
    
    setVoiceBankVocabulary = function(vbvoc, overwrite) 
    {
        if(overwrite == null)   overwrite = 1; // will ask by default
        var vb_string   = JSON.stringify({"vocabulary_categories":vocabulary_categories, "voicebank_vocabulary": vbvoc});
        
        return FileSystemSrv.createFile(voicebank_vocabulary_filerel_path, vb_string, overwrite, { title: 'Attenzione', template: 'Stai aggiornando la lista dei tuoi comandi, sei sicuro?'})
    }; 
       
    setVoiceBankSentenceFilename = function(sentence_id, filename)
    {
        var len_voc = voicebank_vocabulary.length;
        for(v=0; v<len_voc;v++)
            if(sentence_id == voicebank_vocabulary[v].id)
            {
                voicebank_vocabulary[v].filename = filename;
                break;
            }
        return setVoiceBankVocabulary(voicebank_vocabulary, 2);
    };

    getVoiceBankSentence = function(sentence_id) 
    {
        return _getSentence(voicebank_vocabulary, sentence_id);
    };

    checkVoiceBankAudioPresence = function() 
    {
        return _checkVocabularyAudioPresence(voicebank_vocabulary, voicebank_folder)
        .then(function(voc)
        {
            voicebank_vocabulary = voc;
            return voc;
        });
    };
        
    // ---------------------------------------------------------------------------------------
    // ---------------------------------------------------------------------------------------
    // ---------------------------------------------------------------------------------------
    // writes uVB & VB
    setVoiceBankUserVocabulary = function(vbvoc, uservbvoc) 
    {
        var vb_string   = JSON.stringify({"vocabulary_categories":vocabulary_categories, "voicebank_vocabulary": vbvoc});
        var uvb_string  = JSON.stringify({"voicebank_uservocabulary": uservbvoc});
        
        return FileSystemSrv.createFile(voicebank_uservocabulary_filerel_path, uvb_string, 1, { title: 'Attenzione', template: 'Stai aggiornando la lista dei tuoi comandi, sei sicuro?'})
        .then(function()
        {
            return FileSystemSrv.createFile(voicebank_vocabulary_filerel_path, vb_string, 2);   //don't ask anything
        });
    }; 

    // called by CONTROLLERS
    // update uVB : sentence = { "title": "XXXX", "id": 0, "filename" : "XXXX.wav", "existwav": 0}}
    // id is calculated here as the first available ID of the given category.
    // uVB sentences' ids starts with a "user_sentences_digit" ("9")
    addUserVoiceBankSentence = function(sentencetitle, categoryid, audiofileprefix)
    {
        if(!_isSentenceUnique(sentencetitle)) return 0;
        
        var len = voicebank_vocabulary_by_category[categoryid].length;  // num of existing sentence of the given category
        var max = parseInt(user_sentences_digit + categoryid.toString() + "00") - 1;  // ID(-1) of the first ID of the given category
        
        // calculates first available ID within given category
        var id, type;
        for(s=0; s<len; s++) 
        {
            id      = parseInt(voicebank_vocabulary_by_category[categoryid][s].id);
            type    = id.toString()[0];
            if(type != user_sentences_digit) continue;
            max     = (id > max ? id : max);
        }    
        max++;
        
        var newsentence = {"title":sentencetitle, "id":max, "filename": audiofileprefix + "_" + max + EnumsSrv.RECORD.FILE_EXT, "readablefilename" : StringSrv.format2filesystem(sentencetitle) + EnumsSrv.RECORD.FILE_EXT, "existwav": 0, "editable":true};
        
        var uvbdeepcopy = JSON.parse(JSON.stringify(voicebank_uservocabulary));
        var vbdeepcopy  = JSON.parse(JSON.stringify(voicebank_vocabulary));
        
        uvbdeepcopy.push(newsentence);
        vbdeepcopy.push(newsentence);
            
        return setVoiceBankUserVocabulary(vbdeepcopy, uvbdeepcopy)
        .then(function(res)
        {
            voicebank_vocabulary        = vbdeepcopy;
            voicebank_uservocabulary    = uvbdeepcopy;
            if(voicebank_vocabulary_by_category[categoryid] == null) voicebank_vocabulary_by_category[categoryid] = []; //should not be necessary
            voicebank_vocabulary_by_category[categoryid].push(newsentence);                
            return voicebank_vocabulary;
        });
    };
    
    removeUserVoiceBankSentence = function(sentence)
    {
        var lenvb       = voicebank_vocabulary.length;
        var lenuvb      = voicebank_uservocabulary.length;
        
        var uvbdeepcopy = JSON.parse(JSON.stringify(voicebank_uservocabulary));
        var vbdeepcopy  = JSON.parse(JSON.stringify(voicebank_vocabulary));        
        
        var id2remove   = sentence.id;
        var categoryid  = _getCategoryFromID(id2remove);
        
        for(s=0; s<lenvb;  s++) if(vbdeepcopy[s].id == id2remove)   vbdeepcopy.splice(s,1);
        for(s=0; s<lenuvb; s++) if(uvbdeepcopy[s].id == id2remove)  uvbdeepcopy.splice(s,1);
        
        return setVoiceBankUserVocabulary(vbdeepcopy, uvbdeepcopy)
        .then(function(res)
        {
            voicebank_vocabulary        = vbdeepcopy;
            voicebank_uservocabulary    = uvbdeepcopy;

            var len = voicebank_vocabulary_by_category[categoryid].length;
            for(s=0; s<len; s++)
                if(voicebank_vocabulary_by_category[categoryid][s].id == sentence.id)
                    voicebank_vocabulary_by_category[categoryid].splice(s,1);
            return voicebank_vocabulary;
        });        
    };
     
    // ---------------------------------------------------------------------------------------
    //  TRAIN VOCABULARIES -------------------------------------------------------------------
    // ---------------------------------------------------------------------------------------
    getTrainVocabulary = function (path) 
    {
        if(train_object.vocabulary == null)
        {
            if(path) train_vocabulary_filerel_path = path;
            return FileSystemSrv.existFile(train_vocabulary_filerel_path)            
            .then(function(exist)
            {
                if(exist)   return FileSystemSrv.readJSON(train_vocabulary_filerel_path);
                else        return null;
            })
            .then(function(content)
            {
                if(content == null)   train_object        = {"vocabulary":null};
                else                  train_object        = content;
                
                return train_object;
            })
            .catch(function(err)
            {
                alert("Error in VocabularySrv : " + err.message);
                train_object        = {"vocabulary":null};
                return train_object;
            });
            
        }
        else return Promise.resolve(train_object);
    }; 
    
    getTempVocabulary = function(path) 
    {
        return FileSystemSrv.existFile(path)            
        .then(function(exist)
        {
            if(exist)   return FileSystemSrv.readJSON(path);
            else        
            {
                alert("Error in VocabularySrv::getTempVocabulary :  input file does not exist " + path);
                return null;
            }
        })
        .catch(function(err)
        {
            alert("Error in VocabularySrv::getTempVocabulary : " + err.message);
            return null;
        });

    }; 
        
    setTrainVocabulary = function(train_obj, filepath) 
    {
        if(filepath == null)    filepath = train_vocabulary_filerel_path;
        
        var localpath = StringSrv.getFileFolder(filepath);
        
        train_object                    = train_obj;
        train_object.nItems2Recognize   = train_object.vocabulary.length;
        train_object.rel_local_path     = localpath;    
        var train_voc_string            = JSON.stringify(train_object);

        return FileSystemSrv.createFile(filepath, train_voc_string);
    }; 
    
    // return voc.vocabulary.length ? 1 : 0 
    existsTrainVocabulary = function(path)
    {
        return getTrainVocabulary(path)
        .then(function(voc)
        {
            if(voc.vocabulary != null)
            {
                if(voc.vocabulary.length)
                {
                    exists_train_vocabulary = true;
                    return true;
                }    
            }
            exists_train_vocabulary = false;
            return exists_train_vocabulary;
        });
    };

    getTrainSentence = function(sentence_id) 
    {
        return _getSentence(train_object.vocabulary, sentence_id);
    };

    // return { , files:[filesname with extension]
    getTrainSentenceAudioFiles = function(sentence, relpath)
    {    
        if (sentence == null)
            return null;
        return FileSystemSrv.listFilesInDir(relpath, ["wav"])
        .then(function(files){
            // files = [wav file names with extension]
            return updateSentenceFiles(sentence, files);// update sentence.files[]
        })         
        .catch(function(error){
            return $q.reject(error);
        });         
    }; 

    getTrainSentencesByArrIDs = function(voc, arr_ids) 
    {
        var len_voc     = voc.length;
        var len_ids     = arr_ids.length;
        var sentences   = [];
        
        for (n = 0; n < len_ids; n++)
        {
            var id = arr_ids[n];
            for(v = 0; v < len_voc; v++)
            {
                if(id == voc[v].id)
                {
                    sentences.push(train_object.vocabulary[v]);
                    break;
                }
            }
        }
        return sentences;
    };    

    getTrainVocabularyIDLabels = function()
    {
        var ids = [];
        var len = train_object.vocabulary.length;
        for(s=0; s<len; s++)  ids.push({"title": train_object.vocabulary[s].title, "id":train_object.vocabulary[s].id});
        return ids;
    };    

    getTrainVocabularyIDs = function()
    {
        var ids = [];
        var len = train_object.vocabulary.length;
        for(s=0; s<len; s++)  ids.push(train_object.vocabulary[s].id);
        return ids;
    };    

    //-----------------------------------------------------------
    // audio files
    getTrainVocabularyFiles = function(relpath)
    {
        return FileSystemSrv.listFilesInDir(relpath, ["wav"])
        .then(function(files){
            // I get only wav file names with extension
            return updateVocabularyFiles(train_object.vocabulary, files);// writes subject.vocabulary[:].files[]
        })        
        .catch(function(error){
            return $q.reject(error);
        });          
    };    

    // presently never called..ed io la faccio lo stesso !
    checkUserVoiceBankAudioPresence = function() 
    {
        return _checkVocabularyAudioPresence(voicebank_uservocabulary, voicebank_folder)
        .then(function(voc){
            voicebank_uservocabulary = voc;
            return voc;
        });
    };
    
    hasVoicesTrainVocabulary = function() 
    {
        return checkVoiceBankAudioPresence()    // update voicebank voc
        .then(function(vbvoc)
        {
            var isComplete = true;
            var len = train_object.vocabulary.length;
            for(s=0; s<len; s++)
            {
                var id = train_object.vocabulary[s].id;
                if(!_getSentenceProperty(voicebank_vocabulary, id, "existwav")) return false;
            }  
            return true; // 
        });
    };
    
    getTrainVocabularyVoicesPath = function() 
    {
        var arr = [];
        var lent = train_object.vocabulary.length;
        var lenv = voicebank_vocabulary.length;
        for(t=0; t<lent; t++) 
        {
            var id = train_object.vocabulary[t].id;
            for(v=0; v<lenv; v++) 
            {
                if(id == voicebank_vocabulary[v].id)
                {
                    arr[t] = voicebank_folder + "/" + voicebank_vocabulary[v].filename;
                    break;
                }
            }
        }
        return arr;
    };
    
    checkTrainVocabularyAudioPresence = function(relpath) 
    {
        if(relpath == null) relpath = voicebank_folder;
        return _checkVocabularyAudioPresence(train_object.vocabulary, relpath)
        .then(function(voc)
        {
            train_object.vocabulary = voc;
            return voc;    
        });       
    };
    
    //---------------------------------------------------------------------------    
    // GENERAL
    //---------------------------------------------------------------------------    
    updateVocabularyFiles = function(vocabulary, files)
    {
        for (s=0; s<vocabulary.length; s++)
            vocabulary[s] = updateSentenceFiles(vocabulary[s], files);
        
        return vocabulary;
    };     
    
    // calculate audio repetitions number of a given sentence
    // files is: wav file list with extension (e.g. ["vb_123_11.wav", "vb_123_10.wav", ..., "vb_123_0.wav"] 
    updateSentenceFiles = function(sentence, files)
    {
        sentence.existwav       = 0;
        sentence.firstValidId   = 0;
        sentence.files          = [];

        var len_files           = files.length;
        var max                 = 0;
        for (f=0; f<len_files; f++)
        {
            var curr_file       = StringSrv.removeExtension(files[f]);   // xxx_1112_2.wav or xxx_9101_2.wav

            var arr             = curr_file.split("_");
            var idfile          = arr[1];
            var rep_num         = arr[2];
            if(sentence.id == idfile) 
            {
                var             id  = rep_num;
                if(id > max )   max = id;
                
                sentence.files[sentence.existwav] = {label: files[f]};
                sentence.existwav++;
                sentence.firstValidId = max + 1;
            }            
        }
        return sentence;
    };     
    //---------------------------------------------------------------------------
    // private methods
    _getDefaultVoiceBankVocabulary = function (path) 
    {
        if(path) voicebank_vocabulary_www_path = path;
        
        return $http.get(voicebank_vocabulary_www_path)
        .then(function(res){
            voicebank_vocabulary                = res.data.voicebank_vocabulary;
            vocabulary_categories               = res.data.vocabulary_categories;
            return voicebank_vocabulary;
        });
    };
    
    _getDefaultVoiceBankUserVocabulary = function (path) 
    {
        if(path) voicebank_uservocabulary_www_path = path;
        
        return $http.get(voicebank_uservocabulary_www_path)
        .then(function(res){
            voicebank_uservocabulary = res.data.voicebank_uservocabulary;
            return voicebank_uservocabulary;
        });
    };
        
    _mergeVBVocabularies = function(voc, voc2add)
    {
        var len = voc2add.length;
        for(s=0; s<len; s++) voc.push(voc2add[s]);
        return voc;
    };
    
    _checkVocabularyAudioPresence = function(voc, relpath) 
    {
        return FileSystemSrv.listFilesInDir(relpath, ["wav"])        
        .then(function(files)
        {
            var len_voc     = voc.length;
            var len_files   = files.length;
            for(v=0; v<len_voc;v++)    
            {
                voc[v].existwav = false;                
                for(f=0; f<len_files; f++)
                {
                    var curr_file = files[f];   // vb_1112_2.wav or audio_1112.wav
                    var filename = StringSrv.removeExtension(curr_file);
                    var arr = filename.split("_");
                    var id = arr[1];
                    if(voc[v].id == id)
                    {
                        voc[v].existwav = true;
                        break; // jump 2 next command
                    }
                }
            }
            return voc;
        });
    };
    
    _getSentenceProperty = function(voc, sentence_id, property)
    {
        return _getSentence(voc, sentence_id)[property];
    };
    
    _getSentence = function(voc, sentence_id)
    {
        var len_voc = voc.length;
        for(v=0; v<len_voc;v++)
            if(sentence_id == voc[v].id)
                return voc[v];                    
    };
    
    _splitVocabularyByCategory = function(voc)
    {
        var result = [];
        for(var cat in vocabulary_categories) result[vocabulary_categories[cat].id] = [];
        
        var len = voc.length;
        for(s=0; s<len; s++)
        {
            var id      = voc[s].id;
            var categ   = _getCategoryFromID(id); // 1:7  sentence category
            result[categ].push(voc[s]);
        }
        return result;
    };
    
    _isSentenceUnique = function(newsentence)
    {
        var res = true;
        var len = voicebank_vocabulary.length;
        for(s=0; s<len; s++) if(voicebank_vocabulary[s].title == newsentence) return false;
        return res;
    }
    
    _getCategoryFromID = function(id)
    {
        return id.toString()[1];
    }
    //---------------------------------------------------------------------------
    // public methods      
    
    return {
        initApp                             : initApp,
        initRecorder                        : initRecorder,
        
        getVoiceBankVocabulary              : getVoiceBankVocabulary,
        setVoiceBankVocabulary              : setVoiceBankVocabulary,
        checkVoiceBankAudioPresence         : checkVoiceBankAudioPresence,
        getVoiceBankSentence                : getVoiceBankSentence,
        setVoiceBankSentenceFilename        : setVoiceBankSentenceFilename,
        
        getVoiceBankUserVocabulary          : getVoiceBankUserVocabulary,
        addUserVoiceBankSentence            : addUserVoiceBankSentence,
        removeUserVoiceBankSentence         : removeUserVoiceBankSentence,
        
        getTrainVocabulary                  : getTrainVocabulary,
        existsTrainVocabulary               : existsTrainVocabulary,
        setTrainVocabulary                  : setTrainVocabulary,
        getTrainVocabularyIDs               : getTrainVocabularyIDs,
        getTrainVocabularyIDLabels          : getTrainVocabularyIDLabels,
        getTrainVocabularyFiles             : getTrainVocabularyFiles,
        checkTrainVocabularyAudioPresence   : checkTrainVocabularyAudioPresence,
        hasVoicesTrainVocabulary            : hasVoicesTrainVocabulary,     // check if all the to-be-recognized commands have their corresponding playback wav
        getTrainSentenceAudioFiles          : getTrainSentenceAudioFiles,   // get the audio files associated to the given sentence, updated with respect to path and exist
        getTrainVocabularyVoicesPath        : getTrainVocabularyVoicesPath, // get the rel paths of the to-be-recognized wav files 

        getTrainSentence                    : getTrainSentence,
        getTrainSentencesByArrIDs           : getTrainSentencesByArrIDs,

        getVocabularyCategories             : getVocabularyCategories,
        updateSentenceFiles                  : updateSentenceFiles,
        updateVocabularyFiles                : updateVocabularyFiles
    };
});
