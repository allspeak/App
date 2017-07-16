/* Service which stores App ENUMS:
 * different from the ENUMS shared with the plugin
 */


function EnumsSrv()
{
    service = {};
    service.RECORD = {};
    service.RECORD.BY_SENTENCE              = 1;
    service.RECORD.BY_REPETITIONS           = 2;
    service.RECORD.MODE_SINGLE_BANK         = 10;
    service.RECORD.MODE_SEQUENCE_BANK       = 11;
    service.RECORD.MODE_SINGLE_TRAINING     = 12;
    service.RECORD.MODE_SEQUENCE_TRAINING   = 13;
    
    service.RECORD.FILE_EXT                 = ".wav";

    //==========================================================================
    return service;
}

 main_module.service('EnumsSrv', EnumsSrv);