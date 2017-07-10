/* 
audio files are automatically saved after captured, in order to may listen to them
- the save button thus simply go back
- the cancel button, first delete the file then go back
 */
function SequenceRecordCtrl($scope, $state, $ionicPopup, SpeechDetectionSrv, InitAppSrv, FileSystemSrv, StringSrv, IonicNativeMediaSrv, TrainingSrv, MfccSrv, $ionicLoading)
{
    $scope.captureProfile   = "record";
    $scope.captureParams    = { "nSampleRate": 8000,
                                "nAudioSourceType": 1,  //android voice recognition
                                "nBufferSize": 1024,
                                "nDataDest": 203};    
                            
    $scope.initMfccParams   = {nDataType: 251, nDataDest: 235};     // get MFFILTERS & write to file
    //==================================================================================================================
    //==================================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.pluginInterface      = InitAppSrv.getPlugin();        
        $scope.plugin_enum          = $scope.pluginInterface.ENUM.PLUGIN;        
        // get standard capture params + overwrite some selected
        $scope.Cfg                  = SpeechDetectionSrv.init($scope.captureParams, $scope.captureProfile);
        $scope.captureCfg           = $scope.Cfg.captureCfg;
        
        // MFCC service
        $scope.mfccCfg              = MfccSrv.init($scope.initMfccParams).mfccCfg;

        var subject_id              = parseInt(data.stateParams.subjId);
        var sequence_id             = parseInt(data.stateParams.sequenceId);
        if(data.stateParams.savedData != null)
            $scope.something2save   = parseInt(data.stateParams.savedData)
            
       
        $scope.subject              = getSubject(subject_id);
        $scope.sentence             = TrainingSrv.getSentenceBySequenceId(sequence_id);
        if ($scope.sentence){
            $scope.relwavpath       = $scope.sentence.filename;
            $scope.filename         = StringSrv.getFileNameExt($scope.relwavpath);
            $scope.audioFolder      = InitAppSrv.getAudioFolder();             
        }
        else
            alert("SequenceRecordCtrl::$ionicView.enter error : sentence is empty");
    });
 
 
    // PLAY
    $scope.isPlaying        = 0;
    $scope.isPaused         = 0;
    $scope.playback_file    = null;
    $scope.volume           = 50;
    $scope.voice_power      = 0;    
    
    // REC
    $scope.isRecording      = 0;
    $scope.something2save   = 0;
    $scope.bLabelStart      = "REGISTRA";
    $scope.bLabelStop       = "STOP";    
    $scope.recButtonLabel   = ($scope.isRecording ? $scope.bLabelStop : $scope.bLabelStart);
    $scope.relwavpath       = ""; 
    $scope.onChangeVolume   = function(vol)
    {
        $scope.volume = vol;
        if ($scope.playback_file)
            $scope.playback_file.setVolume($scope.volume/100);
    };
    
    
    $scope.popUpAlertOn     = false;
    //=====================================================================
    // CAPTURING (cordova-plugin-audioinput based plugin)
    //=====================================================================    
    $scope.startRecording = function()
    {
        if (!$scope.isRecording)
        {
            $scope.mfccCfg.sOutputPath  = StringSrv.removeExtension($scope.relwavpath);
            $scope.something2save       = 0;

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
        $scope.recButtonLabel           = ($scope.isRecording ? $scope.bLabelStop : $scope.bLabelStart);         
        $scope.$apply();
    };
    
    $scope.onStopCapture = function()
    {
        $scope.isRecording = false;        
        $scope.recButtonLabel           = ($scope.isRecording ? $scope.bLabelStop : $scope.bLabelStart);        
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
    
    $scope.onCaptureError = function(error)
    {
//        window.removeEventListener('pluginerror', $scope.onCaptureError);
        
        $ionicLoading.hide();
        $scope.isRecording      = false;
        $scope.recButtonLabel   = $scope.bLabelStart;      
        $scope.showAlert("Error", error.toString());
        $scope.$apply();
    }; 
    
    //=====================================================================
    $scope.getMFCC = function()
    {
        var filepath_noext = StringSrv.removeExtension($scope.relwavpath);

        window.addEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.addEventListener('pluginerror'       , $scope.onMFCCError);                

        MfccSrv.getMFCCFromFile(filepath_noext, $scope.mfccCfg.nDataType, $scope.mfccCfg.nDataDest);

//        var data = SpeechDetectionSrv.getCapturedData();
//        MfccSrv.getMFCCFromData(data, $scope.plugin_enum.MFCC_DATATYPE_MFFILTERS, $scope.plugin_enum.MFCC_DATADEST_ALL, filepath_noext);        
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
    $scope.playAudio = function()
    {
        if (!$scope.isPlaying)
        {
            var volume          = $scope.volume/100;
            $scope.isPlaying    = 1;
            IonicNativeMediaSrv.playAudio(FileSystemSrv.getResolvedOutDataFolder() + $scope.relwavpath, volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
        }
        else
        {
            if($scope.isPaused)
            {
                IonicNativeMediaSrv.resumeAudio();
                $scope.isPaused = 0; 
            }
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
        if ($scope.isPlaying)
        {
            IonicNativeMediaSrv.stopAudio();
            $scope.resetFlags();
        }        
    };
    
    $scope.pauseAudio = function()
    {
        if ($scope.isPlaying)
        {
            IonicNativeMediaSrv.pauseAudio();
            $scope.isPaused = 1;
        }    
    };    
    
    $scope.onChangeVolume = function(vol)
    {
        $scope.volume = vol;
        IonicNativeMediaSrv.setVolume($scope.volume/100);
    };    
    
    //=====================================================================
    $scope.saveAudio = function()
    {
        return SpeechDetectionSrv.saveData2Wav($scope.relwavpath, 1)
        .then(function(){
            $scope.something2save   = 1;
            $scope.$apply();
        });
    };    
    //=====================================================================
    $scope.resetFlags = function()
    {
        $scope.playback_file    = null;
        $scope.isPlaying        = 0; 
        $scope.isPaused         = 0;       
    };
    
    $scope.next = function()
    {
        var next_id = TrainingSrv.getNextSentenceId();
        if(next_id >= 0)
            $state.go('record_sequence', {sequenceId:next_id, subjId:$scope.subject.id, savedData:1 });
        else
            $state.go('subjects');
    };
    
    $scope.exit = function()
    {
        $state.go('subjects');
    };
    
    $scope.abort = function(){
        $ionicPopup.confirm({ title: 'Attenzione', template: 'Are you aborting the session, the recorded files will be deleted, are you sure ?'})
        .then(function(res) 
        {
            if (res)
            {
                var session_folder = StringSrv.getFileParentFolder($scope.relwavpath);
                FileSystemSrv.deleteDir(session_folder)
                .then(function(){
                    // I'm not able to delete only the record views history, so I send the app to the starting view (where it deletes all the history)
                    $state.go("subjects");       
                })
                .catch(function(error){
                    alert(error.message);
                });                
            }
        });        
    };
    
    
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
};
controllers_module.controller('SequenceRecordCtrl', SequenceRecordCtrl);