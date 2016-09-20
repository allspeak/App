/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function SentenceRecordCtrl($scope, $stateParams, VocabularySrv)
{
    $scope.id = $stateParams.sentenceId;
    $scope.selectedItemId       = $scope.id-1;
    $scope.selectedSentence     = VocabularySrv.vocabulary[$scope.selectedItemId];    
    $scope.selectedTitle        = $scope.selectedSentence.title;    
    
}

controllers_module.controller('SentenceRecordCtrl', SentenceRecordCtrl) 
  