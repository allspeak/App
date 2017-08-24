

main_module.service('VocabularySrv', function($http, $q, FileSystemSrv, StringSrv, SequencesRecordingSrv) 
{
    voicebank_vocabulary                = null;
    train_vocabulary                    = null;
    
    voicebank_vocabulary_www_path       = "";   //      ./json/voicebank_vocabulary.json
    voicebank_vocabulary_filerel_path   = "";   //      AllSpeak/json/voicebank_vocabulary.json
    train_vocabulary_filerel_path       = "";   //      AllSpeak/json/train_vocabulary.json
    
    voicebank_folder                    = "";   //      AllSpeak/voice_bank
    training_folder                     = "";   //      AllSpeak/audio_files
    //========================================================================
    // set inner paths, load both global & train vocabularies
    // returns 1 if a train_vocabulary file has been already created by the user, 0 otherwise.
    // if the global json does not exist ( actually only the first time !), read from asset folder and copy to a writable one.
    // load the global voc (voice bank) commands and check how many wav file the user did record
    // look for a train_vocabulary json, if present load it
    init = function(default_paths)
    {
        voicebank_vocabulary_www_path       = default_paths.voicebank_vocabulary_www_path;
        voicebank_vocabulary_filerel_path   = default_paths.voicebank_vocabulary_filerel_path;
        train_vocabulary_filerel_path       = default_paths.train_vocabulary_filerel_path;
        
        voicebank_folder                    = default_paths.voicebank_folder;
        training_folder                     = default_paths.audio_folder;
        
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
                    var voc_string = JSON.stringify({"voicebank_vocabulary":voicebank_vocabulary});
                    return FileSystemSrv.createFile(voicebank_vocabulary_filerel_path, voc_string); 
                })
            }
        })
        .then(function()
        {
            return checkVoiceBankAudioPresence()
        })
        .then(function()
        {            
            return FileSystemSrv.existFile(train_vocabulary_filerel_path)
        })
        .then(function(exist)
        {
            if(exist)  return getTrainVocabulary(train_vocabulary_filerel_path);
            else       return 0;
        })
        .then(function(voc)
        {
            if(voc)  return 1
            else     return 0;
        })
        .catch(function(error)
        {
            console.log(error.message)
            return 0;
        });
    }
    
    // same as init but for...if train_vocabulary is empty...copy voice_bank to it.
    // doesn't check for voicebank audio presence
    initRecorder = function(default_paths)
    {
        voicebank_vocabulary_www_path       = default_paths.voicebank_vocabulary_www_path;
        voicebank_vocabulary_filerel_path   = default_paths.voicebank_vocabulary_filerel_path;
        train_vocabulary_filerel_path       = default_paths.train_vocabulary_filerel_path;
        
        voicebank_folder                    = default_paths.voicebank_folder;
        training_folder                     = default_paths.audio_folder;
        
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
                    var voc_string = JSON.stringify({"voicebank_vocabulary":voicebank_vocabulary});
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
    //========================================================================

    getVoiceBankVocabulary = function (path) 
    {
        if(voicebank_vocabulary == null)
        {
            if(path)  voicebank_vocabulary_filerel_path = path;
            return FileSystemSrv.readJSON(voicebank_vocabulary_filerel_path)
            .then(function(content){
                voicebank_vocabulary = content.voicebank_vocabulary;
                return voicebank_vocabulary;
            });
        }
        else return voicebank_vocabulary;
    };       
    
    getTrainVocabulary = function (path) 
    {
        if(train_vocabulary == null)
        {
            if(path) train_vocabulary_filerel_path = path;
            return FileSystemSrv.existFile(train_vocabulary_filerel_path)            
            .then(function(exist){
                if(exist)   return FileSystemSrv.readJSON(train_vocabulary_filerel_path)
                else        return null;
            })
            .then(function(content){
                if(content == null) return [];
                else
                {
                    train_vocabulary = content.train_vocabulary;
                    return train_vocabulary;
                }
            });
        }
        else return Promise.resolve(train_vocabulary);
    }; 
    
    getTrainVocabularyFiles = function(relpath)
    {
        return FileSystemSrv.listFilesInDir(relpath, ["wav"])
        .then(function(files){
            // I get only wav file names with extension
            return _parseSentenceFiles(train_vocabulary, files);// writes subject.vocabulary[:].files[]
        })        
        .catch(function(error){
            return $q.reject(error);
        });          
    };
    setTrainVocabulary = function (voc) 
    {
        train_vocabulary = voc;
        var train_voc_string = JSON.stringify({"train_vocabulary": voc});
        return FileSystemSrv.createFile(train_vocabulary_filerel_path, train_voc_string);
    }; 
    
    getVoiceBankSentence = function(sentence_id) 
    {
        var len_voc = voicebank_vocabulary.length;
        for(v=0; v<len_voc;v++)
            if(sentence_id == voicebank_vocabulary[v].id)
                return voicebank_vocabulary[v];
    };

    getTrainSentence = function(sentence_id) 
    {
        var len_voc = train_vocabulary.length;
        for(v=0; v<len_voc;v++)
            if(sentence_id == train_vocabulary[v].id)
                return train_vocabulary[v];
    };

    checkVoiceBankAudioPresence = function() 
    {
        return _checkVocabularyAudioPresence(voicebank_vocabulary, voicebank_folder)
        .then(function(voc){
            voicebank_vocabulary = voc;
            return voc;
        })
    };
    
    checkTrainVocabularyAudioPresence = function(relpath) 
    {
        return _checkVocabularyAudioPresence(train_vocabulary, relpath)
        .then(function(voc){
            train_vocabulary = voc;
            return voc;    
        })        
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
                    sentences.push(train_vocabulary[v]);
                    break;
                }
            }
        }
        return sentences;
    };    
    
    parseVocabularyFiles = function(vocabulary, files)
    {
        for (s=0; s<vocabulary.length; s++)
            vocabulary[s] = parseSentenceFiles(vocabulary[s], files);
        
        return vocabulary;
    };     
    
    // files is: wav file list without extension
    parseSentenceFiles = function(sentence, files)
    {
        sentence.existwav       = 0;
        sentence.firstValidId   = 0;
        sentence.files          = [];

        var len_files           = files.length;
        var max                 = 0;
        for (f=0; f<len_files; f++)
        {
            var filelabel_number    = StringSrv.splitStringNumber(files[f]);
            var filename            = filelabel_number[0];
            var rep_num             = parseInt(filelabel_number[1]);
            var file_sep = SequencesRecordingSrv.getSeparator();
            
            if(filename[filename.length-1] == file_sep)
                filename = filename.substring(0, filename.length-1);
            
            if(!filename.length || filelabel_number.length == 1)
                return null;
            
//            splfilename = filename.split("_"); var l = splfilename.length;  filename = "";
//            for(s=1; s<l-1; s++)  filename += splfilename[s] + "_";
//            filename += splfilename[s]
            
            if(filename == StringSrv.removeExtension(sentence.filename))
            {
                var id = rep_num;
                if(id > max )   
                    max = id;
                
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
            voicebank_vocabulary = res.data.voicebank_vocabulary;
            return voicebank_vocabulary;
        });
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
                    var curr_file = files[f];
                    if(voc[v].filename == curr_file) voc[v].existwav = true;
                }
            }
            return voc;
        });
    };
    
    //---------------------------------------------------------------------------
    // public methods      
    
    return {
        init: init,
        initRecorder: initRecorder,
        getVoiceBankVocabulary: getVoiceBankVocabulary,
        getTrainVocabulary: getTrainVocabulary,
        setTrainVocabulary: setTrainVocabulary,
        getTrainVocabularyFiles: getTrainVocabularyFiles,
        getVoiceBankSentence: getVoiceBankSentence,
        getTrainSentence: getTrainSentence,
        checkVoiceBankAudioPresence: checkVoiceBankAudioPresence,
        checkTrainVocabularyAudioPresence: checkTrainVocabularyAudioPresence,
        getTrainSentencesByArrIDs: getTrainSentencesByArrIDs,
        parseSentenceFiles: parseSentenceFiles,
        parseVocabularyFiles: parseVocabularyFiles
    };
});


//        getSentences: getSentences,
//    getSentences = function(sentence_ids) 
//    {
//        var arr = [];
//        var len = sentences_ids.length;
//        for (s=0; s<len; s++){
//            arr.push(getSentence(sentences_ids[s]));
//        }
//        return arr;
//    }