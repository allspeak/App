/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function SettingsCtrl($scope, $window, $cordovaDevice, AudioSrv, VadSrv, HarkSrv, CaptureNativeSrv)
{
    //$scope.device = $cordovaDevice.device();
    $scope.voicedetection = {
        volume : 95
    };
    
    $scope.vad_status = "OFF";
    $scope.startVoiceMonitoring = function()
    {
        //VadSrv.monitorVoice($window, $scope);
        HarkSrv.monitorVoice($window, $scope);
    }
}
controllers_module.controller('SettingsCtrl', SettingsCtrl)   
  