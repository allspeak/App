/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function TrainingCtrl($scope, vocabulary)
{

//    $scope.vocabulary = VocabularySrv.getVocabulary();
    $scope.vocubulary = vocabulary;
    
    $scope.deselectAll = function()
    {
        for (var i=0; i < $scope.vocabulary.length; i++) {
          $scope.vocabulary[i].checked = 0;
          $scope.vocabulary[i].selected = 0;
        };        
    };
    
    $scope.selectAll = function()
    {
        for (var i=0; i < $scope.vocabulary.length; i++) {
          $scope.vocabulary[i].checked = 1;
          $scope.vocabulary[i].selected = 1;
        };        
    };
    
    $scope.startTraining = function()
    {
        
    }
    
 }
controllers_module.controller('TrainingCtrl', TrainingCtrl)   
