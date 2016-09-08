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
function SentenceTrainCtrl($scope, $stateParams, VocabularySrv)
{
    $scope.id = $stateParams.sentenceId;
    $scope.selectedItemId       = $scope.id-1;
    $scope.selectedSentence     = VocabularySrv.vocabulary[$scope.selectedItemId];    
    $scope.selectedTitle        = $scope.selectedSentence.title;    
    
}

function SentenceRecordCtrl($scope, $stateParams, VocabularySrv)
{
    $scope.id = $stateParams.sentenceId;
    $scope.selectedItemId       = $scope.id-1;
    $scope.selectedSentence     = VocabularySrv.vocabulary[$scope.selectedItemId];    
    $scope.selectedTitle        = $scope.selectedSentence.title;    
    
}

controllers_module.controller('VocabularyCtrl', VocabularyCtrl)   
controllers_module.controller('SentenceTrainCtrl', SentenceTrainCtrl) 
controllers_module.controller('SentenceRecordCtrl', SentenceRecordCtrl) 
  