/* Service which stores App ENUMS:
 * different from the ENUMS shared with the plugin
 */


function EnumsSrv()
{
    service = {};
    service.RECORD      = {};
    service.STATUS      = {};
    service.MODALITY    = {};
    service.TRAINING    = {};
    service.VOICEBANK   = {};
    service.VOCABULARY   = {};
    
    service.RECORD.BY_SENTENCE              = 1001;
    service.RECORD.BY_REPETITIONS           = 1002;
    
    service.RECORD.MODE_SINGLE_BANK         = 1010;
    service.RECORD.MODE_SEQUENCE_BANK       = 1011;
    service.RECORD.MODE_SINGLE_TRAINING     = 1012;
    service.RECORD.MODE_SEQUENCE_TRAINING_APPEND   = 1013;
    service.RECORD.MODE_SEQUENCE_TRAINING_REPLACE  = 1014;
    service.RECORD.SESSION_MIN_REPETITIONS  = 5;
    service.RECORD.SESSION_MAX_REPETITIONS  = 10;
    service.RECORD.FILE_EXT                 = ".wav";
    
    service.STATUS.NEW_TV                   = 1020;
    service.STATUS.RECORD_TV                = 1021;
    service.STATUS.TRAIN_TV                 = 1022;
    service.STATUS.RECORD_TVA               = 1023;
    service.STATUS.CAN_RECOGNIZE            = 1024;
    
    service.MODALITY.SOLO                   = 1030;
    service.MODALITY.GUEST                  = 1031;
    service.MODALITY.ASSISTED               = 1032;

    service.TRAINING.NEW_TV                 = 1040;
    service.TRAINING.EDIT_TV                = 1041;
    service.TRAINING.RECORD_TV              = 1042;
    service.TRAINING.SHOW_TV                = 1043;
    
    service.VOICEBANK.SHOW_ALL              = 1050;
    service.VOICEBANK.SHOW_TRAINED          = 1051;
    
    service.VOCABULARY.IGNORE_RECOVERY      = true;
    //==========================================================================
    return service;
}

 main_module.service('EnumsSrv', EnumsSrv);