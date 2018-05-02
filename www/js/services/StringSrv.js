/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function StringSrv()
{
    var service = {}; 

    service.format2filesystem = function(str){
        str = str.replace(" ", "_");
        str = str.replace("-", "_");
        str = str.replace("'", "_");
        str = str.toLowerCase();
        return str;
    };
    
    //  AllSpeak/recordings/default/training_vocabulary.json => AllSpeak/recordings/default/training_vocabulary
    service.removeExtension = function(fullname)
    {
        var str;
        var arr = fullname.split(".");
        if(arr.length == 1) str = arr[0];
        else
        {
            arr.splice(-1,1);
            str = arr.join(".");
        }
        return str;
    };    
    
    //  AllSpeak/recordings/default/training_vocabulary.json => json
    service.getExtension = function(fullname)
    {
        var arr = fullname.split(".");
        return arr[arr.length-1];
    };    
    
    //  AllSpeak/recordings/default/training_vocabulary.json => training_vocabulary.json
    service.getFileNameExt = function(fullname)
    {
        var arr = fullname.split("/");
        return arr[arr.length-1];
    };    

    //  AllSpeak/recordings/default/training_vocabulary.json => training_vocabulary
    service.getFileNameNoExt = function(fullname)
    {
        var arr = fullname.split("/");
        return service.removeExtension(arr[arr.length-1]);
    };    

    //  AllSpeak/recordings/default/training_vocabulary.json => AllSpeak/recordings/default
    service.getFileFolder = function(fullname)
    {
        var arr = fullname.split("/");
        arr.splice(arr.length-1, 1); // remove last element and modify arr (return the removed element)
        return arr.join("/");
    };    

    //  AllSpeak/recordings/default/training_vocabulary.json => default
    service.getFileFolderName = function(fullname)
    {
        var folder  = service.getFileFolder(fullname);
        var arr     = folder.split("/");
        return arr[arr.length-1];
    };    

    //  AllSpeak/recordings/default/training_vocabulary.json => AllSpeak/recordings
    service.getFileParentFolder = function(fullname)
    {
        var filefolder  = service.getFileFolder(fullname);
        var arr         = filefolder.split("/");
        arr.splice(arr.length-1, 1); // remove last element
        return arr.join("/");
    };    
    
    //  AllSpeak/recordings/default/training_vocabulary.json => recordings
    service.getFileParentFolderName = function(fullname)
    {
        var parentfolder    = service.getFileParentFolder(fullname);
        var arr             = parentfolder.split("/");
        return arr[arr.length-1];
    };    

    // split a string in : string + final number (e.g. "gigi23" -> ["gigi", 23]
    // start from the last char and check if is a number, if NO => ["string"]
    // if yes, take the last-last char ...and so on
    service.splitStringNumber = function(s)
    {
        var len = s.length;
        var char, number, str;
        var last_char = s[len-1];
        
        if(isNaN(last_char))
            return [s];
        
        str     = s.substr(0, len-1);
        number  = parseInt(last_char);
        
        for(c=len-2; c>=0; c--)
        {
            char = s[c];
            if(isNaN(char))
                return [str, number];
            else
            {
                last_char   = char + last_char;
                number      = parseInt(last_char);            
                str         = s.substr(0, c);
            }
        }
    };     
    
    service.formatDate = function(inputFormat) 
    {
        function pad(s) { return (s < 10) ? "0" + s.toString() : s.toString(); }
        var d = new Date();
        return pad(d.getDate()) + pad(d.getMonth()+1) + d.getFullYear().toString() + "_" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    };   
    
    return service;
};

main_module.service('StringSrv', StringSrv);

