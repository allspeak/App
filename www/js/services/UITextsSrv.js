/* Service which stores App ENUMS:
 * different from the ENUMS shared with the plugin
 */


function UITextsSrv()
{
    service = {};
    service.RECORD = {};
    service.TRAINING = {};
    service.REMOTE = {};
    
    service.RECORD.BTN_NEXT_SINGLE    = "salva";
    service.RECORD.BTN_NEXT_SEQUENCE  = "prossimo";
    service.RECORD.BTN_EXIT_SINGLE    = "cancella";
    service.RECORD.BTN_EXIT_SEQUENCE  = "cancella";
    service.RECORD.BTN_SKIP_VOICEBANK = "salta";
    service.RECORD.BTN_SKIP_TRAIN     = "stop";
    service.RECORD.BTN_RECORD_RECORD  = "REGISTRA";
    service.RECORD.BTN_RECORD_STOP    = "STOP";
    
    service.TRAINING.labelRecognize                             = "RICONOSCI";
    service.TRAINING.labelStartTrainSession                     = "REGISTRA SESSIONE TRAINING";
    service.TRAINING.labelResumeTrainSession                    = "COMPLETA SESSIONE TRAINING";
    service.TRAINING.labelManageSession                         = "REGISTRAZIONI TRAINING";
    service.TRAINING.labelTrainVocabulary                       = "ADDESTRA IL VOCABOLARIO";
    service.TRAINING.labelEditTrainVocabulary                   = "GESTISCI COMANDI";
    service.TRAINING.labelManageVocabulary                      = "GESTISCI IL VOCABOLARIO";
    service.TRAINING.labelRecordVoice                           = "REGISTRAZIONI DA RIPRODURRE";
    service.TRAINING.labelSelectSentences                       = "NUOVO VOCABOLARIO";
    service.TRAINING.labelLoadVocabulary                        = "CARICA VOCABOLARIO";
    service.TRAINING.labelToggleSentencesEditTrainSequence      = "ADDESTRA I SEGUENTI COMANDI";
    service.TRAINING.labelToggleSentencesShowTrainVocabulary    = "VISUALIZZA I COMANDI";
    service.TRAINING.labelToggleSentencesEditTrainVocabulary    = "MODIFICA I COMANDI";    
    
    
    service.TRAINING.labelToggleSentencesEditTrainVocabulary    = "MODIFICA LA LISTA DEI COMANDI";    
    
    service.TRAINING.DEFAULT_TV_JSONNAME                        = "vocabulary.json";
    service.TRAINING.MODAL_CREATE_NEWVOCABULARY                 = "Scegli il nome del Vocabolario di comandi che intendi addestrare.\nIl nome \"default\" è riservato al sistema, non puoi utilizzarlo.\nSuggerimento: se è il primo vocabolario, chiamalo standard";
    
    service.REMOTE.labelConnect                                 = "Connetti questo dispositivo al tuo centro SLA di riferimento";    
    service.REMOTE.labelWant2Connect                            = "Vuoi connettere questo dispositivo al tuo centro SLA di riferimento?";    

    //==========================================================================
    return service;
}

 main_module.service('UITextsSrv', UITextsSrv);