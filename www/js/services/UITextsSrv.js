/* Service which stores App ENUMS:
 * different from the ENUMS shared with the plugin
 */


function UITextsSrv()
{
    service = {};
    service.RECORD      = {};
    service.TRAINING    = {};
    service.REMOTE      = {};
    service.SETUP       = {};
    service.VOCABULARY  = {};
    service.RECOGNITION = {};
    
    service.TRAINING.models = {};
    
    service.labelExit                   = "SEI SICURO DI VOLER USCIRE?";
    service.labelAlertTitle             = "ATTENZIONE";
    service.labelErrorTitle             = "ERRORE CRITICO";
    service.labelCriticalErrorDesc      = "L\'APPLICAZIONE VERRA\' CHIUSA PER IL SEGUENTE ERRORE:<br>";
    service.labelAdd                    = "AGGIUNGI"; 
    service.labelSubstitute             = "SOSTITUISCI"; 
    service.labelChange                 = "CAMBIA"; 
    service.labelCancel                 = "ANNULLA"; 
    service.labelDelete                 = "CANCELLA"; 
    service.labelRecovery               = "RECUPERA"; 
    service.labelDeleteAll              = "CANCELLA TUTTO"; 
    service.labelSureOverWriteExistFile = 'IL FILE ESISTE GIA\'.<br>VUOI SOVRASCRIVERLO ?'; 
    
    
    service.RECORD.BTN_NEXT_SINGLE    = "salva";
    service.RECORD.BTN_NEXT_SEQUENCE  = "prossimo";
    service.RECORD.BTN_EXIT_SINGLE    = "cancella";
    service.RECORD.BTN_EXIT_SEQUENCE  = "cancella";
    service.RECORD.BTN_SKIP_VOICEBANK = "salta";
    service.RECORD.BTN_SKIP_TRAIN     = "stop";
    service.RECORD.BTN_RECORD_RECORD  = "REGISTRA";
    service.RECORD.BTN_RECORD_STOP    = "STOP";
    
    service.TRAINING.labelRecordRepetitions                     = "REGISTRA RIPETIZIONI";
    service.TRAINING.labelTrain                                 = "ADDESTRA";
    
    service.TRAINING.labelParameters                            = 'PARAMETRI ADDESTRAMENTO';
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
    service.TRAINING.labelTrainCommands                         = "ADDESTRA I COMANDI";    
    service.TRAINING.labelTestNetName                           = "TEST NUOVA: ";    
    
    service.TRAINING.labelVocTrainedWant2Download               = "IL VOCABOLARIO E\' STATO ADDESTRATO. VUOI SCARICARLO ORA ? E\' POSSIBILE FARLO IN SEGUITO";    
    service.TRAINING.labelNetDownloadedWant2TestIt              = "HAI CORRETTAMENTE SCARICATO LA RETE, VUOI ATTIVARLA E PASSARLA AL RICONOSCIMENTO ?";    
    service.TRAINING.labelExistingSessionWant2CancelIt          = "UNA SESSIONE INCOMPLETA DI TRAINING E\' STATA TROVATA. PER CANCELLARLA E PROSEGUIRE PREMI \"OK\", ALTRIMENTI ANNULLA IL NUOVO TRAINING";    
    service.TRAINING.labelExistingSessionWant2DownloadIt        = "UNA SESSIONE INCOMPLETA DI TRAINING E\' STATA TROVATA MA LA RETE NON E\' STATA ANCORA SCARICATA. SE VUOI SCARICARLA E PROSEGUIRE CON IL TRAINING PREMI \"OK\", PER CANCELLARLA PREMI \"CANCELLA\", PER ANNULLARE IL NUOV TRAINING PREMI \"ANNULLA\"";    
    service.TRAINING.labelExistingSessionWant2ApproveOrCancelIt = "UNA SESSIONE COMPLETA DI TRAINING ESISTE E RICHIEDE DI ESSERE APPROVATA O CANCELLATA. IN CASO UNA RETE SIMILE ESISTA GIA\', QUEST\'ULTIMA VERRA\' CANCELLATA. PER APPROVARLA PREMI \"OK\", PER TESTARLA PREMI \"TEST\", PER CANCELLARLA PREMI \"CANC\", PER ANNULLARE PREMI \"ANNULLA\"";    
    service.TRAINING.labelNetCanceled                           = "LA RETE E\' STATA CANCELLATA";    
    service.TRAINING.labelNetAccepted                           = "LA RETE E\' STATA ACCETTATA";    
    service.TRAINING.labelWant2SubstituteNewNet                 = "STAI SOSTITUENDO LA NUOVA RETE. SEI SICURO ?";    
    service.TRAINING.labelSelTrainingMode                       = 'Seleziona la modalità di addestramento della rete';    
    service.TRAINING.labelLostConnection                        = "HAI PERSO LA CONNESSIONE INTERNET. VERRAI MANDATO ALLA PAGINA PRECEDENTE";    
    
    service.TRAINING.models.labelUSER                           = "UTENTE";
    service.TRAINING.models.labelCOMMONADAPTED                  = "COMUNE ADATTATA";
    service.TRAINING.models.labelUNSPECIFIED                    = "NON SPECIFICATA";
    
    service.TRAINING.models.labelC                              = "comune";
    service.TRAINING.models.labelPU                             = "utente pura";
    service.TRAINING.models.labelPUA                            = "utente pura adattata";
    service.TRAINING.models.labelCA                             = "comune adattata";
    service.TRAINING.models.labelCRA                            = "comune riadattata";
    service.TRAINING.models.labelPURA                           = "utente pura riadattata";
    
    
    service.TRAINING.labelNewNetSubstituting                    = "UNA RETE UGUALE ESISTE GIA\'. CONTINUANDO, POTRAI PROVARE LA NUOVA RETE, MA SE L\'ACCETTERAI, LA VECCHIA VERSIONE ORA PRESENTE VERRA\' ELIMINATA.\nVUOI PROSEGUIRE?";    
    service.TRAINING.labelNewNet                                = "STAI PER INVIARE LE TUE REGISTRAZIONI AL SERVER PER ADDESTRARE IL VOCABOLARIO.\nVUOI PROSEGUIRE?";    
    
    
    service.TRAINING.labelToggleSentencesEditTrainVocabulary    = "MODIFICA LA LISTA DEI COMANDI";    
    
    service.TRAINING.DEFAULT_TV_JSONNAME                        = "vocabulary.json";
    service.TRAINING.MODAL_CREATE_NEWVOCABULARY                 = "SCEGLI IL NOME DEL VOCABOLARIO DI COMANDI CHE INTENDI ADDESTRARE.IL NOME \"default\" E' RISERVATO AL SISTEMA E NON PUOI UTILIZZARLO. SUGGERIMENTO: SE E' IL PRIMO VOCABOLARIO, CHIAMALO STANDARD";
    
    service.VOCABULARY.CONFIRM_DELETE                           = "VUOI VERAMENTE CANCELLARE IL VOCABOLARIO?";
    service.VOCABULARY.DELETED                                  = "IL VOCABOLARIO E\' STATO CANCELLATO";
    service.VOCABULARY.USERCOMMAND_EXIST                        = "IL COMANDO GIÀ ESISTE <br> CAMBIAGLI IL NOME";
    service.VOCABULARY.want2registervoiceNewCommand             = "VUOI REGISTRARE LA TUA VOCE MENTRE PRONUNCI QUESTO NUOVO COMANDO ?";
    service.VOCABULARY.labelReservedVocName                     = '\" E\' RISERVATO AL SISTEMA. SCEGLI UN\'ALTRO NOME';
    service.VOCABULARY.labelSelectAtLeastOneCommand             = 'DEVI SELEZIONARE ALMENO UN COMANDO \nALTRIMENTI PREMI \"RITORNA\" PER ANNULLARE';
    service.VOCABULARY.labelSelectAnotherVocName1               = 'UN VOCABOLARIO CHIAMATO \"';
    service.VOCABULARY.labelSelectAnotherVocName2               = '\" E\' GIA\' PRESENTE. SCEGLI UN\'ALTRO NOME';
    service.VOCABULARY.labelSure2deleteCommand                  = 'STAI PER CANCELLARE QUESTO COMANDO. SEI SICURO ?';
    service.VOCABULARY.labelSure2deleteCommandInvalidate        = 'STAI PER CANCELLARE QUESTO COMANDO. SEI SICURO ?<br>COSI FACENDO TUTTE LE RETI FINORA ADDESTRATE, IN TUTTI I VOCABOLARI, CONTENENTI QUESTO COMANDO, VERRANNO CANCELLATE !<br>VUOI PROCEDERE ALLA LORO CANCELLAZIONE?';
    service.VOCABULARY.labelSure2modifyCommands                 = 'STAI MODIFICANDO I COMANDI DEL TUO VOCABOLARIO<br>TUTTE LE RETI FINORA ADDESTRATE PER QUESTO VOCABOLARIO VERRANNO CANCELLATE !<br>PREMI:<br>- \"OK\" PER PROCEDERE<br>- \"NUOVO\" PER CREARE UN NUOVO VOCABOLARIO<br>- \"CANC\" PER CANCELLARE';
    service.VOCABULARY.labelSure2deleteAllRecordings            = 'STAI PER CANCELLARE TUTTE LE REGISTRAZIONI DI QUESTO VOCABOLARIO<br>SEI SICURO ?';
    service.VOCABULARY.labelSaveList                            = "SALVA LISTA";
    service.VOCABULARY.labelListSaved                           = "LA LISTA DEI COMANDI E\' STATA CORRETTAMENTE SALVATA";
    service.VOCABULARY.labelAskAddorSubstituteRec               = "AGGIUNGI NUOVE RIPETIZIONI AD UNA SESSIONE ESISTENTE, OPPURE SOSTITUISCI LE RIPETIZIONI PRESENTI";
    service.VOCABULARY.labelErrorMissingVocabularyJson1         = "SI E\' VERIFICATO UN ERRORE IRREPARABILE SUL VOCABOLARIO:<br>     ";
    service.VOCABULARY.labelErrorMissingVocabularyJson2         = "      <br>VUOI PROVARE A:<br> - RECUPERARLO<br> - CANCELLARLO";
    service.VOCABULARY.labelErrorMissingVocabularyJsonVocDeleted= "NON E\' STATO POSSIBILE RECUPERARE IL VOCABOLARIO<br>E\' STATO RIMOSSO";
    service.VOCABULARY.labelErrorMissingNetJson                 = "SI E\' VERIFICATO UN PROBLEMA CON LA RETE SELEZIONATA CHE VERRA\' CANCELLATA<br>DEVI SELEZIONARLA UN\'ALTRA";
    service.VOCABULARY.labelErrorMissingNetJsonTestSession      = "SI E\' VERIFICATO UN PROBLEMA CON LA RETE APPENA ADDESTRATA, CHE VERRA\' CANCELLATA<br>DEVI RIPETERE L\'ADDESTRAMENTO";
    
    service.REMOTE.labelConnect                                 = "Connetti questo dispositivo al tuo centro SLA di riferimento";    
    service.REMOTE.labelWant2Connect                            = "Vuoi connettere questo dispositivo al tuo centro SLA di riferimento?";    
    service.REMOTE.labelUnrecoverableError                      = "Errore irrecuperabile sul server.";    
    service.REMOTE.labelServerDown                              = "IL SERVER SEMBRA ATTUALMENTE NON FUNZIONANTE, PUOI CONTINUARE AD USARE L'\'APP SENZA ACCEDERE ALLE FUNZIONI AVANZATE";    
    
    service.SETUP.want2beAssistedText                           = "PUOI UTILIZZARE ALLSPEAK CON LE SEGUENTI MODALITA:";
    service.SETUP.want2beAssistedText2                          = "Per attivare la modalità ASSISTITA devi avere una connessione internet e disporre del codice a 6 cifre fornito dal tuo medico";
    service.SETUP.want2beRegisteredText                         = "Inserisci il codice che ti è stato fornito dal tuo medico";
    service.SETUP.registerNewDeviceText                         = "Registra questo dispositivo";    
    service.SETUP.noConnectionText                              = "NON HAI UNA CONNESSIONE INTERNET, PUOI CONTINUARE AD USARE L'\'APP SENZA ACCEDERE ALLE FUNZIONI AVANZATE";    
    service.SETUP.confirmRegisterDeviceText                     = "VUOI REGISTRARE ORA IL TELEFONO? SE NON LO FAI POTRAI UTILIZZARE SOLO LE FUNZIONI BASE. LA PROSSIMA VOLTA CHE AVVII ALLSPEAK TI VERRA' RIPROPOSTA LA POSSIBILITA' DI REGISTRARLO";    
    service.SETUP.askConfirmSkipRegistrationText                = "Premendo PROSEGUI non si potrà accedere alle funzioni avanzate di AllSpeak, sicuro di voler saltare la registrazione?";    
    service.SETUP.criticalErrorText                             = "ERRORE CRITICO ! Contatta il responsabile del App";    
    service.SETUP.confirmExitText                               = "SEI SICURO DI VOLER USCIRE ?";    
    service.SETUP.specifyGenderText                             = "AI FINI DI POTER RIPRODURRE LA TUA VOCE IN MANIERA SINTETICA, INDICA SE SEI MASCHIO O FEMMINA";    
    service.SETUP.labelSaveSettings                             = 'Stai uscendo senza salvare i nuovi parametri, sei sicuro ?';    

    service.RECOGNITION.labelUncertainResults                   = "ripeti il comando";
    service.RECOGNITION.labelStartRecognition                   = "AVVIA RICONOSCIMENTO";
    service.RECOGNITION.labelStopRecognition                    = "INTERROMPI RICONOSCIMENTO";
    service.RECOGNITION.labelHSDisconnectedWhileRecognizing     = "IL MICROFONO SI E\' DISCONNESSO";
    service.RECOGNITION.labelHeadsetAbsent                      = "Microfono assente";
    
    //==========================================================================
    return service;
}

 main_module.service('UITextsSrv', UITextsSrv);