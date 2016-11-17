/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


 main_module.filter('secondsToDateTime', function() 
 {
    return function (duration) 
    {
        var milliseconds = parseInt((duration%1000)/10)
        , seconds = parseInt((duration/1000)%60)
        , minutes = parseInt((duration/(1000*60))%60);
//        , hours = parseInt((duration/(1000*60*60))%24);

//        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;
        milliseconds = (milliseconds < 10) ? "0" + milliseconds : milliseconds;

//        return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
        return minutes + ":" + seconds + "." + milliseconds;
    }

});
