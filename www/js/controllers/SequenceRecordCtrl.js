/* 
there are 3  modalities:
    EnumsSrv.RECORD.MODE_SINGLE_BANK         = 10;
    EnumsSrv.RECORD.MODE_SEQUENCE_BANK       = 11;
    EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING   = 12;

BANK            : save in AllSpeak/voicebank folder, the selected sentences contained in the global_vocabulary.json
TRAIN APPEND    : save in AllSpeak/recordings/                   XXX all (or the selected in case of partial retraining) the sentences contained in the vocabulary.json file
TRAIN REPLACE   : save in AllSpeak/recordings/temp_XXXXXXXX      if append mode  XXX all (or the selected in case of partial retraining) the sentences contained in the vocabulary.json file

According to the modality, there are 3 possibly END events:

    MODE_SINGLE_BANK        : DONE (confirm new, go to calling page)    CANCELLA (delete new file, go back to the calling page)
    MODE_SEQUENCE_BANK      : DONE (confirm new, go to next seq. item)  SKIP (delete new file, go to next seq. item)  CANCELLA (delete new file and go back to the calling page)
    MODE_SEQUENCE_TRAINING  : DONE (go to next seq. item)   CANCELLA (go back to the calling page)    ABORT (delete present file)

Two operative modalities....compare two wav or overwrite

audio files are automatically saved after captured, in order to may listen to them
- the save button thus simply go back
- the cancel button, first delete the file then go back
 */
