main_module.factory('ClockSrv', function($interval)
{
    'use strict';
    var service = {
        addClock: addClock,
        removeClock: removeClock
    };
  
    var clockElts       = [];
    var clockTimer      = null;
    var cpt             = 0;
  
    var timer_length    = 1000;
    //=======================================================
    // PUBLIC
    //=======================================================  
    function addClock(fn, timerlen)
    {
        var elt = {
                    id: cpt++,
                    fn: fn
                  };
        clockElts.push(elt);
        if(clockElts.length === 1){ _startClock(timerlen); }
        return elt.id;
    }
    
    function removeClock(id)
    {
        for(var i in clockElts)
        {
            if(clockElts[i].id === id) clockElts.splice(i, 1);
        }
        if(clockElts.length === 0){ _stopClock(); }
    }
    //=======================================================
    // PRIVATE
    //=======================================================
    function _startClock(len)
    {
        var timerlen = (len ? len : timer_length);
        if(clockTimer === null)
        {
            clockTimer = $interval(function()
            {
                for(var i in clockElts)    clockElts[i].fn();
            }, timerlen);
        }
    };
    
    function _stopClock()
    {
        if(clockTimer !== null)
        {
            $interval.cancel(clockTimer);
            clockTimer = null;
        }
    }
    //=======================================================  
    return service;
});
