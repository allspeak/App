/*
 * once activated, detect voice onset & offset 
 */


function ErrorSrv()
{
    //==========================================================================
    raiseError = function(cb, context, error, show)
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
    
    raiseWarning = function(context, error)
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
    return {
        raiseError                : raiseError,
        raiseWarning              : raiseWarning
    };    
}

main_module.service('ErrorSrv', ErrorSrv);

