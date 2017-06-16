/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function RecognitionCtrl($scope, $state, SpeechDetectionSrv, IonicNativeMediaSrv, FileSystemSrv, MfccSrv, TfSrv, InitAppSrv)
{
    $scope.captureProfile           = "recognition";
    
    $scope.captureParams            = {}; // this params definition override what defined in initAppSrv (which can be modified by user)
    
//    $scope.captureParams            = { "nSampleRate"       : 8000,
//                                        "nAudioSourceType"  : 1,  //android voice recognition
//                                        "nBufferSize"       : 512};                      
    $scope.initVadParams            = null;
    $scope.initMfccParams           = {nDataType: 2, nDataDest: 0};     // get MFFILTERS & write to file
    $scope.initTfParams             = null;
    
                    
    $scope.chunkSaveParams          = { "output_relpath":   null, // it takes it from InitAppSrv.getAudioTempFolder(): "AllSpeak/audiofiles/temp"
                                        "chunks_root_name": "chunk_"
                                      };
                              
    $scope.saveFullSpeechData       = false;
                              
                                 
    $scope.Cfg                      = null;
    $scope.captureCfg               = null;
    $scope.vadCfg                   = null;    
    $scope.mfccCfg                  = null;        
    $scope.tfCfg                    = null;        
                    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        pluginInterface                         = InitAppSrv.getPlugin();            
        
        $scope.captureParams.nDataDest          = pluginInterface.ENUM.PLUGIN.CAPTURE_DATADEST_JS_DB;
        $scope.chunkSaveParams.output_relpath   = InitAppSrv.getAudioTempFolder(); // "AllSpeak/audiofiles/temp"
        $scope.audio_files_resolved_root        = FileSystemSrv.getResolvedOutDataFolder() + $scope.chunkSaveParams.output_relpath;   // FileSystemSrv.getResolvedOutDataFolder() ends with a slash: "file:///storage/emulated/0/"
        $scope.relpath_root                     = $scope.chunkSaveParams.output_relpath;

        // get standard capture params + overwrite some selected
        $scope.Cfg                  = SpeechDetectionSrv.init($scope.captureParams, $scope.captureProfile, $scope.chunkSaveParams, $scope.initVadParams);
        $scope.captureCfg           = $scope.Cfg.captureCfg;
        $scope.vadCfg               = $scope.Cfg.vadCfg;
        $scope.mfccCfg              = MfccSrv.init($scope.initMfccParams).mfccCfg;
        $scope.tfCfg                = TfSrv.init($scope.initTfParams).tfCfg;

        $scope.input_sources        = SpeechDetectionSrv.getInputSources();
        $scope.capture_buffer       = SpeechDetectionSrv.getCaptureBuffers();
        $scope.sampling_frequencies = SpeechDetectionSrv.getSamplingFrequencies();
        
        $scope.selectedSourceType   = $scope.selectObjByValue($scope.captureCfg.nAudioSourceType, $scope.input_sources);
        $scope.selectedFrequency    = $scope.selectObjByValue($scope.captureCfg.nSampleRate, $scope.sampling_frequencies);
        $scope.selectedCaptureBuffer= $scope.selectObjByValue($scope.captureCfg.nBufferSize, $scope.capture_buffer);
        $scope.selectedSSF          = $scope.subsampling_factors[1]; //subsampling factor for visualization: regulates how many data are sent here from the service

        $scope.refreshAudioList($scope.chunkSaveParams.output_relpath);
        $scope.$apply();
    });    
    
    $scope.selectObjByValue = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].value == value)
               return objarray[i];
    }


    $scope.subsampling_factors  = [{label: "%4", value:4},{label: "%8", value:8},{label: "%16", value:16},{label: "%32", value:32}];

    $scope.speech_status_codes = {
        CAPTURE_STATUS_STARTED      : 11,
        CAPTURE_STATUS_STOPPED      : 13,
        CAPTURE_ERROR               : 110,
        SPEECH_STATUS_STARTED       : 20,
        SPEECH_STATUS_STOPPED       : 21,
        SPEECH_STATUS_SENTENCE      : 22,
        SPEECH_STATUS_MAX_LENGTH    : 23,
        SPEECH_STATUS_MIN_LENGTH    : 24,        
        VAD_ERROR                   : 120
    };
    $scope.speech_status_label=[];
    $scope.speech_status_label[$scope.speech_status_codes.CAPTURE_STATUS_STARTED] = "CAPTURE_STATUS_STARTED";
    $scope.speech_status_label[$scope.speech_status_codes.CAPTURE_STATUS_STOPPED] = "CAPTURE_STATUS_STOPPED";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_SENTENCE] = "SPEECH_STATUS_SENTENCE";
    $scope.speech_status_label[$scope.speech_status_codes.CAPTURE_ERROR] = "CAPTURE_ERROR";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_STARTED] = "SPEECH_STATUS_STARTED";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_STOPPED] = "SPEECH_STATUS_STOPPED";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_MAX_LENGTH] = "SPEECH_STATUS_MAX_LENGTH";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_MIN_LENGTH] = "SPEECH_STATUS_MIN_LENGTH";

    // monitoring
    $scope.isSpeaking               = "OFF";
    $scope.isvoicemonitoring        = 0;
    $scope.voiceDB                  = 0;
    $scope.totalNoOfSpeechCaptured  = 0;
    $scope.chunksList               = [];    
        
    $scope.initMonitoring = function()
    {
        $scope.totalNoOfSpeechCaptured = 0;       
    };
    
    $scope.initMonitoring();
    
    
    $scope.vm_voice_label_start = "Start Voice Activity Monitoring";
    $scope.vm_voice_label_stop  = "Stop Voice Activity Monitoring";
    $scope.vm_voice_label       = $scope.vm_voice_label_start;

   
    // ====================================================================================================
    // ====================================================================================================
    // called from DOM
    $scope.startVoiceActivityMonitoring = function()
    {
        if (!$scope.isvoicemonitoring)
        {
            $scope.initMonitoring();
            $scope.emptyFolder()
            .then(function(success)
            {
                SpeechDetectionSrv.startSpeechRecognition($scope.captureCfg, $scope.vadCfg, $scope.mfccCfg, $scope.tfCfg, $scope.onStartCapture, $scope.onStopCapture, $scope.onSpeechCaptured, $scope.onSpeechError, $scope.onSpeechStatus, $scope.saveFullSpeechData);
            })
        }
        else SpeechDetectionSrv.stopSpeechRecognition();
    };
    
   $scope.go2settings = function()
   {
       $state.go('settings.recognition'); 
   };

    //==================================================================================
    // PLUGIN CALLBACKS
    //==================================================================================
    $scope.onStartCapture = function()
    {
        window.addEventListener('audiometer', $scope.onDBMETER);
        
        $scope.isvoicemonitoring        = true; 
        $scope.vm_voice_label           = $scope.vm_voice_label_stop;         
        $scope.$apply();
    };
    
    $scope.onStopCapture = function()
    {
        window.removeEventListener('audiometer', $scope.onDBMETER);
        
        $scope.isvoicemonitoring        = false;        
        $scope.vm_voice_label           = $scope.vm_voice_label_start;    
        $scope.voiceDB                  = 0;        
        $scope.$apply();
    };    
    
    $scope.onSpeechCaptured = function(filename, totalNoOfSpeechCaptured, wavblob)
    {    
        $scope.totalNoOfSpeechCaptured = totalNoOfSpeechCaptured;
        $scope.refreshAudioList($scope.chunkSaveParams.output_relpath);
    };
    
    $scope.onCaptureError = function(error)
    {
       $scope.onStopCapture();
    }; 
    
    // called by plugin interface _pluginEvent::cordova.fireWindowEvent("audiometer",...
    $scope.onDBMETER = function(event)
    {    
        $scope.voiceDB = event.decibels;
        $scope.$apply();
    };
    
    $scope.onSpeechError = function(error)
    {    
        
    };
    
    $scope.onSpeechStatus = function(code)
    {    
        if(code == speechrecognition.ENUM.PLUGIN.SPEECH_STATUS_STARTED){
            $scope.isSpeaking = "ON"
            $scope.$apply();
        }
        else if(code == speechrecognition.ENUM.PLUGIN.SPEECH_STATUS_STOPPED){
            $scope.isSpeaking = "OFF"
            $scope.$apply();
        }
        console.log("code: " + code + " = " +$scope.speech_status_label[code]);
    }; 

    //=====================================================================================
    // PLAYBACK CHUNKS
    //=====================================================================================
    $scope.playAudio = function(filename)
    {
        if (!$scope.isPlaying)
        {
            var volume          = 1; //$scope.volume/100;
            $scope.isPlaying    = 1;
            
            if(filename == null)    IonicNativeMediaSrv.playAudio($scope.audio_files_resolved_root + "/" + filename, volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
            else                    IonicNativeMediaSrv.playAudio($scope.audio_files_resolved_root + "/" + filename, volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
        }
    };    

    $scope.OnPlaybackCompleted = function(success)
    {
        $scope.isPlaying    = 0;
    };
    
    $scope.OnPlaybackError = function(error)
    {
        $scope.isPlaying    = 0;
        console.log(error.message);
    };    
    
    $scope.deleteAudio = function(filename)
    {
        var relpath = $scope.relpath_root;        
        if (!$scope.isPlaying)
        {        
            FileSystemSrv.deleteFile($scope.relpath_root + "/" + filename)
            .then(function(success){
               $scope.refreshAudioList(relpath);
            })
            .catch(function(error){
                alert(error.message);
            });
        }
    };    
    
    //=====================================================================================
    // ACCESSORY
    //=====================================================================================
    $scope.refreshAudioList = function(dir)
    {    
        var that = $scope;        
        return FileSystemSrv.listDir(dir)
        .then(function(dirs){
            var len = dirs.length;
            that.chunksList = [];
            for (d=0; d<len; d++)
            {
                if (!dirs[d].isDirectory)
                    that.chunksList[d] = dirs[d].name;
            }
            that.$apply();
            return 1;
        }).catch(function(error){
            alert(error.message);
            return 0;
        });
    };
    
    $scope.emptyFolder = function()
    {
        return FileSystemSrv.deleteDir($scope.relpath_root)
        .then(function(success){
           return FileSystemSrv.createDir($scope.relpath_root, 1);
        })
        .then(function(success){
            $scope.refreshAudioList($scope.relpath_root);
        })
        .catch(function(error){
            alert(error.message);
            return 0;
        });
    };    
    //=====================================================================================        
};
controllers_module.controller('RecognitionCtrl', RecognitionCtrl)   




        
    
//    $scope.refreshMonitoring = function(received_data, elapsed, npackets, bitrate, data_params, data)
//    {    
//        $scope.totalReceivedData    = received_data;
//        $scope.elapsedTime          = elapsed;
//        $scope.packetsNumber        = npackets;
//        $scope.bitRate              = bitrate;
//        
//        $scope.chart.min_data       = data_params[0];
//        $scope.chart.max_data       = data_params[1];
//        $scope.chart.mean_data      = data_params[2];
//        $scope.chart.data           = data;
//
//        $scope.scaleData($scope.chart, 1, $scope.chart.top_value);  // scale chart to fit into its window
//       
//        $scope.$apply();
//    };    
    // ============================================================================================
    // ============================================================================================
    // callback from ng-DOM
//    $scope.updateSourceType = function(selDevice)
//    {
//        $scope.selectedSourceType           = selDevice;
//        $scope.captureCfg.audioSourceType   = parseInt($scope.selectedSourceType.value);
//    };
//
//    $scope.updateFrequency = function(selFreq)
//    {
//        $scope.selectedFrequency            = selFreq;
//        $scope.captureCfg.sampleRate        = parseInt($scope.selectedFrequency.value);
//    };    
//    
//    $scope.updateCaptureBuffer = function(selCaptBuf)
//    {
//        $scope.selectedCaptureBuffer        = selCaptBuf;
//        $scope.captureCfg.bufferSize        = parseInt($scope.selectedCaptureBuffer.value);
//    };    
//
//    $scope.updateSubsamplingFactor = function(selSSF)
//    {
//        $scope.selectedSSF        = selSSF;
//        SpeechDetectionSrv.setSubSamplingFactor(parseInt($scope.selectedSSF.value));
//    }; 
// ============================================================================================
