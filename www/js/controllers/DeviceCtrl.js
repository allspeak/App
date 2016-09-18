/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function DeviceCtrl($scope, HWSrv)
{
    ionic.Platform.ready(function()
    {
        $scope.device   = HWSrv.getDevice();        
        $scope.ready    = true; // will execute when device is ready, or immediately if the device is already ready.
    });    
    
    $scope.device_item_to_be_shown    = [ {label:"model", value:""},  
                                        {label:"manufacturer", value:""} , 
                                        {label:"platform", value:""} , 
                                        {label:"serial", value:""},  
                                        {label:"version", value:""}];
    var len_dev = $scope.device_item_to_be_shown.length;
    
    if (typeof $scope.device !== "undefined")
    {
        for (d=0; d<len_dev; d++)
        {
            lab                                         = $scope.device_item_to_be_shown[d].label;
            $scope.device_item_to_be_shown[d].value     = $scope.device[lab];
        }
        //$scope.inputsources = HWSrv.getInputSources();
    }
};
controllers_module.controller('DeviceCtrl', DeviceCtrl)   
  