/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



 
function HomeCtrl($scope, $ionicPlatform, $ionicPopup, $ionicHistory, $state, InitAppSrv, VocabularySrv)
{
    $scope.modelLoaded = false;
    
    $scope.$on('$ionicView.enter', function()
    {
        // delete history once in the home
        $ionicHistory.clearHistory();
        // ask user's confirm after pressing back (thus trying to exit from the App)
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $ionicPopup.confirm({ title: 'Attenzione', template: 'are you sure you want to exit?'})
            .then(function(res) { if (res) ionic.Platform.exitApp(); });
        }, 100);   
    
        $scope.modelLoaded          = InitAppSrv.isModelLoaded();
        $scope.vocabularyPresent    = InitAppSrv.isTrainVocabularyPresent();
        if($scope.vocabularyPresent)
        {
            return VocabularySrv.hasVoicesTrainVocabulary()
            .then(function(res)
            {
                $scope.vocabularyHasVoices = res;

                if($scope.modelLoaded && $scope.vocabularyPresent && $scope.vocabularyHasVoices)
                            $scope.canRecognize = true;
                else        $scope.canRecognize = false;
            })
        }
        else
        {
            $scope.vocabularyHasVoices  = false;
            $scope.canRecognize         = false;
        }
        $scope.$apply();
    });
    
    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });

 
    
    $scope.exit = function()
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'are you sure you want to exit?'})
        .then(function(res) 
        {
            if (res){  ionic.Platform.exitApp();  }
        });
    };
    
    $scope.goRecognition = function()
    {
        if($scope.canRecognize)
            $state.go('recognition');
        else
        {
            if(!$scope.vocabularyPresent)
            {
                $ionicPopup.confirm({ title: 'Attenzione', template: 'Devi ancora selezionare i comandi da addestrare\nVuoi farlo adesso?'})
                .then(function(res) 
                {
                    if (res) $state.go('training'); 
                });
            }
            else 
            {
                // user already chose the training list
                if(!$scope.modelLoaded && $scope.vocabularyHasVoices)
                {
                    $ionicPopup.confirm({ title: 'Attenzione', template: 'L\'applicazione non è stata ancora addestrata\nVuoi farlo adesso?'})
                    .then(function(res) 
                    {
                        if (res) $state.go('training'); 
                    });                
                }
                else if($scope.modelLoaded && !$scope.vocabularyHasVoices)
                {
                    $ionicPopup.confirm({ title: 'Attenzione', template: 'Devi prima registrare tutte le voci che hai addestrato\nVuoi farlo adesso?'})
                    .then(function(res) 
                    {
                        if (res) $state.go('voicebank'); // TODO: mettere params per farlo andare nella schermata solo training
                    });                
                } 
                else if(!$scope.modelLoaded && !$scope.vocabularyHasVoices)
                {
                    $ionicPopup.alert({ title: 'Attenzione', template: 'Devi ancora addestrare i comandi scelti e poi registrare le relative voci\nPremi il tasto corrispondente'})
                }
            }
        }
    }
};
controllers_module = angular.module('controllers_module')
.controller('HomeCtrl', HomeCtrl);
 