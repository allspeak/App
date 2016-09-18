/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function HWSrv($cordovaDevice)
{
    
    //======= A U D I O ============
 
    
    //======= D E V I C E    I N F O ============
    this.device_item_to_be_pooled = ["model",  "manufactures" , "platform" , "serial",  "uuid" , "version", "cordova"];
    
   
    this.getDevice = function()
    {
        if (typeof $cordovaDevice !== "undefined")
        {
            this.device         = $cordovaDevice.device;
            dev_len = this.device_item_to_be_pooled.length;
            for (i=0; i<dev_len; i++)
            {
                lab= this.device_item_to_be_pooled[i];
                this[lab] = this.device[lab];
            }
            return this.device;
        }
        return {};
    };
}

 main_module.service('HWSrv', HWSrv);