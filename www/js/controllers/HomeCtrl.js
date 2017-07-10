/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



 
function HomeCtrl($scope, $ionicPopup, $ionicHistory, $state, InitAppSrv)
{
    $scope.modelLoaded = false;
    
    $scope.$on('$ionicView.beforeEnter', function(){
        $ionicHistory.clearHistory();
        $scope.modelLoaded = InitAppSrv.isModelLoaded();
    });
    
    $scope.exit = function()
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'are you sure you want to exit?'}).then(function(res) 
        {
            if (res){  ionic.Platform.exitApp();  }
        });
    };
    
    $scope.goRecognition = function()
    {
        if($scope.modelLoaded)
            $state.go('recognition');
        else
        {
            $ionicPopup.confirm({ title: 'Attenzione', template: 'L\'applicazione non è stata ancora addestrata\nVuoi farlo adesso?'}).then(function(res) 
            {
                if (res)
                {  
                     $state.go('settings.recognition'); 
                }
            });
            
        }
            
    }
};



controllers_module = angular.module('controllers_module')

.controller('HomeCtrl', HomeCtrl);
 