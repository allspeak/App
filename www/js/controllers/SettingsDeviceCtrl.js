/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function SettingsDeviceCtrl($scope, $state, $ionicPlatform, InitAppSrv)
{
    $scope.device = null;
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // take control of BACK buttons
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("home");
        }, 100);   
        
        $scope.device   = InitAppSrv.getDevice();    
        $scope.fillDevice();
    });    

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 
    
    $scope.device_item_to_be_shown    = [ {label:"model", value:""},  
                                        {label:"manufacturer", value:""} , 
                                        {label:"platform", value:""} , 
                                        {label:"serial", value:""},  
                                        {label:"version", value:""},
                                        {label:"uuid", value:""}];
    var len_dev = $scope.device_item_to_be_shown.length;
    
    $scope.fillDevice = function()
    {
        if (typeof $scope.device !== "undefined")
        {
            for (d=0; d<len_dev; d++)
            {
                lab                                         = $scope.device_item_to_be_shown[d].label;
                $scope.device_item_to_be_shown[d].value     = $scope.device[lab];
            }
            //$scope.inputsources = HWSrv.getInputSources();
        }
    }
};
controllers_module.controller('SettingsDeviceCtrl', SettingsDeviceCtrl)   
  