function SequenceRecordCtrl($scope, $ionicPlatform, $state, $ionicPopup, $ionicLoading, $ionicHistory, $ionicModal, SpeechDetectionSrv, InitAppSrv, VoiceBankSrv, FileSystemSrv, StringSrv, IonicNativeMediaSrv, SequencesRecordingSrv, MfccSrv, EnumsSrv, UITextsSrv, SubjectsSrv)
{
    // calling params
    $scope.mode_id          = -1;        // ctrl modality MODE_SINGLE_RECORD, MODE_SEQUENCE_RECORD, MODE_SINGLE_TRAINING, MODE_SEQUENCE_TRAINING
    $scope.sentence_id      = -1;
    $scope.subject_id       = -1;       // used by multi-users Apps like VoiceRecorder
    
    $scope.successState     = -1;       // store the name of the caller state (e.g:  vocabulary->voicebank->seqrecord; successState is "voicebank"
    
    // when the caller is VB
    $scope.backState        = -1;       // store the name of the state before the caller (e.g:  vocabulary->voicebank->seqrecord; backState is "vocabulary"
    $scope.elems2display    = -1;       // indicates whether show trained or all sentences        

    // over-ride params
    $scope.captureProfile       = "record";
    $scope.initCaptureParams    = {nDataDest:204};
    $scope.initMfccParams       = {nDataType: 251, nDataDest: 235};     // calculate MFFILTERS and use them internally
    
    $scope.Cfg                  = {};
    $scope.Cfg.captureCfg       = {};
    $scope.Cfg.vadCfg           = null; 
    $scope.Cfg.mfccCfg          = {};


    // behaviour switchers
    $scope.preserveOriginal = false;    // if yes show two buttons group and let user choose the favourite
    $scope.isSequence       = false;
    $scope.existNewFile     = false;    // define whether enabling the Next & Exit buttons
    $scope.existOriginalFile= false;    // define whether enabling the Next & Exit buttons
    
    // rel path of wav files
    $scope.rel_filepath             = ""; 
    $scope.rel_originalfilepath     = "";    
    
    // objects
    $scope.sentence         = null;
    $scope.subject          = null;     // used by multi-users Apps like VoiceRecorder

    // buttons text
    $scope.skipButtonLabel  = UITextsSrv.RECORD.BTN_SKIP_TRAIN;
    $scope.nextButtonLabel  = UITextsSrv.RECORD.BTN_NEXT_SINGLE;
    $scope.exitButtonLabel  = UITextsSrv.RECORD.BTN_EXIT_SINGLE;
    $scope.bLabelStart      = UITextsSrv.RECORD.BTN_RECORD_RECORD;
    $scope.bLabelStop       = UITextsSrv.RECORD.BTN_RECORD_STOP;    
    $scope.recButtonLabel   = ($scope.isRecording ? $scope.bLabelStop : $scope.bLabelStart);      
    
    // OT
    $scope.volume           = 50;
    $scope.popUpAlertOn     = false;    
    
    // buttons init functions
    $scope.resetFlags = function()
    {
        $scope.playback_file    = null;

        $scope.isPlayingNew     = 0; 
        $scope.isPausedNew      = 0;       
        $scope.disablePauseNew  = 1;   
        $scope.disablePlayNew   = 0;   
        $scope.disableStopNew   = 1; 
        
        $scope.isPlayingOld     = 0;         
        $scope.isPausedOld      = 0;        
        $scope.disablePauseOld  = 1;   
        $scope.disablePlayOld   = 0;   
        $scope.disableStopOld   = 1;
        
        $scope.voice_power      = 0;        
        $scope.isRecording      = 0;
    };  
    $scope.resetFlags();
    
    $scope.modalAskAbortReplaceSession = null;
    //==================================================================================================================
    // INIT PAGE
    //==================================================================================================================
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function(e)
        {
            e.preventDefault();
            $scope.cancel();
        }, 100);         
        
        //---------------------------------------------------------------------------------------------------------------------
        // manage input params
        //---------------------------------------------------------------------------------------------------------------------
        $scope.backState        = "";
        $scope.successState     = "";
        $scope.cancelState      = "";
        $scope.foldername       = "";
        $scope.elems2display    = EnumsSrv.VOICEBANK.SHOW_ALL;
        
        $scope.subject          = null;
        
        if(data.stateParams.modeId != "")           $scope.mode_id         = parseInt(data.stateParams.modeId);
        else                                        alert("SequenceRecordCtrl::$ionicView.enter. error : modeId is empty");

        // in MODE_SINGLE_BANK is really a commandId, in SEQUENCE mode is the index of the array of sequences
        if(data.stateParams.commandId != "")        $scope.sentence_id     = parseInt(data.stateParams.commandId);
        else                                        alert("SequenceRecordCtrl::$ionicView.enter. error : commandId is empty");

        if(data.stateParams.backState != "")        $scope.backState        = data.stateParams.backState;
        if(data.stateParams.successState != "")     $scope.successState     = data.stateParams.successState;
        if(data.stateParams.cancelState != "")      $scope.cancelState      = data.stateParams.cancelState;
        if(data.stateParams.foldername != "")       $scope.foldername       = data.stateParams.foldername;       // if successState/cancelState == voicebank
        if(data.stateParams.elems2display != "")    $scope.elems2display    = parseInt(data.stateParams.elems2display);       // if successState/cancelState == voicebank
                           
        // optional param
        if(data.stateParams.subjId != "")
        {
            $scope.subject_id      = parseInt(data.stateParams.subjId);
            $scope.subject         = SubjectsSrv.getSubject($scope.subject_id);
        }   
        else
        {
            $scope.subject_id       = -1;
            $scope.subject          = null;
        }
        //---------------------------------------------------------------------------------------------------------------------
        
        $scope.resetFlags();  
        $scope.existNewFile     = false;
        
        switch ($scope.mode_id)
        {
            case EnumsSrv.RECORD.MODE_SINGLE_BANK:
                
                $scope.initMfccParams       = {nDataType: 251, nDataDest: 230};     // get MFFILTERS & DO NOT calculate MFCC
                
                $scope.preserveOriginal     = true;
                $scope.isSequence           = false;
                
                $scope.nextButtonLabel      = UITextsSrv.RECORD.BTN_NEXT_SINGLE;
                $scope.exitButtonLabel      = UITextsSrv.RECORD.BTN_EXIT_SINGLE;    

                 // sentence.filename is a file name (e.g. "ho_sete.wav")
                $scope.sentence             = VoiceBankSrv.getVoiceBankCommand($scope.sentence_id);
                
                if ($scope.sentence)
                {
                    $scope.filename         = $scope.sentence.filename;                 // "vb_1102.wav"
                    $scope.audioFolder      = InitAppSrv.getVoiceBankFolder();          // AllSpeak/voicebank       
                    $scope.rel_filepath     = $scope.audioFolder + "/" + $scope.filename;
                }
                else                        alert("SequenceRecordCtrl::$ionicView.enter error : sentence is empty");
                break;            
            
            case EnumsSrv.RECORD.MODE_SEQUENCE_BANK:
                
                $scope.initMfccParams       = {nDataType: 251, nDataDest: 230};     // get MFFILTERS & DO NOT calculate MFCC
                
                $scope.preserveOriginal     = true;
                $scope.isSequence           = true;
                
                $scope.nextButtonLabel      = UITextsSrv.RECORD.BTN_NEXT_SEQUENCE;
                $scope.exitButtonLabel      = UITextsSrv.RECORD.BTN_EXIT_SEQUENCE;         
                $scope.skipButtonLabel      = UITextsSrv.RECORD.BTN_SKIP_VOICEBANK;
                
                $scope.labelSeqOrder        = ($scope.sentence_id+1) + " di " + SequencesRecordingSrv.getSequenceLength();
                
                // sentence.filename is a rel path (AllSpeak/voicebank/filename.wav or AllSpeakVoiceRecorder/audio_files/SUBJ_LABEL/training_XXXX/filename.wav
                $scope.sentence             = SequencesRecordingSrv.getSentenceBySequenceId($scope.sentence_id);
                if ($scope.sentence)
                {
                    $scope.rel_filepath     = $scope.sentence.rel_filepath;
                    $scope.filename         = StringSrv.getFileNameExt($scope.rel_filepath);
                    $scope.audioFolder      = InitAppSrv.getVoiceBankFolder();          // AllSpeak/voicebank           
                }
                else                        alert("SequenceRecordCtrl::$ionicView.enter error : sentence is empty");                     
                break;
                
            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_APPEND:
            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_REPLACE:

                $scope.initMfccParams       = {nDataType: 251, nDataDest: 235};     // get MFFILTERS & write 2 file
                
                $scope.preserveOriginal     = false;   
                $scope.isSequence           = true;
                
                $scope.nextButtonLabel      = UITextsSrv.RECORD.BTN_NEXT_SEQUENCE;
                $scope.exitButtonLabel      = UITextsSrv.RECORD.BTN_EXIT_SEQUENCE;                   
                $scope.skipButtonLabel      = UITextsSrv.RECORD.BTN_SKIP_TRAIN;                
                
                $scope.labelSeqOrder        = ($scope.sentence_id+1) + " di " + SequencesRecordingSrv.getSequenceLength();
                
                // sentence.filename is a rel path (AllSpeak/voicebank/filename.wav or AllSpeakVoiceRecorder/audio_files/SUBJ_LABEL/training_XXXX/filename.wav
                //                               or(AllSpeak/recordings/temp_XXXXX/filename.wav or AllSpeak/recordings/filename.wav
                $scope.sentence             = SequencesRecordingSrv.getSentenceBySequenceId($scope.sentence_id);
                if ($scope.sentence)
                {
                    $scope.rel_filepath     = $scope.sentence.rel_filepath;
                    $scope.filename         = StringSrv.getFileNameExt($scope.rel_filepath);
                    $scope.audioFolder      = InitAppSrv.getAudioFolder();          // AllSpeak/recordings/ or AllSpeakRecorder/audio_files/
                }
                else                        alert("SequenceRecordCtrl::$ionicView.enter error : sentence is empty");                          
                break;
        }
        //-------------------------------------------------------------------------------
        //capture params
        $scope.pluginInterface      = InitAppSrv.getPlugin();        
        $scope.plugin_enum          = $scope.pluginInterface.ENUM.PLUGIN; 
        
        // get standard capture params + overwrite some selected
        $scope.Cfg.captureCfg       = $scope.initCaptureParams;
        $scope.Cfg.vadCfg           = null;
        $scope.Cfg                  = SpeechDetectionSrv.getUpdatedCfgCopy($scope.Cfg, $scope.captureProfile);        

        $scope.Cfg.mfccCfg          = MfccSrv.getUpdatedCfgCopy($scope.initMfccParams);

        //-------------------------------------------------------------------------------
        // may exists only when substituting a voicebank command, otherwise in training mode is always new
        return FileSystemSrv.existFile($scope.rel_filepath)
        .then(function(exist)
        {
            if(exist)   $scope.existOriginalFile    = true;
            else        $scope.existOriginalFile    = false;
            
            if($scope.preserveOriginal) // MODE_SEQUENCE_BANK & MODE_SINGLE_BANK
            {
                    $scope.rel_originalfilepath = $scope.rel_filepath;
                    $scope.rel_filepath         = StringSrv.removeExtension($scope.rel_filepath) + "_temp" + EnumsSrv.RECORD.FILE_EXT;            
            }
            else    $scope.rel_originalfilepath = "";
            
            $scope.$apply();
            
            if($scope.modalAskAbortReplaceSession == null)
            {
                return $ionicModal.fromTemplateUrl('templates/modal/modal3QuestionsBigButtons.html', {scope: $scope, animation: 'slide-in-up'})
                .then(function(modal) {$scope.modalAskAbortReplaceSession = modal; return true;});                
            }              
        });
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc) $scope.deregisterFunc();
    });    
    //===================================================================================================================================================
    //===================================================================================================================================================
    //===================================================================================================================================================
    //===================================================================================================================================================
    //===================================================================================================================================================
    //===================================================================================================================================================
    // CAPTURING (cordova-plugin-audioinput based plugin)
    //=====================================================================    
    $scope.startRecording = function()
    {
        if (!$scope.isRecording)
        {
            $scope.Cfg.mfccCfg.sOutputPath      = StringSrv.removeExtension($scope.rel_filepath);
            $scope.Cfg.captureCfg.sOutputPath   = StringSrv.removeExtension($scope.rel_filepath);
            SpeechDetectionSrv.startRawCapture($scope.Cfg.captureCfg, $scope.refreshMonitoring, $scope.onStartCapture, $scope.onStopCapture, $scope.onCaptureError, $scope.Cfg.mfccCfg);
        }
        else
        {
            SpeechDetectionSrv.stopCapture();
            $scope.showLoading();
        }    
    };
    
    $scope.onStartCapture = function()
    {
        $scope.isRecording          = true; 
        $scope.recButtonLabel       = ($scope.isRecording ? $scope.bLabelStop : $scope.bLabelStart);         
        $scope.$apply();
    };
    
    $scope.onStopCapture = function()
    {
        $scope.isRecording      = false;        
        $scope.recButtonLabel   = ($scope.isRecording ? $scope.bLabelStop : $scope.bLabelStart);     
        $ionicLoading.hide();  
        $scope.existNewFile   = true;        
        $scope.$apply();
    };
    
    $scope.refreshMonitoring = function(received_data, elapsed, npackets, bitrate, data_params, data){};    

    $scope.onCaptureError = function(error)
    {
//        window.removeEventListener('pluginerror', $scope.onCaptureError);
        $ionicLoading.hide();
        $scope.isRecording      = false;
        $scope.recButtonLabel   = $scope.bLabelStart;      
        $scope.showAlert("Error", error.toString());
        $scope.$apply();
    }; 
    
    $scope.saveAudio = function()
    {
        return SpeechDetectionSrv.saveData2Wav($scope.rel_filepath, FileSystemSrv.OVERWRITE)
        .then(function(){
            $scope.existNewFile   = true;
            $scope.$apply();
        });
    };    
    
    //=====================================================================
    // MFCC actions
    //=====================================================================
    $scope.getMFCC = function()
    {
        var filepath_noext = StringSrv.removeExtension($scope.rel_filepath);

        window.addEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.addEventListener('pluginerror'       , $scope.onMFCCError);                

        MfccSrv.getMFCCFromFile(filepath_noext, $scope.Cfg.mfccCfg.nDataType, $scope.Cfg.mfccCfg.nDataDest);

//        var data = SpeechDetectionSrv.getCapturedData();MfccSrv.getMFCCFromData(data, $scope.plugin_enum.MFCC_DATATYPE_MFFILTERS, $scope.plugin_enum.MFCC_DATADEST_ALL, filepath_noext);        
    };
    
    $scope.onMFCCProgressFile = function(mfcc)
    {
        $ionicLoading.hide();
        console.log("SequenceRecordCtrl::onMFCCProgressFile : " + mfcc);
        
        window.removeEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.removeEventListener('pluginerror'       , $scope.onMFCCError);          
    };
    
    $scope.onMFCCError = function(error)
    {
        $ionicLoading.hide();
        console.log("SequenceRecordCtrl::onMFCCError : " + mfcc);
        
        window.removeEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.removeEventListener('pluginerror'       , $scope.onMFCCError);         
    };
    
    //=====================================================================
    // PLAYBACK (IonicNativeMedia)
    //=====================================================================
    $scope.playAudioNew = function()
    {
        if ($scope.isPlayingNew && $scope.isPausedNew)
        {
            IonicNativeMediaSrv.resumeAudio();
            $scope.isPausedNew = 0;             
        }
        else if(!$scope.isPlayingOld || !$scope.isPlayingNew)
        {
            var volume              = $scope.volume/100;
            $scope.isPlayingNew     = 1;
            $scope.disablePauseNew  = 0;
            $scope.disableStopNew   = 0;
            $scope.disablePlayNew   = 1;
            IonicNativeMediaSrv.playAudio(FileSystemSrv.getResolvedOutDataFolder() + $scope.rel_filepath, volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
        }
    };
    
    $scope.playAudioOld = function()
    {
        if ($scope.isPlayingOld && $scope.isPausedOld)
        {
            IonicNativeMediaSrv.resumeAudio();
            $scope.isPausedOld = 0;             
        }
        else if(!$scope.isPlayingOld || !$scope.isPlayingNew)
        {
            var volume              = $scope.volume/100;
            $scope.isPlayingOld     = 1;
            $scope.disablePauseOld  = 0;
            $scope.disableStopOld   = 0;
            $scope.disablePlayOld   = 1;
            IonicNativeMediaSrv.playAudio(FileSystemSrv.getResolvedOutDataFolder() + $scope.rel_originalfilepath, volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
        }
    };
    
    $scope.OnPlaybackCompleted = function(success)
    {
        $scope.resetFlags();
        $scope.$apply();
    };
    
    $scope.OnPlaybackError = function(error)
    {
        $scope.resetFlags();
        $scope.$apply();
    };
    
    $scope.stopAudio = function()
    {
        if ($scope.isPlayingNew || $scope.isPlayingOld) 
        {
            IonicNativeMediaSrv.stopAudio();
            $scope.resetFlags();
        }        
    };
    
    $scope.pauseAudio = function()
    {
        if ($scope.isPlayingNew)
        {
            $scope.disablePauseNew  = 1;
            $scope.disableStopNew  = 0;
            $scope.disablePlayNew  = 0;
            $scope.isPausedNew = 1;
        }
        if ($scope.isPlayingOld)
        {
            $scope.disablePauseOld  = 1;
            $scope.disableStopOld  = 0;
            $scope.disablePlayOld  = 0;
            $scope.isPausedOld = 1;
        }
        IonicNativeMediaSrv.pauseAudio();
    };    
    
    $scope.onChangeVolume = function(vol)
    {
        $scope.volume = vol;
        if ($scope.playback_file)
            $scope.playback_file.setVolume($scope.volume/100);
    };
    
    //=====================================================================
    // END ACTIONS
    //=====================================================================    
    $scope.confirm = function()
    {
        switch($scope.mode_id)
        {
            case EnumsSrv.RECORD.MODE_SINGLE_BANK:
                return FileSystemSrv.renameFile($scope.rel_filepath, $scope.rel_originalfilepath, 2)    // force renaming
                .then(function()
                {
                    if($scope.successState != "")
                        $state.go($scope.successState, {foldername:$scope.foldername, backState:$scope.backState, elems2display:$scope.elems2display});
                    else
                        $ionicHistory.goBack();
                })
                .catch(function(error){
                    alert(error.message);
                });
                break;
                
            case EnumsSrv.RECORD.MODE_SEQUENCE_BANK:
                
                return FileSystemSrv.renameFile($scope.rel_filepath, $scope.rel_originalfilepath, 2)    // force renaming
                .then(function()
                {
                    return SequencesRecordingSrv.getNextSentenceId();
                })
                .then(function(next_id)
                {
                    if(next_id >= 0)
                        $state.go('record_sequence', {commandId:next_id, modeId:$scope.mode_id, successState:$scope.successState, cancelState:$scope.cancelState, foldername:$scope.foldername, backState:$scope.backState});
                    else
                    {
                        // SEQUENZA FINITA
                        
                        if($scope.successState != "") $state.go($scope.successState, {foldername:$scope.foldername, backState:$scope.backState, elems2display:$scope.elems2display});
                        else                          $ionicHistory.goBack();
                    }                         
                })
                .catch(function(error)
                {
                    alert(error.message);
                });
                break;

            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_APPEND:
            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_REPLACE:
                
                return SequencesRecordingSrv.getNextSentenceId()
                .then(function(next_id) // returns -1 when sequence is finished
                {
                    if(next_id >= 0)
                        $state.go('record_sequence', {commandId:next_id, modeId:$scope.mode_id, successState:$scope.successState, cancelState:$scope.cancelState, foldername:$scope.foldername, backState:$scope.backState});
                    else
                    {
                        // sequence terminated
                        if($scope.successState != "")   $state.go($scope.successState, {foldername:$scope.foldername, sessionPath:"", subjId:""});
                        else                            $ionicHistory.goBack();
                    }
                })
                break;
        }
    };
    
    $scope.skip = function()
    {
        switch($scope.mode_id)
        {
            case EnumsSrv.RECORD.MODE_SEQUENCE_BANK: // rel_filepath is : original_temp.wav
                
                return FileSystemSrv.deleteFile($scope.rel_filepath)
                .then(function()
                {
                    var next_id = SequencesRecordingSrv.getNextSentenceId();
                    
                    if(next_id >= 0)                    $state.go('record_sequence', {commandId:next_id, modeId:$scope.mode_id, successState:$scope.successState, cancelState:$scope.cancelState, foldername:$scope.foldername});
                    else
                    {
                        if($scope.successState != "")   $state.go($scope.successState, {foldername:$scope.foldername});
                        else                            $ionicHistory.goBack();
                    }
                })
                .catch(function(error){
                    alert(error.message);
                });
                break;
                
            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_APPEND: // rel_filepath is : original.wav
            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_REPLACE:     
                
                return FileSystemSrv.deleteFile($scope.rel_filepath)
                .then(function()
                {
                    var next_id = SequencesRecordingSrv.getNextSentenceId();
                    
                    if(next_id >= 0) $state.go('record_sequence', {commandId:next_id, modeId:$scope.mode_id, successState:$scope.successState, cancelState:$scope.cancelState, foldername:$scope.foldername});
                    else
                    {
                        if($scope.successState != "")   $state.go($scope.successState, {foldername:$scope.foldername, sessionPath:"", subjId:""});
                        else                            $ionicHistory.goBack();
                    }  
                })
                .catch(function(error){
                    alert(error.message);
                });
                break;
        }
    };
    
    $scope.cancel = function()
    {
        switch($scope.mode_id)
        {
            case EnumsSrv.RECORD.MODE_SINGLE_BANK:        // rel_filepath is : original_temp.wav
            case EnumsSrv.RECORD.MODE_SEQUENCE_BANK:        // rel_filepath is : original_temp.wav
                return FileSystemSrv.deleteFile($scope.rel_filepath)
                .then(function()
                {
                    if($scope.cancelState == "")    $ionicHistory.goBack();
                    else
                    {
                        if($scope.cancelState == "voicebank")
                        {
                            if($scope.foldername != "")     $state.go("voicebank", {elems2display:EnumsSrv.VOICEBANK.SHOW_TRAINED   , backState:"vocabulary", foldername:$scope.foldername});
                            else                            $state.go("voicebank", {elems2display:EnumsSrv.VOICEBANK.SHOW_ALL       , backState:"home"      , foldername:""});
                        }
                        else    $state.go($scope.cancelState);
                    }
                })
                .catch(function(error){
                    alert(error.message);
                });            
                break;
            
            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_APPEND:    // rel_filepath is : original.wav

                return FileSystemSrv.deleteFile($scope.rel_filepath)
                .then(function() 
                {
                    if($scope.cancelState != "")
                        $state.go($scope.successState, {foldername:$scope.foldername, sessionPath:"", subjId:""});
                    else
                        $ionicHistory.goBack();                    
                })
                break;
            
            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_REPLACE:                
               
                $scope.modalText = "VUOI CANCELLARE TUTTA QUESTA NUOVA SESSIONE O SOSTIUIRE QUANTO REGISTRATO FIN QUI?"
                $scope.labelActionA = "CANCELLA TUTTO"
                $scope.labelActionB = "SOSTUISCI"
                $scope.labelActionC = "ANNULLA"
                $scope.modalAskAbortReplaceSession.show();        
                break;
        }
    };
    
    $scope.ThreeQuestionsAction = function(res)
    {
        switch(res)
        {
            case 2:
                var session_folder = StringSrv.getFileFolder($scope.rel_filepath);
                return FileSystemSrv.deleteDir(session_folder)
                .then(function()
                {
                    if($scope.cancelState != "")
                        $state.go($scope.successState, {foldername:$scope.foldername, sessionPath:"", subjId:""});
                    else
                        $ionicHistory.goBack();                                
                })
                .catch(function(error)
                {
                    alert(error.message);
                });                          
                break;
                
            case 1:
                SequencesRecordingSrv.mergeDirs();
                break;
        }
        $scope.modalAskAbortReplaceSession.hide();        
    }
    //=====================================================================

    $scope.showAlert = function(title, text) 
    {
        if($scope.popUpAlertOn == false)
        {
            var alertPopup = $ionicPopup.alert({
            title: title,
            template: text
            });
            $scope.popUpAlertOn = true;

            alertPopup.then(function(){
                $scope.popUpAlertOn = false;
            })
        }
    };
    
    $scope.showLoading = function()
    {
        // Setup the loader
        $ionicLoading.show({
            content: 'Loading',
            animation: 'fade-in',
            showBackdrop: true,
            maxWidth: 200,
            showDelay: 0
        });
    };
    
    //=====================================================================
};
controllers_module.controller('SequenceRecordCtrl', SequenceRecordCtrl);