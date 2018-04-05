/*
 * once activated, detect voice onset & offset 
 */


function ErrorSrv()
{
    service = {};
    
    service.ENUMS = {};
    
    service.ENUMS.VOCABULARY = {};
    service.ENUMS.VOCABULARY.VOCFOLDER_NOTEXIST         = 2000;
    service.ENUMS.VOCABULARY.VOCFOLDERVARIABLE_EMPTY    = 2001;
    
    service.ENUMS.VOCABULARY.JSONFILE_NOTEXIST          = 2002;     // !exist  ../vocabulary.json
    service.ENUMS.VOCABULARY.JSONFILEVARIABLE_EMPTY     = 2003;     // ../vocabulary.json = "" or null
    
    service.ENUMS.VOCABULARY.MODELFILE_NOTEXIST         = 2004;     // !exist  ../vocabularies/gigi/optomized_XXXX_XXX.pb 
    service.ENUMS.VOCABULARY.MODELFILEVARIABLE_EMPTY    = 2005;     // ../vocabulary.json = "" or null
    
    service.ENUMS.VOCABULARY.VOCVARIABLE_EMPTY          = 2006;     // vocabulary           = null
    service.ENUMS.VOCABULARY.COMMANDSVARIABLE_NULL      = 2007;     // vocabulary.commands  = null
    service.ENUMS.VOCABULARY.COMMANDSVARIABLE_EMPTY     = 2008;     // vocabulary.commands  = []
    
    service.ENUMS.VOCABULARY.TRAINFOLDER_NOTEXIST       = 2009;
    service.ENUMS.VOCABULARY.TRAINFOLDERVARIABLE_EMPTY  = 2010;    
    
    service.ENUMS.VOCABULARY.LOADTFMODEL                = 2015;     // vocabulary.commands  = []
    
    
    
    //==========================================================================
    service.raiseError = function(cb, context, error, show)
    {
        var error_message = "";        
        if(error != null)
        {
            error_message = " | ";
            if (typeof error == 'object')
            {
                if(error.message != null)   error_message = error_message + " message: " + error.message;
                if(error.stack != null)     error_message = error_message + " stack: " + error.stack;
            
                if(error.message == null)   " " + JSON.stringify(error); 
            }
            else    error_message = error_message + error;
        }
        var str = "Error in " + context + error_message;
        
        console.log(str);
        if (show != null) alert(str);
        if(cb != null)    cb(str);        
    };
    
    service.raiseWarning = function(context, error)
    {
        error_message = "";
        if(error != null)
        {
            error_message = " | ";
        
            if(error.message != null)   error_message = error_message + " message: " + error.message;
            if(error.stack != null)     error_message = error_message + " stack: " + error.stack;
            
            if(error.message == null)   error_message = error_message + " " + JSON.stringify(error); 
        }
        
        var str = "Warning in " + context + error;
        
        console.log(str);
    };

    //==========================================================================
    // public interface
    //==========================================================================
    return service;
}

main_module.service('ErrorSrv', ErrorSrv);

