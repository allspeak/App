/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function VocabularyCtrl($scope, $location, VocabularySrv, AudioSrv)
{

    $scope.vocabulary = VocabularySrv.vocabulary;
    
    $scope.selectedItemId = -1;
    $scope.selectedSentence = {};
    
    $scope.play = function(index, id)
    {
        $scope.selectedItemId       = id-1;
        $scope.selectedSentence     = VocabularySrv.vocabulary[$scope.selectedItemId];
        var filename                = $scope.selectedSentence.filename;
        AudioSrv.playWav(filename);
    };
    
    $scope.recordSentence = function(index, id)
    {
        $location.path("/record/"+id);
    };    
    
    $scope.trainSentence = function(id)
    {
        $location.path("/train/"+id);
    };    
    
 }
controllers_module.controller('VocabularyCtrl', VocabularyCtrl)   
