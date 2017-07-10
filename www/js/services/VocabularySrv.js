

main_module.service('VocabularySrv', function($http, FileSystemSrv) {
    var vocabulary              = null;
    var vocabulary_json_relpath = ""; //'./json/vocabulary.json';
    
    getVocabulary = function (path) {
        if (path)
            vocabulary_json_relpath = path;

        if (vocabulary)
            return Promise.resolve(vocabulary);
        return FileSystemSrv.readJSON(vocabulary_json_relpath)
        .then(function(content){
            vocabulary = content.vocabulary;
            return vocabulary;
        });
    };
    
    getHttpVocabulary = function (path) {
        return $http.get(path)
        .then(function(res){
            return res.data.vocabulary;
        });
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
    }
    
    getSentencesSynch = function(sentence_id) {
        var len = vocabulary.length;
        if (len){
            for(v=0; v<len;v++){
                if(sentence_id == vocabulary[v].id)
                    return vocabulary[v];
            }
            return null;
        }
        else return null;
    }

    return {
        setVocabulary: function (data) {
            return $http.post(vocabulary_json_relpath, data)
            .then( function (success){
                return 1;
            });
        },
        getVocabulary: getVocabulary,
        
        getHttpVocabulary: getHttpVocabulary,
                
        getSentence: getSentence,
        
        getSentencesSynch: getSentencesSynch,
        
        getSentences: function(sentences_ids) {
            var arr = [];
            var len = sentences_ids.length;
            for (s=0; s<len; s++){
                arr.push(getSentence(sentences_ids[s]));
            }
            return arr;
        },
        
        checkAudioPresence: function () {
            return getVocabulary()
            .then(function (voc){
                for(voc in vocabulary){
                  
                }
            });
        }
    };
});
