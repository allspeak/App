

main_module.service('VocabularySrv', function($http, $q, FileSystemSrv, StringSrv) 
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
                    var voc_string = JSON.stringify(voicebank_vocabulary);
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
    //========================================================================

    getVoiceBankVocabulary = function (path) 
    {
        if(voicebank_vocabulary == null)
        {
            if(path)  voicebank_vocabulary_filerel_path = path;
            return FileSystemSrv.readJSON(voicebank_vocabulary_filerel_path)
            .then(function(content){
                voicebank_vocabulary = content;
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
    }
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
    
    getSentencesByArrIDs = function(voc, arr_ids) 
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
                    sentences.push(vocabulary[v]);
                    break;
                }
            }
        }
        return sentences;
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
    
    
    _parseVocabularyFiles = function(vocabulary, files)
    {
        for (s=0; s<vocabulary.length; s++)
            vocabulary[s] = _parseSentenceFiles(vocabulary[s], files);
        
        return vocabulary;
    };     
    
    // files is: wav file list without extension
    _parseSentenceFiles = function(sentence, files)
    {
        sentence.existwav       = 0;
        sentence.firstValidId   = 0;
        sentence.files          = [];

        var len_files           = files.length;
        var max                 = 0;
        for (f=0; f<len_files; f++)
        {
            var filelabel_number = StringSrv.splitStringNumber(StringSrv.removeExtension(files[f]));
            
            if(!filelabel_number[0].length || filelabel_number.length == 1)
                return null;
            
            if(filelabel_number[0] == sentence.label)
            {
                var id = filelabel_number[1];
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
    // public methods      
    
    return {
        init: init,
        getVoiceBankVocabulary: getVoiceBankVocabulary,
        getTrainVocabulary: getTrainVocabulary,
        setTrainVocabulary: setTrainVocabulary,
        getTrainVocabularyFiles: getTrainVocabularyFiles,
        getVoiceBankSentence: getVoiceBankSentence,
        getTrainSentence: getTrainSentence,
        checkVoiceBankAudioPresence: checkVoiceBankAudioPresence,
        checkTrainVocabularyAudioPresence: checkTrainVocabularyAudioPresence,
        getSentencesByArrIDs: getSentencesByArrIDs
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