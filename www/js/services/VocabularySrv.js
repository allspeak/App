

main_module.service('VocabularySrv', function($http, FileSystemSrv) 
{
    var global_vocabulary       = null;
    var vocabulary              = null;
    var vocabulary_json_relpath = ""; //'./json/vocabulary.json';
    
    //========================================================================
    getGlobalVocabulary = function (path) {
        return $http.get(path)
        .then(function(res){
            global_vocabulary = res.data.vocabulary;
            return global_vocabulary;
        });
    };
        
    getVocabulary = function (path) 
    {
        if(path)        vocabulary_json_relpath = path;
        if(vocabulary)  return Promise.resolve(vocabulary);
        
        return FileSystemSrv.readJSON(vocabulary_json_relpath)
        .then(function(content){
            vocabulary = content.vocabulary;
            return vocabulary;
        });
    };

    getBankSentence = function(sentence_id) 
    {
        var len_voc = global_vocabulary.length;
        for(v=0; v<len_voc;v++)
            if(sentence_id == global_vocabulary[v].id)
                return global_vocabulary[v];
    };

    getTrainingSentence = function(sentence_id) 
    {
        var len_voc = vocabulary.length;
        for(v=0; v<len_voc;v++)
            if(sentence_id == vocabulary[v].id)
                return vocabulary[v];
    };

    getSentence = function(sentence_id) {
        return getVocabulary()
        .then(function(vocabulary){
            var len_voc = vocabulary.length;
            for(v=0; v<len_voc;v++){
                if(sentence_id == vocabulary[v].id)
                    return vocabulary[v];
            }
            return null;
        });
    };

    checkVocabularyAudioPresence = function(voc, relpath) 
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
    
    setVocabulary = function (data) 
    {
        return $http.post(vocabulary_json_relpath, data)
        .then( function (success){
            return 1;
        });
    };
        
    return {
        setVocabulary: setVocabulary,
        getVocabulary: getVocabulary,
        getGlobalVocabulary: getGlobalVocabulary,
        getSentence: getSentence,
        getTrainingSentence: getTrainingSentence,
        getBankSentence: getBankSentence,
        checkVocabularyAudioPresence: checkVocabularyAudioPresence
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