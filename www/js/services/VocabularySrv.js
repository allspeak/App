/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function VocabularySrv()
{
//    this.vocabulary = [
//      { title: 'Ho fame', id: 1, label: 'ho_fame', filename: 'ho_fame.wav'},
//      { title: 'Ho sete', id: 2, label: 'ho_sete', filename: 'ho_sete.wav' },
//      { title: 'Chiudi la porta', id: 3, label: 'chiudi_porta', filename: 'chiudi_porta.wav' }
//    ];    
//    this.getVocabulary($http)
//    {
        $http.get('appdata/vocabulary.json')
            .success(function (data) {
                // The json data will now be in scope.
                this.vocabulary = data;
            });    
//    };   
    
    this.getSource = function() 
    {
        if (ionic.Platform.isAndroid()) {
            source = 'android_asset/www/' + source;
            return source;
        }
        else {   return source;  }
    };    
}

 main_module.service('VocabularySrv', [ '$http', VocabularySrv]);