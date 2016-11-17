/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
main_module.service('VocabularySrv', function($http, FileSystemSrv) {
    var vocabulary = null;
    var vocabulary_json_path = ""; //'./json/vocabulary.json';
    return {
        //promise:promise,
        setVocabulary: function (data) {
            return $http.post(vocabulary_json_path, data)
            .then( function (success){
                return 1;
            });
        },
        getVocabularySynch: function () {
            if (vocabulary)
                return vocabulary;
        },
        getVocabulary: function (path) {
            if (path)
                vocabulary_json_path = path;
            
            if (vocabulary)
                return Promise.resolve(vocabulary);
            return $http.get(vocabulary_json_path).then(function(res){
                vocabulary = res.data.vocabulary;
                return res.data.vocabulary;
            });
        },
        checkAudioPresence: function () {
            return getVocabulary()
            .then( function (voc){
                for (voc in vocabulary){
                  
                }
            })
        }
    };
});




//
//
//function VocabularySrv($http)
//{
////    this.vocabulary = [
////      { title: 'Ho fame', id: 1, label: 'ho_fame', filename: 'ho_fame.wav'},
////      { title: 'Ho sete', id: 2, label: 'ho_sete', filename: 'ho_sete.wav' },
////      { title: 'Chiudi la porta', id: 3, label: 'chiudi_porta', filename: 'chiudi_porta.wav' }
////    ];    
////    this.getVocabulary = function($http)
////    {
//   
////    };  
//    this.init = function()
//    {
//        $http.get('./json/vocabulary.json')
//           .success(function (data) {
//               // The json data will now be in scope.
//               this.vocabulary = data;
//           });        
//    };
//
//    
//    this.getSource = function() 
//    {
//        if (ionic.Platform.isAndroid()) {
//            source = 'android_asset/www/' + source;
//            return source;
//        }
//        else {   return source;  }
//    };    
//}

// main_module.service('VocabularySrv', [ '$http', VocabularySrv]);
// main_module.service('VocabularySrv', VocabularySrv);