/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



 
function HomeCtrl($scope, $ionicPopup, $ionicHistory)
{
    $scope.$on('$ionicView.enter', function(){
        $ionicHistory.clearHistory();
    });
    
    $scope.exit = function()
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'are you sure you want to exit?'}).then(function(res) 
        {
            if (res){  ionic.Platform.exitApp();  }
        });
    };
};



controllers_module = angular.module('controllers_module')

.controller('HomeCtrl', HomeCtrl);
 