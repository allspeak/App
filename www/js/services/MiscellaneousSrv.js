/* MiscellaneousSrv Service
 * 
 * accessory functions
 */

main_module.service('MiscellaneousSrv', function($q) 
{

    selectObjByValue = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].value == value)
               return objarray[i];
    };    
    
    selectObjByLabel = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].label == value)
               return objarray[i];
    };     
    
    // take a ms value and the sampling frequency and return the corresponding buffer size
    selectObjByMsValue = function(ms_value, samplingrate, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++)
        {
            var val = objarray[i].value;
            var val_ms = (val/samplingrate)*1000;
           if( val_ms == ms_value)
               return val;
        }
    }; 
    
    // obj = {"obj1":{}, "obj2":{}, ....}
    printObjectArray = function(objarr)
    {
        var len = objarr.length;
        var str = ""
        var tobj = null
        for(var o in objarr)
        {
            tobj = objarr[o];
            str += printObject(tobj, o)
//            str += (o + ":{");
//            for(var item in tobj)
//            {
//                str += (item + "=" + tobj[item] + ",");
//            }
//            str += "},";
                
        }
        return str;
    };
    
    // obj = {"obj1":{}, "obj2":{}, ....}
    printObject = function(obj, name)
    {
        var str = name + ":{";
        for(var item in obj)
        {
            if(isObject(obj[item]))
                str += (item + "=" + printObject(obj[item], item) + ",");
            else
                str += (item + "=" + obj[item] + ",");
        }
        str += "},";
        return str;
    };
    
    isObject = function(obj) 
    {
        return obj === Object(obj);
    };
    //---------------------------------------------------------------------------
    // public methods      
    return {
        selectObjByValue    : selectObjByValue,
        selectObjByLabel    : selectObjByLabel,
        selectObjByMsValue  : selectObjByMsValue,
        printObjectArray  : printObjectArray
    };
});
