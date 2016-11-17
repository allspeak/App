/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

//function SettingsCtrl($scope, $window, $ionicPlatform, InitAppSrv, SpeechDetectionSrv, HWSrv)
function SettingsCtrl($scope, $window, $ionicPlatform, InitAppSrv, SpeechDetectionSrv, HWSrv)
{
    
//    $ionicPlatform.ready(function() 
//    {
//        HWSrv.init();
//        $scope.$apply(function() 
//        {
//            $scope.cordova.loaded = true;
//        });
//    });    
    $scope.device_item_to_be_shown    = [ {label:"model", value:""},  
                                        {label:"manufacturer", value:""} , 
                                        {label:"platform", value:""} , 
                                        {label:"serial", value:""},  
                                        {label:"version", value:""}];
    var len_dev = $scope.device_item_to_be_shown.length;
    
    $scope.device       = HWSrv.device;
    
    for (d=0; d<len_dev; d++)
    {
        lab                                         = $scope.device_item_to_be_shown[d].label;
        $scope.device_item_to_be_shown[d].value     = $scope.device[lab];
    }
    $scope.inputsources = HWSrv.getInputSources();
    
    //$scope.selectedInputDevice = {};
    //$scope.device_item_list = 
    $scope.voicedetection = {
        volume : 95
    };
    $scope.vm_label_start="Start Voice Monitoring";
    $scope.vm_label_stop="Stop Voice Monitoring";
    $scope.ismonitoring=0;
    
    $scope.voicemon_label="Start Voice Monitoring";
    $scope.vad_status = "OFF";
    $scope.startVoiceMonitoring = function()
    {
        $scope.ismonitoring=!$scope.ismonitoring;
        if ($scope.ismonitoring)
        {
            SpeechDetectionSrv.monitorVoice($window, $scope);
            $scope.voicemon_label=$scope.vm_label_stop;
        }
        else
        {
            $scope.voicemon_label=$scope.vm_label_start;
        }
        
    };
};
controllers_module.controller('SettingsCtrl', SettingsCtrl)   
  