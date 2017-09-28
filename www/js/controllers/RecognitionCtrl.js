/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function RecognitionCtrl($scope, $state, SpeechDetectionSrv, IonicNativeMediaSrv, FileSystemSrv, MfccSrv, TfSrv, InitAppSrv, StringSrv, $ionicPopup)
{
    //--------------------------------------------------------------------
    // debug
    $scope.saveFullSpeechData       = false;
    $scope.saveSentences            = false;    
    $scope.chunkName                = "chunk.wav"
    $scope.commandsList             = [1305, 1404, 1405, 1616, 1208, 1400, 1211, 1203, 1202, 1205, 1204, 1206, 1207, 1210, 1302, 1401, 1306, 1102, 1103, 1619, 1407, 1209, 1105]
    //--------------------------------------------------------------------
    
    //--------------------------------------------------------------------------
    // INITIALIZATIONS    
    //--------------------------------------------------------------------------
    
    // plugin params
    $scope.captureProfile           = "recognition";
    $scope.captureParams            = {}; // this params definition override what defined in initAppSrv (which can be modified by user)
//    $scope.captureParams            = { "nSampleRate"       : 8000,
//                                        "nAudioSourceType"  : 1,  //android voice recognition
//                                        "nBufferSize"       : 512};                      
    $scope.initMfccParams           = {nDataType: 251, nDataDest: 235};     // calculate MFFILTERS and use them internally
    
    $scope.initTfParams             = {};
    $scope.initVadParams            = {};
                    
    $scope.Cfg                      = null;
    $scope.captureCfg               = null;
    $scope.vadCfg                   = null;    
    $scope.mfccCfg                  = null;        
    $scope.tfCfg                    = null;  

    $scope.headsetAvailable         = true;
    $scope.headsetSelected          = false;
    
    $scope.modelsList               = [];
    $scope.loadedJsonFile           = "";
    $scope.loadedToggleId           = 0;        // id of the enabled toggle
    //--------------------------------------------------------------------------                    
    $scope.$on("$ionicView.beforeLeave", function(event, data)
    {
        window.removeEventListener('headsetstatus', $scope.onHSStatusChange);
    });
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.pluginInterface                  = InitAppSrv.getPlugin();            

        $scope.rel_modelsrootpath               = InitAppSrv.getTFModelsFolder();
        
        $scope.rel_vbrootpath                   = InitAppSrv.getVoiceBankFolder();
        $scope.voicebank_resolved_root          = FileSystemSrv.getResolvedOutDataFolder() + $scope.rel_vbrootpath;   // FileSystemSrv.getResolvedOutDataFolder() ends with a slash: "file:///storage/emulated/0/"

        // get standard capture params + overwrite some selected
        $scope.initVadParams.nAudioResultType   = ($scope.saveSentences ? $scope.pluginInterface.ENUM.PLUGIN.VAD_RESULT_PROCESS_DATA_SAVE_SENTENCE : $scope.pluginInterface.ENUM.PLUGIN.VAD_RESULT_PROCESS_DATA);
        $scope.initTfParams.nDataDest           = $scope.pluginInterface.ENUM.PLUGIN.TF_DATADEST_MODEL_FILE;
        
        $scope.Cfg                              = SpeechDetectionSrv.init($scope.captureParams, $scope.captureProfile, null, $scope.initVadParams); //{"output_relpath":$scope.relpath_root, "chunks_root_name":$scope.chunkName}
        $scope.captureCfg                       = $scope.Cfg.captureCfg;
        $scope.vadCfg                           = $scope.Cfg.vadCfg;
        $scope.mfccCfg                          = MfccSrv.init($scope.initMfccParams).mfccCfg;
        $scope.tfCfg                            = TfSrv.change($scope.initTfParams).tfCfg;

        $scope.selectedSF                       = $scope.captureCfg.nSampleRate;
        $scope.selectedCBS                      = $scope.captureCfg.nBufferSize;

        window.addEventListener('headsetstatus', $scope.onHSStatusChange);

        if($scope.saveSentences)
        {
            $scope.relpath_root                     = InitAppSrv.getAudioTempFolder();
            $scope.audio_files_resolved_root        = FileSystemSrv.getResolvedOutDataFolder() + $scope.relpath_root;   // FileSystemSrv.getResolvedOutDataFolder() ends with a slash: "file:///storage/emulated/0/"
            $scope.initVadParams.sDebugString       = $scope.audio_files_resolved_root + "/" + $scope.chunkName;
            $scope.refreshAudioList($scope.relpath_root);
        }
        else 
            $scope.initVadParams.sDebugString       = "";
        
        $scope.refreshModelsList($scope.rel_modelsrootpath);
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

    $scope.vm_voice_label_start = "INIZIA";
    $scope.vm_voice_label_stop  = "INTERROMPI";
    $scope.vm_voice_label       = $scope.vm_voice_label_start;

    // ====================================================================================================
    // ====================================================================================================
    // called from DOM
    $scope.startVoiceActivityMonitoring = function()
    {
        if (!$scope.isvoicemonitoring)
        {
            $scope.initMonitoring();
            if($scope.saveSentences)
            {
                return $scope.emptyFolder()
                .then(function(success)
                {
                    $scope.tfCfg.saAudioPath = getTrainVocabularyVoicesPath();  // get the path of the wav to playback once a sentence is recognized
                    SpeechDetectionSrv.startSpeechRecognition($scope.captureCfg, $scope.vadCfg, $scope.mfccCfg, $scope.tfCfg, $scope.onStartCapture, $scope.onStopCapture, $scope.onSpeechCaptured, $scope.onSpeechError, $scope.onSpeechStatus, false); // recording is performed in the plugin 
                })
            }
            else
            {
                $scope.tfCfg.saAudioPath = getTrainVocabularyVoicesPath();  // get the path of the wav to playback once a sentence is recognized
                SpeechDetectionSrv.startSpeechRecognition($scope.captureCfg, $scope.vadCfg, $scope.mfccCfg, $scope.tfCfg, $scope.onStartCapture, $scope.onStopCapture, $scope.onSpeechCaptured, $scope.onSpeechError, $scope.onSpeechStatus, false); // recording is performed in the plugin 
            }
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
        if($scope.saveSentences) $scope.refreshAudioList($scope.relpath_root);
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
        
        var id                  = parseInt($scope.recognizedItems[0].id);
        var wav_resolved_path   = $scope.voicebank_resolved_root + "/vb_" + $scope.commandsList[id] + ".wav";
        var volume              = 1; //$scope.volume/100;
        
        $scope.playAudio(wav_resolved_path, volume);
        cordova.plugin.pDialog.dismiss();        
        $scope.$apply();
    };
    
    $scope.onRecognitionError = function(error)
    { 
        cordova.plugin.pDialog.dismiss();
    };  
        
    $scope.playAudio = function(filename, vol)
    {
        if(!$scope.isPlaying)
        {
            $scope.isPlaying = 1;
            
            if(filename == null)    IonicNativeMediaSrv.playAudio(filename, vol, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
            else                    IonicNativeMediaSrv.playAudio(filename, vol, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
        }
    }; 
    
    // send resumeRecognition command to plugin
    $scope.OnPlaybackCompleted = function(success)
    {
        $scope.isPlaying    = 0;
        SpeechDetectionSrv.resumeSpeechRecognition();
        $scope.$apply();
    };
    
    $scope.OnPlaybackError = function(error)
    {
        $scope.isPlaying    = 0;
        console.log(error.message);
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

    //=====================================================================================
    // HEADSET
    //=====================================================================================
    // plugin callback
    $scope.onHSStatusChange = function(event)
    {   
        var res                 = (event.datatype == $scope.pluginInterface.ENUM.PLUGIN.HEADSET_CONNECTED ? true : false);
        $scope.headsetAvailable = res;
        $scope.headsetSelected  = res;
        $scope.$apply();
    };
    
    $scope.useHS = function(bool)
    {    
        $scope.pluginInterface.startSCOConnection(bool);
    };
    //=====================================================================================
    // MODEL CHANGE
    //=====================================================================================
    $scope.selectModel = function(index)
    {
        var currentId = $scope.loadedToggleId;
        for(s=0; s<$scope.modelsJson.length; s++)
            if(s != index)
                $scope.modelsJson[s].checked = false;
        return TfSrv.loadTFModel($scope.rel_modelsrootpath + "/" + $scope.modelsJson[index].jsonname + ".json")
        .then(function(res)
        {
             console.log("selectModel success:" + res.toString());       
             $scope.loadedToggleId = index;
             $scope.$apply();
        })
        .catch(function(error)
        {
            if(error.message)   alert(error.message);        
            else                alert("Errore durante il caricamento del nuovo modello: " + error);
            
            $scope.modelsJson[index].checked = false;
            $scope.modelsJson[currentId].checked = true;
            console.log("selectModel ERROR:" + error.message); 
            return $scope.selectModel(currentId);
//            $scope.$apply();
        })
    };
    
    $scope.refreshModelsList = function(dir)
    {    
        $scope.loadedJsonFile = TfSrv.getLoadedJsonFile();
        return FileSystemSrv.listFilesInDir(dir, ["json"])
        .then(function(dirs)
        {
            var len = dirs.length;
            $scope.modelsJson = [];
            for (d=0; d<len; d++)
            {
                if (!dirs[d].isDirectory)
                {
                    $scope.modelsJson[d] = {"jsonname":StringSrv.removeExtension(dirs[d])};
                    if($scope.loadedJsonFile == dirs[d])
                    {
                        $scope.modelsJson[d].checked = true;
                        $scope.loadedToggleId = d;
                    }
                }
            }
            $scope.$apply();
            return 1;
        }).catch(function(error){
            alert(error.message);
            return 0;
        });
    };
    //=====================================================================================        
};
controllers_module.controller('RecognitionCtrl', RecognitionCtrl)   
    
    
    //=============================================================================================================================================================================
    // ---------- here starts the DEBUG section -----------------------------------------------------------------------------------------------------------------------------------
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    //=============================================================================================================================================================================
    // PLAYBACK CHUNKS
    //=====================================================================================
//    $scope.deleteAudio = function(filename)
//    {
//        var relpath = $scope.relpath_root;        
//        if (!$scope.isPlaying)
//        {        
//            FileSystemSrv.deleteFile($scope.relpath_root + "/" + filename)
//            .then(function(success){
//               $scope.refreshAudioList(relpath);
//            })
//            .catch(function(error){
//                alert(error.message);
//            });
//        }
//    };    
//    
//    //=====================================================================================
//    // ACCESSORY
//    //=====================================================================================
//    $scope.refreshAudioList = function(dir)
//    {    
//        var that = $scope;        
//        return FileSystemSrv.listDir(dir)
//        .then(function(dirs){
//            var len = dirs.length;
//            that.chunksList = [];
//            for (d=0; d<len; d++)
//            {
//                if (!dirs[d].isDirectory)
//                    that.chunksList[d] = dirs[d].name;
//            }
//            that.$apply();
//            return 1;
//        }).catch(function(error){
//            alert(error.message);
//            return 0;
//        });
//    };
//    
//    $scope.emptyFolder = function()
//    {
//        return FileSystemSrv.deleteDir($scope.relpath_root)
//        .then(function(success){
//           return FileSystemSrv.createDir($scope.relpath_root, 1);
//        })
//        .then(function(success){
//            $scope.refreshAudioList($scope.relpath_root);
//        })
//        .catch(function(error){
//            alert(error.message);
//            return 0;
//        });
//    };    
//    //=====================================================================================       
//    // DEBUG 
//    //=====================================================================================        
//    $scope.debugActionA = function(filename)
//    {      
//        if(StringSrv.getExtension(filename) == "dat")
//        {
//                cordova.exec($scope.onRecognitionResults, $scope.onRecognitionError,"SpeechRecognitionPlugin", "recognizeCepstraFile", [$scope.relpath_root + "/" + filename]);
//                cordova.plugin.pDialog.init({
//                    theme : 'HOLO_DARK',
//                    progressStyle : 'HORIZONTAL',
//                    cancelable : false,
//                    title : 'Please Wait...',
//                    message : 'Recognizing Cepstra file...'
//                });                
//        }
//        else
//            $scope.playAudio(filename);
//    };
//    
//    $scope.debugActionB = function(filename)
//    {      
//        if(StringSrv.getExtension(filename) == "dat")
//        {
//            if(filename.substring(0,3) != "ctx")
//                var a;//create context file : $scope.chunkSaveParams.output_relpath + "/" + filename]);
//            else
//                alert("error while trying to calculate context file: dat file is already a ctx file");
//        }
//        else
//            $scope.extractFeatures(filename);   // create cepstra.dat from wav
//    };
//
//    //==============================================================================================================================
//    $scope.extractFeatures = function(filename) 
//    {  
//        $scope.nCurFile             = 0;
//        $scope.nFiles               = 1;
//        var overwrite_existing_files= true;
//        
//        return $ionicPopup.confirm({ title: 'Attenzione', template: 'Vuoi sovrascrivere i file esistenti?'})
//        .then(function(res) 
//        {
//            if (res) overwrite_existing_files=true; 
//        
//            window.addEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
//            window.addEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
//            window.addEventListener('pluginError'       , $scope.onMFCCError);
//
//            if(MfccSrv.getMFCCFromFile( $scope.relpath_root + "/" + filename, 
//                                        $scope.mfccCfg.nDataType,
//                                        $scope.pluginInterface.ENUM.PLUGIN.MFCC_DATADEST_FILE,
//                                        overwrite_existing_files))     // does not overwrite existing (and valid) mfcc files
//            {
//                cordova.plugin.pDialog.init({
//                    theme : 'HOLO_DARK',
//                    progressStyle : 'HORIZONTAL',
//                    cancelable : true,
//                    title : 'Please Wait...',
//                    message : 'Extracting CEPSTRA filters from folder \'s files...',
//                    max : $scope.nFiles
//                });
//                cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
//            }
//        });
//
//    };    
//    
//    $scope.onMFCCError = function(error){
//        alert(error.message);
//        $scope.resetExtractFeatures();
//        console.log("ShowRecordingSessionCtrl::onMFCCProgressFile : " + res);
//    };
//    
//    $scope.onMFCCProgressFile = function(res){
//        $scope.nCurFile++;
//        if($scope.nCurFile < $scope.nFiles) cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
//        else
//        {
//            $scope.resetExtractFeatures();
//            if($scope.saveSentences) $scope.refreshAudioList($scope.relpath_root);
//            $scope.$apply();            
//        }
//        
//        console.log("ShowRecordingSessionCtrl::onMFCCProgressFile : " + res);
//    };
//    
//    $scope.resetExtractFeatures = function()
//    {
//        cordova.plugin.pDialog.dismiss();
//        window.removeEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
//        window.removeEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
//        window.removeEventListener('pluginerror'       , $scope.onMFCCError);  
//    };    




        
    
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
