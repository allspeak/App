/* 
 * To change this license header, choose License Headers in Project Properties.
 * 
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* 
 * To change service license header, choose License Headers in Project Properties.
 * To change service template file, choose Tools | Templates
 * and open the template in the editor.
 */


function IonicNativeMediaSrv($cordovaMediaPlugin, HWSrv)
{
    var service = {};
    
    service.playback_file           = "";
    service.playback_file_duration  = "";

    service.controller         = {};
    //=============================================
    // P L A Y B A C K
    service.initPlaybackAudio = function (filename)
    {
        service.playback_file = new $cordovaMediaPlugin(filename);        
        duration = service.playback_file.getDuration()
        
//        return duration;
        
        .then(function (duration){
            service.playback_file_duration = duration;
            return duration;
        })     
        .catch(function (error){
            return $q.reject(error);
        });
    };
    
    
    service.playAudio = function (filename, volume, onSuccess, onError)
    {
//        service.playback_file = new $cordovaMediaPlugin(filename);
        service.playback_file.init.then(function (success){
            service.playback_file.release();
            onSuccess(success);
        }, function (error){
            onError(error);
            console.log("ERROR...code: " + error.code + ", message: " + error.message);
        });
        service.setVolume(volume);
        service.playback_file.play();
    }
//    service.playAudio = function (filename, volume, onSuccess, onError)
//    {
//        service.playback_file = new $cordovaMediaPlugin(filename);
//
//        service.playback_file.getDuration()
//        .then(function (duration){
//            service.playback_file.init.then(function (success){
//                service.playback_file.release();
//                onSuccess(success);
//            }, function (error){
//                onError(error);
//                console.log("ERROR...code: " + error.code + ", message: " + error.message);
//            });
//            service.setVolume(volume);
//            service.playback_file.play();     
//            })
//        .catch(function (error){
//            console.log(error.message);
//        });
//        service.playback_file.getDuration()
//        .then(function (duration){
//            service.playback_file.init.then(function (success){
//                service.playback_file.release();
//                onSuccess(success);
//            }, function (error){
//                onError(error);
//                console.log("ERROR...code: " + error.code + ", message: " + error.message);
//            });
//            service.setVolume(volume);
//            service.playback_file.play();     
//            })
//        .catch(function (error){
//            console.log(error.message);
//        });
//    };
//    service.playAudio = function (filename, volume, onSuccess, onError)
//    {
//        service.playback_file = new $cordovaMediaPlugin(filename);
//        service.playback_file.init.then(function (success){
//            service.playback_file.release();
//            onSuccess(success);
//        }, function (error){
//            onError(error);
//            console.log("ERROR...code: " + error.code + ", message: " + error.message);
//        });
////        file.getDuration().then(function(duration){
////            console.log(duration);
////        });        
////        file.status.subscribe(function(p) {
////        service.$apply(function() {
////            service.position = p.coords;
////        });
////        }, function(err) {
////        });
//        service.setVolume(volume);
//        service.playback_file.play();     
//    };
    
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

 main_module.service('IonicNativeMediaSrv', IonicNativeMediaSrv);


