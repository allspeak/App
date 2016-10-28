/* 
 * To change service license header, choose License Headers in Project Properties.
 * To change service template file, choose Tools | Templates
 * and open the template in the editor.
 */


function AudioSrv(HWSrv, $cordovaNativeAudio, $cordovaMediaCapture)
{
    var service = {};
    
    service.rec_options        = { limit: 3, duration: 10 };
    
    service.filename           = "";
    service.hw                 = HWSrv;
    service.isSoundLoaded      = 0;

    service.controller         = {};
    //=============================================
    // PLAYBACK
    service.playWav = function (filename)
    {
        service.playback_wrapper   = $cordovaNativeAudio;
        service.filename = filename;       
        console.log("play wav: " + filename );     
        
        if(service.isSoundLoaded)
        {
            service.playNativeSound('mySound');
        }
        else
        {
            service.loadSound();
        }        
    };
    service.stopWav = function ()
    {
        service.playback_wrapper.stop('mySound');
        service.playback_wrapper.unload('mySound');
    };    
    service.loadSound = function()
    {
        service.playback_wrapper.preloadSimple('mySound', service.filename)
        .then(function (msg) {
        }, function (error) {
            alert(error);
        });
        service.isSoundLoaded = true;
        service.playNativeSound('mySound');
    };
    service.playNativeSound = function(name)
    {
        service.playback_wrapper.play(name);
    };    
    //=============================================
    // RECORDING  
    service.recWav = function (filename)
    {
        service.rec_wrapper = $cordovaMediaCapture;        
        service.filename    = filename;
        service.rec_wrapper.captureAudio(service.rec_options).then(
        function(audioData) 
        {
            // Success! Audio data is here
        }, 
        function(err) 
        {
             // An error occurred. Show a message to the user
        });        
    }; 
    
    return service;
}

 main_module.service('AudioSrv', AudioSrv);