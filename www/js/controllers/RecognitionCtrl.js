/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function RecognitionCtrl($scope, $state, SpeechDetectionSrv, IonicNativeMediaSrv, FileSystemSrv, MfccSrv, TfSrv, InitAppSrv, StringSrv, $ionicPopup)
{
                              
    $scope.saveFullSpeechData       = false;
    $scope.saveSentences            = true;    
    $scope.captureProfile           = "recognition";
    
    $scope.captureParams            = {}; // this params definition override what defined in initAppSrv (which can be modified by user)
    
//    $scope.captureParams            = { "nSampleRate"       : 8000,
//                                        "nAudioSourceType"  : 1,  //android voice recognition
//                                        "nBufferSize"       : 512};                      
    $scope.initMfccParams           = {nDataType: 251, nDataDest: 235};     // calculate MFFILTERS and use them internally
    
    $scope.initTfParams             = {};
    $scope.initVadParams            = {};
                    
    $scope.chunkName                = "chunk.wav"

    //--------------------------------------------------------------------------
    // INITIALIZATIONS    
    //--------------------------------------------------------------------------
    $scope.HeadsetAvailable         = false;
    $scope.HeadsetSelected          = false;
    
    $scope.Cfg                      = null;
    $scope.captureCfg               = null;
    $scope.vadCfg                   = null;    
    $scope.mfccCfg                  = null;        
    $scope.tfCfg                    = null;  
    
    //--------------------------------------------------------------------------                    
    $scope.$on("$ionicView.beforeLeave", function(event, data)
    {
        window.removeEventListener('headsetstatus', $scope.onHSStatusChange);
    });
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.pluginInterface                  = InitAppSrv.getPlugin();            
        $scope.relpath_root                     = InitAppSrv.getAudioTempFolder();
        $scope.audio_files_resolved_root        = FileSystemSrv.getResolvedOutDataFolder() + $scope.relpath_root ;   // FileSystemSrv.getResolvedOutDataFolder() ends with a slash: "file:///storage/emulated/0/"
        // get standard capture params + overwrite some selected
        $scope.initVadParams.nAudioResultType   = ($scope.saveSentences ? $scope.pluginInterface.ENUM.PLUGIN.VAD_RESULT_PROCESS_DATA_SAVE_SENTENCE : $scope.pluginInterface.ENUM.PLUGIN.VAD_RESULT_PROCESS_DATA);
        $scope.initVadParams.sDebugString       = $scope.audio_files_resolved_root + "/" + $scope.chunkName;
        $scope.initTfParams.nDataDest           = $scope.pluginInterface.ENUM.PLUGIN.TF_DATADEST_MODEL_FILE;
        
        $scope.Cfg                              = SpeechDetectionSrv.init($scope.captureParams, $scope.captureProfile, null, $scope.initVadParams); //{"output_relpath":$scope.relpath_root, "chunks_root_name":$scope.chunkName}
        $scope.captureCfg                       = $scope.Cfg.captureCfg;
        $scope.vadCfg                           = $scope.Cfg.vadCfg;
        $scope.mfccCfg                          = MfccSrv.init($scope.initMfccParams).mfccCfg;
        $scope.tfCfg                            = TfSrv.init($scope.initTfParams).tfCfg;

        $scope.selectedSF                       = $scope.captureCfg.nSampleRate;
        $scope.selectedCBS                      = $scope.captureCfg.nBufferSize;
        
//        //populates comboboxes
//        $scope.input_sources        = SpeechDetectionSrv.getInputSources();
//        $scope.capture_buffer       = SpeechDetectionSrv.getCaptureBuffers();
//        $scope.sampling_frequencies = SpeechDetectionSrv.getSamplingFrequencies();
//        
//        $scope.selectedSourceType   = $scope.selectObjByValue($scope.captureCfg.nAudioSourceType, $scope.input_sources);
//        $scope.selectedFrequency    = $scope.selectObjByValue($scope.captureCfg.nSampleRate, $scope.sampling_frequencies);
//        $scope.selectedCaptureBuffer= $scope.selectObjByValue($scope.captureCfg.nBufferSize, $scope.capture_buffer);
//        $scope.selectedSSF          = $scope.subsampling_factors[1]; //subsampling factor for visualization: regulates how many data are sent here from the service

        window.addEventListener('headsetstatus', $scope.onHSStatusChange);

        $scope.refreshAudioList($scope.relpath_root);
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
    $scope.speech_status_label[$scope.speech_status_codes.CAPTURE_STATUS_STARTED]   = "CAPTURE_STATUS_STARTED";
    $scope.speech_status_label[$scope.speech_status_codes.CAPTURE_STATUS_STOPPED]   = "CAPTURE_STATUS_STOPPED";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_SENTENCE]   = "SPEECH_STATUS_SENTENCE";
    $scope.speech_status_label[$scope.speech_status_codes.CAPTURE_ERROR]            = "CAPTURE_ERROR";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_STARTED]    = "SPEECH_STATUS_STARTED";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_STOPPED]    = "SPEECH_STATUS_STOPPED";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_MAX_LENGTH] = "SPEECH_STATUS_MAX_LENGTH";
    $scope.speech_status_label[$scope.speech_status_codes.SPEECH_STATUS_MIN_LENGTH] = "SPEECH_STATUS_MIN_LENGTH";

    // monitoring
    $scope.isSpeaking               = "OFF";
    $scope.isvoicemonitoring        = 0;
    $scope.voiceDB                  = 0;
    $scope.thresholdDB              = 0;
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
                SpeechDetectionSrv.startSpeechRecognition($scope.captureCfg, $scope.vadCfg, $scope.mfccCfg, $scope.tfCfg, $scope.onStartCapture, $scope.onStopCapture, $scope.onSpeechCaptured, $scope.onSpeechError, $scope.onSpeechStatus, false); // recording is performed in the plugin 
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
        window.addEventListener('recognitionresult', $scope.onRecognitionResults);
        
        $scope.isvoicemonitoring        = true; 
        $scope.vm_voice_label           = $scope.vm_voice_label_stop;         
        $scope.$apply();
    };
    
    $scope.onStopCapture = function()
    {
        window.removeEventListener('audiometer', $scope.onDBMETER);
        window.removeEventListener('recognitionresult', $scope.onRecognitionResults);
        
        $scope.isvoicemonitoring        = false;        
        $scope.vm_voice_label           = $scope.vm_voice_label_start;    
        $scope.voiceDB                  = 0;        
        $scope.$apply();
    };    
    
    $scope.onSpeechCaptured = function(totalNoOfSpeechCaptured, filename)
    {    
        $scope.totalNoOfSpeechCaptured = totalNoOfSpeechCaptured;
        $scope.refreshAudioList($scope.relpath_root);
    };
    
    $scope.onCaptureError = function(error)
    {
       $scope.onStopCapture();
    }; 
    
    // called by plugin interface _pluginEvent::cordova.fireWindowEvent("audiometer",...
    $scope.onDBMETER = function(event)
    {    
        $scope.voiceDB      = event.decibels;
        $scope.thresholdDB  = event.threshold;
        $scope.$apply();
    };
    
    // called by plugin interface _pluginEvent::cordova.fireWindowEvent("recognitionresult",...
    $scope.onRecognitionResults = function(event)
    {    
        $scope.recognizedItems = event.items;
        cordova.plugin.pDialog.dismiss();        
        $scope.$apply();
    };
    
    $scope.onSpeechError = function(error)
    {    
        
    };
    
    $scope.onSpeechStatus = function(code)
    {    
        switch(code)
        {
            case $scope.pluginInterface.ENUM.PLUGIN.SPEECH_STATUS_STARTED:
                $scope.isSpeaking = "ON"
                $scope.$apply();
                break;

            case $scope.pluginInterface.ENUM.PLUGIN.SPEECH_STATUS_STOPPED:
                $scope.isSpeaking = "OFF"
                $scope.$apply();
                break;
                
            case $scope.pluginInterface.ENUM.PLUGIN.SPEECH_STATUS_SENTENCE:
                $scope.$apply();
                break;
        }
        console.log("code: " + code + " = " +$scope.speech_status_label[code]);
    }; 

    
    $scope.onHSStatusChange = function(event)
    {    
        $scope.HeadsetAvailable = (event.datatype == $scope.pluginInterface.ENUM.PLUGIN.HEADSET_CONNECTED ? true : false);
        $scope.HeadsetSelected = false;
        $scope.$apply();
    };
    
    $scope.onHeadsetChange = function(value)
    {    
        $scope.pluginInterface.startSCOConnection(value);
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
    // DEBUG 
    //=====================================================================================        
    $scope.debugActionA = function(filename)
    {      
        if(StringSrv.getExtension(filename) == "dat")
        {
                cordova.exec($scope.onRecognitionResults, $scope.onRecognitionError,"SpeechRecognitionPlugin", "recognizeCepstraFile", [$scope.relpath_root + "/" + filename]);
                cordova.plugin.pDialog.init({
                    theme : 'HOLO_DARK',
                    progressStyle : 'HORIZONTAL',
                    cancelable : false,
                    title : 'Please Wait...',
                    message : 'Recognizing Cepstra file...'
                });                
        }
        else
            $scope.playAudio(filename);
    };
    
    $scope.debugActionB = function(filename)
    {      
        if(StringSrv.getExtension(filename) == "dat")
        {
            if(filename.substring(0,3) != "ctx")
                var a;//create context file : $scope.chunkSaveParams.output_relpath + "/" + filename]);
            else
                alert("error while trying to calculate context file: dat file is already a ctx file");
        }
        else
            $scope.extractFeatures(filename);   // create cepstra.dat from wav
    };
    
    $scope.onRecognitionError = function(error)
    { 
        cordova.plugin.pDialog.dismiss();
    };  
    
    //==============================================================================================================================
    $scope.extractFeatures = function(filename) 
    {  
        $scope.nCurFile             = 0;
        $scope.nFiles               = 1;
        var overwrite_existing_files= true;
        
        return $ionicPopup.confirm({ title: 'Attenzione', template: 'Vuoi sovrascrivere i file esistenti?'})
        .then(function(res) 
        {
            if (res) overwrite_existing_files=true; 
        
            window.addEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
            window.addEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
            window.addEventListener('pluginError'       , $scope.onMFCCError);

            if(MfccSrv.getMFCCFromFile( $scope.relpath_root + "/" + filename, 
                                        $scope.mfccCfg.nDataType,
                                        $scope.pluginInterface.ENUM.PLUGIN.MFCC_DATADEST_FILE,
                                        overwrite_existing_files))     // does not overwrite existing (and valid) mfcc files
            {
                cordova.plugin.pDialog.init({
                    theme : 'HOLO_DARK',
                    progressStyle : 'HORIZONTAL',
                    cancelable : true,
                    title : 'Please Wait...',
                    message : 'Extracting CEPSTRA filters from folder \'s files...',
                    max : $scope.nFiles
                });
                cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
            }
        });

    };    
    
    $scope.onMFCCError = function(error){
        alert(error.message);
        $scope.resetExtractFeatures();
        console.log("ShowRecordingSessionCtrl::onMFCCProgressFile : " + res);
    };
    
    $scope.onMFCCProgressFile = function(res){
        $scope.nCurFile++;
        if($scope.nCurFile < $scope.nFiles) cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
        else
        {
            $scope.resetExtractFeatures();
            $scope.refreshAudioList($scope.relpath_root);
            $scope.$apply();            
        }
        
        console.log("ShowRecordingSessionCtrl::onMFCCProgressFile : " + res);
    };
    
    $scope.resetExtractFeatures = function()
    {
        cordova.plugin.pDialog.dismiss();
        window.removeEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.removeEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
        window.removeEventListener('pluginerror'       , $scope.onMFCCError);  
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
