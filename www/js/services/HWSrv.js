/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function HWSrv($cordovaDevice)
{
 
    var service         = {};   
    
    //======= A U D I O ============
    service.connectBluetoothDevices = function()
    {
        return 1;
    };
    
    service.setAudioInputSource = function()
    {
        return 1;
    };
    
    service.getAudioInputSource = function()
    {
        return 1;
    };
    
    
    
    //======= D E V I C E    I N F O ============
    service.device                      = {};
    service.device_item_to_be_pooled    = ["model",  "manufacturer" , "platform" , "serial",  "uuid" , "version", "cordova"];
    
   
    service.getDevice = function()
    {
        if (typeof $cordovaDevice !== "undefined")
        {
            dev_len             = service.device_item_to_be_pooled.length;
            for (i=0; i<dev_len; i++)
            {
                lab                 = service.device_item_to_be_pooled[i];
                service.device[lab] = $cordovaDevice[lab];
            }
            return service.device;
        }
        return {};
    };
    
    service.getNGDevice = function()
    {
        if (typeof $cordovaDevice !== "undefined")
        {
            var device          = $cordovaDevice.getDevice();
            dev_len             = service.device_item_to_be_pooled.length;
            for (i=0; i<dev_len; i++)
            {
                lab                 = service.device_item_to_be_pooled[i];
                service.device[lab] = device[lab];
            }
            return service.device;
        }
        return {};
    };
    
    return service;    
};

main_module.service('HWSrv', HWSrv);