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
    service.VOCABULARY  = {};
    service.RECOGNITION = {};
    service.VAD         = {};
    
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

    service.RECOGNITION.PARAMS_MOD_GENERAL  = 1060;     // recognition_settings/modeid = show general settings
    service.RECOGNITION.PARAMS_MOD_VOC      = 1061;     // recognition_settings/modeid = show vocabulary settings
    
    service.VOCABULARY.IGNORE_RECOVERY      = true;
    service.VOCABULARY.DEFAULT_FOLDERNAME   = "default";
    service.VOCABULARY.NOISE_ID             = 1700;
    
    service.VAD.SPEECH_STATUS_CODES         = {
        CAPTURE_STATUS_STARTED              : 11,
        CAPTURE_STATUS_STOPPED              : 13,
        CAPTURE_ERROR                       : 110,      
        SPEECH_STATUS_STARTED               : 20,
        SPEECH_STATUS_STOPPED               : 21,
        SPEECH_STATUS_SENTENCE              : 22,
        SPEECH_STATUS_MAX_LENGTH            : 23,
        SPEECH_STATUS_MIN_LENGTH            : 24,        
        VAD_ERROR                           : 120};    
    
    service.VAD.SPEECH_STATUS_LABELS        = [];
    service.VAD.SPEECH_STATUS_LABELS[service.VAD.SPEECH_STATUS_CODES.CAPTURE_STATUS_STARTED]   = "CAPTURE_STATUS_STARTED";
    service.VAD.SPEECH_STATUS_LABELS[service.VAD.SPEECH_STATUS_CODES.CAPTURE_STATUS_STOPPED]   = "CAPTURE_STATUS_STOPPED";
    service.VAD.SPEECH_STATUS_LABELS[service.VAD.SPEECH_STATUS_CODES.SPEECH_STATUS_SENTENCE]   = "SPEECH_STATUS_SENTENCE";
    service.VAD.SPEECH_STATUS_LABELS[service.VAD.SPEECH_STATUS_CODES.CAPTURE_ERROR]            = "CAPTURE_ERROR";
    service.VAD.SPEECH_STATUS_LABELS[service.VAD.SPEECH_STATUS_CODES.SPEECH_STATUS_STARTED]    = "SPEECH_STATUS_STARTED";
    service.VAD.SPEECH_STATUS_LABELS[service.VAD.SPEECH_STATUS_CODES.SPEECH_STATUS_STOPPED]    = "SPEECH_STATUS_STOPPED";
    service.VAD.SPEECH_STATUS_LABELS[service.VAD.SPEECH_STATUS_CODES.SPEECH_STATUS_MAX_LENGTH] = "SPEECH_STATUS_MAX_LENGTH";
    service.VAD.SPEECH_STATUS_LABELS[service.VAD.SPEECH_STATUS_CODES.SPEECH_STATUS_MIN_LENGTH] = "SPEECH_STATUS_MIN_LENGTH";    
    
    //==========================================================================
    return service;
}

 main_module.service('EnumsSrv', EnumsSrv);