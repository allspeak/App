/* 
 * To change service license header, choose License Headers in Project Properties.
 * To change service template file, choose Tools | Templates
 * and open the template in the editor.
 */


function IonicNativeMediaSrv($cordovaMediaPlugin, $cordovaMediaCapture, HWSrv)
{
    var service = {};
    
    service.playback_file      = "";

    service.controller         = {};
    //=============================================
    // PLAYBACK
    service.playAudio = function (filename, volume, onSuccess, onError)
    {
        service.playback_file = new $cordovaMediaPlugin(filename);
        service.playback_file.init.then(function (success){
            service.playback_file.release();
            onSuccess(success);
        }, function (error){
            if (error != null){
                if (error.code)
                {
                    // BUG ???????  immediately returns error = {code:0}, I ignore it !!! bad thing !!
                    onError(error);
                    console.log("ERROR...code: " + error.code + ", message: " + error.message);
                }
            }
        });
        service.setVolume(volume);
        service.playback_file.play();     
    };
    
    service.stopAudio = function ()
    {
        service.playback_file.stop();
        service.playback_file.release();
        service.playback_file = null;        
    };    
    service.resumeAudio = function ()
    {    
        service.playback_file.play();
    };
    service.pauseAudio = function ()
    {
        service.playback_file.pause();
    };    
    service.setVolume = function (volume)
    {
        service.playback_file.setVolume(volume);
    };    
    
    //=============================================
    // RECORDING  
    service.recordAudio = function (filename)
    {
//        service.rec_wrapper = $cordovaMediaCapture;        
        service.record_file = new $cordovaMediaPlugin(filename);
        service.record_file.startRecord();
//        
//        service.rec_wrapper.captureAudio(service.rec_options).then(
//        function(audioData) 
//        {
//            // Success! Audio data is here
//        }, 
//        function(err) 
//        {
//             // An error occurred. Show a message to the user
//        });        
    }; 
    
    service.stopRecordAudio = function ()
    {
        service.record_file.stopRecord();
    }    
    
    return service;
}

main_module.service('IonicNativeMediaSrv', IonicNativeMediaSrv);

/*
 * 
 * //        file.getDuration().then(function(duration){
//            console.log(duration);
//        });        
//        file.status.subscribe(function(p) {
//        service.$apply(function() {
//            service.position = p.coords;
//        });
//        }, function(err) {
//        });
 * */
 

 