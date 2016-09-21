/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function AudioSrv(HWSrv, $cordovaNativeAudio, $cordovaMediaCapture)
{
    this.playback_wrapper   = $cordovaNativeAudio;
    this.rec_wrapper        = $cordovaMediaCapture;
    this.rec_options        = { limit: 3, duration: 10 };
    
    this.filename           = "";
    this.hw                 = HWSrv;
    this.isSoundLoaded      = 0;

    this.controller         = {};
    //=============================================
    // PLAYBACK
    this.playWav = function (filename)
    {
        this.filename = filename;       
        console.log("play wav: " + filename );     
        
        if(this.isSoundLoaded)
        {
            this.playNativeSound('mySound');
        }
        else
        {
            this.loadSound();
        }        
    };
    this.stopWav = function ()
    {
        playback_wrapper.stop('mySound');
        playback_wrapper.unload('mySound');
    };    
    this.loadSound = function()
    {
        this.audio_wrapper.preloadSimple('mySound', this.filename)
          .then(function (msg) {
          }, function (error) {
            alert(error);
          });
        this.isSoundLoaded = true;
        this.playNativeSound('mySound');
    };
    this.playNativeSound = function(name)
    {
        playback_wrapper.play(name);
    };    
    //=============================================
    // RECORDING  
    this.recWav = function (filename)
    {
        this.filename = filename;
        this.rec_wrapper.captureAudio(this.rec_options).then(
        function(audioData) 
        {
            // Success! Audio data is here
        }, 
        function(err) 
        {
             // An error occurred. Show a message to the user
        });        
    }; 
}

 main_module.service('AudioSrv', AudioSrv);