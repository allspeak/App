/* MiscellaneousSrv Service
 * 
 * accessory functions
 */

main_module.service('MiscellaneousSrv', function() 
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
    
    //=============================================   
    // convert  a = {gigi:aaa, bimbo:bbb}  ->  b = [{label:gigi, value:aaa}, {label:bimbo, value:bbb}]
    Obj2ArrJSON = function(obj)
    {
        var arr = [];
        if(obj == null) return arr;
        
        for (item in obj)
            arr.push({label: item, value:obj[item]});
        return arr; 
    };
    
    cloneObj = function(obj)
    {
        var clone = {};
        if(obj == null) return clone;
        
        for(var field in obj)
            clone[field] = obj[field];
        return clone;
    };
    
    // valid for {"a":{}, "b":{}, "c":{}}
    cloneObjs = function(obj)
    {
        var clones = {};
        if(obj == null) return clones;
        
        for(var field in obj)
            clones[field] = cloneObj(obj[field]);
        return clones;
    };
    
    cloneObjArray = function(objarr)
    {
        var clone = [];
        if(objarr == null) return clone;
        
        for(var e=0; e<objarr.length; e++)
            clone[e] = cloneObj(objarr[e]);
        return clone;
    };    
    //---------------------------------------------------------------------------
    // public methods      
    return {
        selectObjByValue    : selectObjByValue,
        selectObjByLabel    : selectObjByLabel,
        selectObjByMsValue  : selectObjByMsValue,
        printObjectArray    : printObjectArray,
        Obj2ArrJSON         : Obj2ArrJSON,
        cloneObj            : cloneObj,
        cloneObjs           : cloneObjs,
        cloneObjArray       : cloneObjArray
    };
});
