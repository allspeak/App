/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function DeviceCtrl($scope, HWSrv)
{
    $scope.device = null;
    $scope.$on("$ionicView.enter", function(event, data)
    {
        if ($scope.device ==  undefined)
        {
            $scope.device   = HWSrv.device;    
            $scope.fillDevice();
    }
    });    
    
    $scope.device_item_to_be_shown    = [ {label:"model", value:""},  
                                        {label:"manufacturer", value:""} , 
                                        {label:"platform", value:""} , 
                                        {label:"serial", value:""},  
                                        {label:"version", value:""}];
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
controllers_module.controller('DeviceCtrl', DeviceCtrl)   
  