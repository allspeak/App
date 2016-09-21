/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



 
function AmplifierCtrl($scope, cpAISrv, $window)
{
    $scope.volume           = 50;
    $scope.bLabelStart      = "AVVIA";
    $scope.bLabelStop       = "STOP";
    
    $scope.isRunning        = 0;
    $scope.buttonLabel      = ($scope.isRunning ? $scope.bLabelStop : $scope.bLabelStart);
    
    $scope.chart.top_value  = $scope.chart.top_value_time; 
    
    // capture params
//    $scope.captureCfg       = cpAISrv.getStdCaptureCfg();
      
    $scope.isRunning=!$scope.isRunning;
    if ($scope.isRunning)
    {

        cpAISrv.startRawPlayback(null, $scope, $window);
        $scope.vm_raw_label = $scope.vm_raw_label_stop;
    }
    else
    {
        cpAISrv.stopCapture();
        $scope.vm_raw_label = $scope.vm_raw_label_start;
        $scope.volume       = 0;
        $scope.spectrum     = [];
    }
    
   $scope.onChangeVolume = function()
   {
       cpAISrv.changeVolume($scope.volume);
   }
};



controllers_module = angular.module('controllers_module', [])

.controller('AmplifierCtrl', AmplifierCtrl);
 