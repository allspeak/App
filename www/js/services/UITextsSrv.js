/* Service which stores App ENUMS:
 * different from the ENUMS shared with the plugin
 */


function UITextsSrv()
{
    service = {};
    service.RECORD = {};
    service.RECORD.BTN_NEXT_SINGLE          = "save";
    service.RECORD.BTN_NEXT_SEQUENCE        = "next";
    service.RECORD.BTN_EXIT_SINGLE          = "cancel";
    service.RECORD.BTN_EXIT_SEQUENCE        = "abort";
    service.RECORD.BTN_SKIP                 = "skip";
    service.RECORD.BTN_RECORD_RECORD        = "REGISTRA";
    service.RECORD.BTN_RECORD_STOP          = "STOP";

    //==========================================================================
    return service;
}

 main_module.service('UITextsSrv', UITextsSrv);