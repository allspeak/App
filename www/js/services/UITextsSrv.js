/* Service which stores App ENUMS:
 * different from the ENUMS shared with the plugin
 */


function UITextsSrv()
{
    service = {};
    service.RECORD = {};
    service.TRAINING = {};
    service.REMOTE = {};
    service.SETUP = {};
    
    service.TRAINING.models = {};
    
    service.RECORD.BTN_NEXT_SINGLE    = "salva";
    service.RECORD.BTN_NEXT_SEQUENCE  = "prossimo";
    service.RECORD.BTN_EXIT_SINGLE    = "cancella";
    service.RECORD.BTN_EXIT_SEQUENCE  = "cancella";
    service.RECORD.BTN_SKIP_VOICEBANK = "salta";
    service.RECORD.BTN_SKIP_TRAIN     = "stop";
    service.RECORD.BTN_RECORD_RECORD  = "REGISTRA";
    service.RECORD.BTN_RECORD_STOP    = "STOP";
    
    service.TRAINING.labelRecognize                             = "RICONOSCI";
    service.TRAINING.labelOpenVocabulary                        = "APRI";
    service.TRAINING.labelStartTrainSession                     = "REGISTRA SESSIONE TRAINING";
    service.TRAINING.labelResumeTrainSession                    = "COMPLETA SESSIONE TRAINING";
    service.TRAINING.labelManageSession                         = "REGISTRAZIONI TRAINING";
    service.TRAINING.labelTrainVocabulary                       = "ADDESTRA IL VOCABOLARIO";
    service.TRAINING.labelEditTrainVocabulary                   = "GESTISCI COMANDI";
    service.TRAINING.labelManageVocabulary                      = "GESTISCI IL VOCABOLARIO";
    service.TRAINING.labelRecordVoice                           = "REGISTRAZIONI DA RIPRODURRE";
    service.TRAINING.labelSelectSentences                       = "NUOVO";
    service.TRAINING.labelLoadVocabulary                        = "CARICA VOCABOLARIO";
    service.TRAINING.labelToggleSentencesEditTrainSequence      = "ADDESTRA I SEGUENTI COMANDI";
    service.TRAINING.labelToggleSentencesShowTrainVocabulary    = "VISUALIZZA I COMANDI";
    service.TRAINING.labelToggleSentencesEditTrainVocabulary    = "MODIFICA I COMANDI";    
    
    service.TRAINING.models.labelC                              = "comune"
    service.TRAINING.models.labelPU                             = "utente pura"
    service.TRAINING.models.labelPUA                            = "utente pura adattata"
    service.TRAINING.models.labelCA                             = "comune adattata"
    service.TRAINING.models.labelCRA                            = "comune riadattata"
    service.TRAINING.models.labelPURA                           = "utente pura riadattata"
    
    
    service.TRAINING.labelToggleSentencesEditTrainVocabulary    = "MODIFICA LA LISTA DEI COMANDI";    
    
    service.TRAINING.DEFAULT_TV_JSONNAME                        = "vocabulary.json";
    service.TRAINING.MODAL_CREATE_NEWVOCABULARY                 = "Scegli il nome del Vocabolario di comandi che intendi addestrare.\nIl nome \"default\" è riservato al sistema, non puoi utilizzarlo.\nSuggerimento: se è il primo vocabolario, chiamalo standard";
    
    service.REMOTE.labelConnect                                 = "Connetti questo dispositivo al tuo centro SLA di riferimento";    
    service.REMOTE.labelWant2Connect                            = "Vuoi connettere questo dispositivo al tuo centro SLA di riferimento?";    
    
    service.SETUP.want2beAssistedText                           = "PUOI UTILIZZARE ALLSPEAK CON LE SEGUENTI MODALITA:";
    service.SETUP.want2beAssistedText2                          = "Per attivare la modalità ASSISTITA devi avere una connessione internet e disporre del codice a 6 cifre fornito dal tuo medico";
    service.SETUP.want2beRegisteredText                         = "Inserisci il codice che ti è stato fornito dal tuo medico";
    service.SETUP.registerNewDeviceText                         = "Registra questo dispositivo";    
    service.SETUP.noConnectionText                              = "Non hai una connessione internet o il server sembra attualmente non funzionante, puoi continuare ad usare l\'App senza pero accedere alle funzioni speciali";    
    service.SETUP.confirmRegisterDeviceText                     = "Vuoi registrare ora il telefono sul server?\nIn caso contrario, potrai farlo in seguito\nCosi puoi utilizzare solo le funzioni base";    
    service.SETUP.askConfirmSkipRegistrationText                = "Premendo PROSEGUI non si potrà accedere alle funzioni avanzate di AllSpeak, sicuro di voler saltare la registrazione?";    
    service.SETUP.criticalErrorText                             = "Errore critico ! Contatta il responsabile del App";    
    service.SETUP.confirmExitText                               = "Sei sicuro di voler uscire?";    
    service.SETUP.specifyGenderText                             = "AI FINI DI POTER RIPRODURRE LA TUA VOCE IN MANIERA SINTETICA, INDICA SE SEI MASCHIO O FEMMINA";    

    //==========================================================================
    return service;
}

 main_module.service('UITextsSrv', UITextsSrv);