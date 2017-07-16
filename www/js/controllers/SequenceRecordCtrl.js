/* 
there are 3  modalities:
    EnumsSrv.RECORD.MODE_SINGLE_BANK         = 10;
    EnumsSrv.RECORD.MODE_SEQUENCE_BANK       = 11;
    EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING   = 12;

BANK    : save in AllSpeak/voicebank folder, the selected sentences contained in the global_vocabulary.json
TRAIN   : save in AllSpeak/audio_files/training_XXX all (or the selected in case of partial retraining) the sentences contained in the vocabulary.json file

According to the modality, there are 3 possibly END events:

    MODE_SINGLE_BANK        : DONE (confirm new, go to calling page)    CANCELLA (delete new file, go back to the calling page)
    MODE_SEQUENCE_BANK      : DONE (confirm new, go to next seq. item)  SKIP (delete new file, go to next seq. item)  CANCELLA (delete new file and go back to the calling page)
    MODE_SEQUENCE_TRAINING  : DONE (go to next seq. item)   CANCELLA (delete file and go back to the calling page)    ABORT (delete all current session)

Two operative modalities....compare two wav or overwrite

audio files are automatically saved after captured, in order to may listen to them
- the save button thus simply go back
- the cancel button, first delete the file then go back
 */
function SequenceRecordCtrl($scope, $state, $ionicPopup, $ionicLoading, SpeechDetectionSrv, InitAppSrv, VocabularySrv, FileSystemSrv, StringSrv, IonicNativeMediaSrv, SequencesRecordingSrv, MfccSrv, EnumsSrv, UITextsSrv, SubjectsSrv)
{
    // calling params
    $scope.mode_id          = -1;        // ctrl modality MODE_SINGLE_RECORD, MODE_SEQUENCE_RECORD, MODE_SINGLE_TRAINING, MODE_SEQUENCE_TRAINING
    $scope.sentence_id      = -1;
    $scope.subject_id       = -1;       // used by multi-users Apps like VoiceRecorder

    
    // behaviour switchers
    $scope.preserveOriginal = false;        // if yes show two buttons group and let user choose the favourite
    $scope.isSequence       = false;
    $scope.existNewFile     = false;     // define whether enabling the Next & Exit buttons
    $scope.existOriginalFile= false;     // define whether enabling the Next & Exit buttons
    
    // rel path of wav files
    $scope.rel_filepath             = ""; 
    $scope.rel_originalfilepath     = "";    
    
    // objects
    $scope.sentence         = null;
    $scope.subject          = null;     // used by multi-users Apps like VoiceRecorder

    // capture params
    $scope.captureProfile   = "record";
    $scope.captureParams    = {};
//                                "nSampleRate": 8000,
//                                "nAudioSourceType": 1,  //android voice recognition
//                                "nBufferSize": 1024,
//                                "nDataDest": 203};   
    $scope.initMfccParams   = {nDataType: 251, nDataDest: 235};     // get MFFILTERS & write to file
    
    // buttons text
    $scope.skipButtonLabel  = UITextsSrv.RECORD.BTN_SKIP;
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
    //==================================================================================================================
    // INIT PAGE
    //==================================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.resetFlags();        
        if(data.stateParams.modeId != null)
            $scope.mode_id         = parseInt(data.stateParams.modeId);
        else            
            alert("SequenceRecordCtrl::$ionicView.enter. error : modeId is empty");

        // in MODE_SINGLE_BANK is really a sentenceId, in SEQUENCE mode is the index of the array of sequences
        if(data.stateParams.sentenceId != null)
            $scope.sentence_id     = parseInt(data.stateParams.sentenceId);
        else            
            alert("SequenceRecordCtrl::$ionicView.enter. error : sentenceId is empty");

        // optional param
        if(data.stateParams.subjId != null)
        {
            $scope.subject_id      = parseInt(data.stateParams.subjId);
            $scope.subject         = SubjectsSrv.getSubject($scope.subject_id);
        }

        switch ($scope.mode_id)
        {
            case EnumsSrv.RECORD.MODE_SINGLE_BANK:
                $scope.preserveOriginal     = true;
                $scope.isSequence           = false;
                
                $scope.nextButtonLabel      = UITextsSrv.RECORD.BTN_NEXT_SINGLE;
                $scope.exitButtonLabel      = UITextsSrv.RECORD.BTN_EXIT_SINGLE;    

                 // sentence.filename is a file name (e.g. "ho_sete.wav")
                $scope.sentence             = VocabularySrv.getBankSentence($scope.sentence_id);
                
                if ($scope.sentence)
                {
                    $scope.filename         = $scope.sentence.filename;                 // "ho_sete.wav"
                    $scope.audioFolder      = InitAppSrv.getVoiceBankFolder();          // AllSpeak/voicebank       
                    $scope.rel_filepath     = $scope.audioFolder + "/" + $scope.filename;
                    
                }
                else                        alert("SequenceRecordCtrl::$ionicView.enter error : sentence is empty");
                break;            
            
            case EnumsSrv.RECORD.MODE_SEQUENCE_BANK:
                $scope.preserveOriginal     = true;
                $scope.isSequence           = true;
                
                $scope.nextButtonLabel      = UITextsSrv.RECORD.BTN_NEXT_SEQUENCE;
                $scope.exitButtonLabel      = UITextsSrv.RECORD.BTN_EXIT_SEQUENCE;                 
                
                // sentence.filename is a rel path (AllSpeak/voicebank/filename.wav or AllSpeakVoiceRecorder/audio_files/training_XXXX/filename.wav
                $scope.sentence             = SequencesRecordingSrv.getSentenceBySequenceId($scope.sentence_id);
                if ($scope.sentence)
                {
                    $scope.rel_filepath     = $scope.sentence.rel_filepath;
                    $scope.filename         = StringSrv.getFileNameExt($scope.rel_filepath);
                    $scope.audioFolder      = InitAppSrv.getVoiceBankFolder();          // AllSpeak/voicebank or AllSpeakRecorder/audio_files/SUBJ_LABEL           
                }
                else                        alert("SequenceRecordCtrl::$ionicView.enter error : sentence is empty");                     
                break;
                
            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING:
                $scope.preserveOriginal     = false;   
                $scope.isSequence           = true;
                
                $scope.nextButtonLabel      = UITextsSrv.service.RECORD.BTN_NEXT_SEQUENCE;
                $scope.exitButtonLabel      = UITextsSrv.service.RECORD.BTN_EXIT_SEQUENCE;                   
                $scope.enableAbortButton    = true;                
                
                // sentence.filename is a rel path (AllSpeak/voicebank/filename.wav or AllSpeakVoiceRecorder/audio_files/training_XXXX/filename.wav
                $scope.sentence             = SequencesRecordingSrv.getSentenceBySequenceId($scope.sentence_id);
                if ($scope.sentence)
                {
                    $scope.rel_filepath     = $scope.sentence.rel_filepath;
                    $scope.filename         = StringSrv.getFileNameExt($scope.rel_filepath);
                    $scope.audioFolder      = InitAppSrv.getAudioFolder();          // AllSpeak/voicebank or AllSpeakRecorder/audio_files/SUBJ_LABEL           
                }
                else                        alert("SequenceRecordCtrl::$ionicView.enter error : sentence is empty");                          
                break;
        }
        //-------------------------------------------------------------------------------
        //capture params
        $scope.pluginInterface      = InitAppSrv.getPlugin();        
        $scope.plugin_enum          = $scope.pluginInterface.ENUM.PLUGIN;        
        // get standard capture params + overwrite some selected
        $scope.Cfg                  = SpeechDetectionSrv.init($scope.captureParams, $scope.captureProfile);
        $scope.captureCfg           = $scope.Cfg.captureCfg;
        
        // MFCC service
        $scope.mfccCfg              = MfccSrv.init($scope.initMfccParams).mfccCfg;
        //-------------------------------------------------------------------------------
        return FileSystemSrv.existFile($scope.rel_filepath)
        .then(function(exist)
        {
            if(exist)   $scope.existOriginalFile    = true;
            else        $scope.existOriginalFile    = false;
            
            if($scope.preserveOriginal)
            {
                    $scope.rel_originalfilepath = $scope.rel_filepath;
                    $scope.rel_filepath         = StringSrv.removeExtension($scope.rel_filepath) + "_temp" + EnumsSrv.RECORD.FILE_EXT;            
            }
            else    $scope.rel_originalfilepath = "";
            
            $scope.$apply();
        });
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
            $scope.mfccCfg.sOutputPath  = StringSrv.removeExtension($scope.rel_filepath);
            SpeechDetectionSrv.startRawCapture($scope.captureCfg, $scope.refreshMonitoring, $scope.onStartCapture, $scope.onStopCapture, $scope.onCaptureError, $scope.mfccCfg);
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
        $scope.$apply();
        return $scope.saveAudio()
        .then(function(){
            $ionicLoading.hide();       
//                $scope.getMFCC();
        })
        .catch(function(error){
            $ionicLoading.hide();
            console.log("startRecording .....ERROR while saving " + $scope.filename + ": " + JSON.stringify(error));
        });            
    };
    
    $scope.refreshMonitoring = function(received_data, elapsed, npackets, bitrate, data_params, data){};    
    EnumsSrv.RECORD.MODE_SINGLE_BANK
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
        return SpeechDetectionSrv.saveData2Wav($scope.rel_filepath, 1)
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

        MfccSrv.getMFCCFromFile(filepath_noext, $scope.mfccCfg.nDataType, $scope.mfccCfg.nDataDest);

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
    
    $scope.onChangeVolume   = function(vol)
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
                return FileSystemSrv.renameFile($scope.rel_filepath, $scope.rel_originalfilepath, true)
                .then(function(){
                    $state.go(InitAppSrv.getPostRecordState());
                })
                .catch(function(error){
                    alert(error.message);
                });
                break;
                
            case EnumsSrv.RECORD.MODE_SEQUENCE_BANK:
                return FileSystemSrv.renameFile($scope.rel_filepath, $scope.rel_originalfilepath, true)
                .then(function()
                {
                    var next_id = SequencesRecordingSrv.getNextSentenceId();
                    if(next_id >= 0)
                        $state.go('record_sequence', {sentenceId:next_id, modeId:$scope.mode_id , savedData:1 });
                    else
                        $state.go(InitAppSrv.getPostRecordState());
                })
                .catch(function(error){
                    alert(error.message);
                });
                break;

            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING:
                var next_id = SequencesRecordingSrv.getNextSentenceId();
                if(next_id >= 0)
                    $state.go('record_sequence', {sentenceId:next_id, modeId:$scope.mode_id , savedData:1 });
                else
                    $state.go(InitAppSrv.getPostRecordState());
                break;
        }
    };
    
    $scope.skip = function()
    {
        // in MODE_SEQUENCE_BANK:       rel_filepath is : original_temp.wav
        // in MODE_SEQUENCE_TRAINING:   rel_filepath is : original.wav
                
        return FileSystemSrv.deleteFile($scope.rel_filepath)
        .then(function()
        {
            var next_id = SequencesRecordingSrv.getNextSentenceId();
            if(next_id >= 0)
                $state.go('record_sequence', {sentenceId:next_id, modeId:$scope.mode_id , savedData:1 });
            else
                $state.go(InitAppSrv.getPostRecordState());
        })
        .catch(function(error){
            alert(error.message);
        });
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
                    $state.go(InitAppSrv.getPostRecordState());
                })
                .catch(function(error){
                    alert(error.message);
                });            
                break;
            
            case EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING:    // rel_filepath is : original.wav
                
                $ionicPopup.confirm({ title: 'Attenzione', template: 'Are you aborting the session, the recorded files will be deleted, are you sure ?'})
                .then(function(res) 
                {
                    if (res)
                    {
                        var session_folder = StringSrv.getFileParentFolder($scope.rel_filepath);
                        FileSystemSrv.deleteDir(session_folder)
                        .then(function(){
                            // I'm not able to delete only the record views history, so I send the app to the starting view (where it deletes all the history)
                            $state.go(InitAppSrv.getPostRecordState());       
                        })
                        .catch(function(error){
                            alert(error.message);
                        });                
                    }
                });                
//                return FileSystemSrv.deleteFile($scope.rel_filepath)
//                .then(function()
//                {
//                    var next_id = SequencesRecordingSrv.getNextSentenceId();
//                    if(next_id >= 0)
//                        $state.go('record_sequence', {sentenceId:next_id, modeId:$scope.mode_id , savedData:1 });
//                    else
//                        $state.go(InitAppSrv.getPostRecordState());
//                })
//                .catch(function(error){
//                    alert(error.message);
//                });
                break;
        }

 
        
        
        
    };
    
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