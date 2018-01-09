/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function RecognitionCtrl($scope, $state, SpeechDetectionSrv, $ionicPlatform, IonicNativeMediaSrv, FileSystemSrv, MfccSrv, TfSrv, InitAppSrv, RuntimeStatusSrv, VocabularySrv, UITextsSrv)
{
    //--------------------------------------------------------------------
    // debug
    $scope.saveFullSpeechData       = false;
    $scope.saveSentences            = false;    
    $scope.chunkName                = "chunk.wav"
    $scope.commandsList             = [1305, 1404, 1405, 1616, 1208, 1400, 1211, 1203, 1202, 1205, 1204, 1206, 1207, 1210, 1302, 1401, 1306, 1102, 1103, 1619, 1407, 1209, 1105]
    //--------------------------------------------------------------------
    
    $scope.foldername               = "";   // gigi
    
    $scope.vocabulary               = null;
    $scope.vocabulary_status        = null;
    
    $scope.vocabularies_relpath       = "";   // AllSpeak/vocabularies
    $scope.voicebank_relpath           = "";   // AllSpeak/voicebank
    $scope.voicebank_resolved_root  = "";   // 
    
    $scope.pluginInterface          = null; 
    //--------------------------------------------------------------------------
    // INITIALIZATIONS    
    //--------------------------------------------------------------------------
    
    // over-ride params
    $scope.captureProfile       = "recognition";
    $scope.initCaptureParams    = {};
    $scope.initMfccParams       = {nDataType: 251, nDataDest: 231};     // calculate MFFILTERS and use them internally 231 or send to file 235 (MFCC_DATADEST_FILE(
    $scope.initTfParams         = {};                                   // set in : onEnter
    $scope.initVadParams        = {};
    
    $scope.Cfg                  = {};
    $scope.Cfg.captureCfg       = {};
    $scope.Cfg.vadCfg           = {}; 
    $scope.Cfg.mfccCfg          = {};
//    $scope.Cfg.tfCfg            = {};
                    
    $scope.headsetAvailable         = true;
    $scope.headsetSelected          = false;
    
    $scope.modelsList               = [];
    $scope.loadedModel              = null;
    $scope.loadedJsonFolderName     = ""; 
    
    $scope.loadedToggleId           = 0;        // id of the enabled toggle
    //--------------------------------------------------------------------------                    
    $scope.$on("$ionicView.leave", function(event, data)
    {
        window.removeEventListener('headsetstatus', $scope.onHSStatusChange);
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("home", {"isUpdated":false});
        }, 100);   
        
        //---------------------------------------------------------------------------------------------------------------------
        // manage input params
        //---------------------------------------------------------------------------------------------------------------------        
        if(data.stateParams.foldername == null) 
        {
            alert("_ManageTrainingCtrl::$ionicView.enter. error : foldername is empty");
            $state.go("vocabularies");
        }   
        else $scope.foldername = data.stateParams.foldername;

        $scope.pluginInterface                  = InitAppSrv.getPlugin();            
        $scope.vocabularies_relpath             = InitAppSrv.getVocabulariesFolder();
        $scope.voicebank_relpath                = InitAppSrv.getVoiceBankFolder();
        $scope.voicebank_resolved_root          = FileSystemSrv.getResolvedOutDataFolder() + $scope.voicebank_relpath;   // FileSystemSrv.getResolvedOutDataFolder() ends with a slash: "file:///storage/emulated/0/"

        // get standard capture params + overwrite some selected
        $scope.Cfg.captureCfg                   = $scope.initCaptureParams;
        $scope.Cfg.vadCfg                       = $scope.initVadParams;
        $scope.Cfg.vadCfg.nAudioResultType      = ($scope.saveSentences ? $scope.pluginInterface.ENUM.PLUGIN.VAD_RESULT_PROCESS_DATA_SAVE_SENTENCE : $scope.pluginInterface.ENUM.PLUGIN.VAD_RESULT_PROCESS_DATA);
        $scope.Cfg                              = SpeechDetectionSrv.getUpdatedCfg($scope.Cfg, $scope.captureProfile, null);

        $scope.Cfg.mfccCfg                      = MfccSrv.getUpdatedCfgCopy($scope.initMfccParams);
        
        $scope.initTfParams                     = {nDataDest:$scope.pluginInterface.ENUM.PLUGIN.TF_DATADEST_MODEL_FILE};
//        $scope.Cfg.tfCfg                        = TfSrv.getUpdatedCfgCopy($scope.initTfParams);
        
        $scope.selectedSF                       = $scope.Cfg.captureCfg.nSampleRate;
        $scope.selectedCBS                      = $scope.Cfg.captureCfg.nBufferSize;

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
        
        return RuntimeStatusSrv.loadVocabulary($scope.foldername)
        .then(function(status)
        {
            $scope.vocabulary_status    = status;
            $scope.vocabulary           = status.vocabulary;
            
            // OVERRIDE LOADED VOC
            for(item in $scope.initTfParams)        $scope.vocabulary[item] = $scope.initTfParams[item];
            
            return VocabularySrv.getTrainVocabularyVoicesPaths($scope.vocabulary);  // get the path of the wav to playback once a sentence is recognized            
        })
        .then(function(voicefiles)
        {
            $scope.saAudioPath = voicefiles;
            $scope.refreshModelsList($scope.vocabularies_relpath);
        })
        .catch(function(error)
        {
            alert("_ManageTrainingCtrl::$ionicView.enter => " + error.message);
        });  
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
                    SpeechDetectionSrv.startSpeechRecognition($scope.Cfg.captureCfg, $scope.Cfg.vadCfg, $scope.Cfg.mfccCfg, $scope.vocabulary, $scope.onStartCapture, $scope.onStopCapture, $scope.onSpeechCaptured, $scope.onSpeechError, $scope.onSpeechStatus, false); // recording is performed in the plugin 
                })
            }
            else    SpeechDetectionSrv.startSpeechRecognition($scope.Cfg.captureCfg, $scope.Cfg.vadCfg, $scope.Cfg.mfccCfg, $scope.vocabulary, $scope.onStartCapture, $scope.onStopCapture, $scope.onSpeechCaptured, $scope.onSpeechError, $scope.onSpeechStatus, false); // recording is performed in the plugin 
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
    
    //--------------------------------------------------------------------------
    // CAPTURE EVENTS
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

    $scope.onCaptureError = function(error)
    {
        alert("RecogntionCtrl: Capturing error " + error.toString());
        $scope.onStopCapture();
    }; 
    
    // called by plugin interface _pluginEvent::cordova.fireWindowEvent("audiometer",...
    $scope.onDBMETER = function(event)
    {    
        $scope.voiceDB      = event.decibels;
        $scope.thresholdDB  = event.threshold;
        $scope.$apply();
    };
        
    //--------------------------------------------------------------------------
    // SPEECH EVENTS
    $scope.onSpeechCaptured = function(totalNoOfSpeechCaptured, filename)
    {    
        $scope.totalNoOfSpeechCaptured = totalNoOfSpeechCaptured;
        if($scope.saveSentences) $scope.refreshAudioList($scope.relpath_root);
    };

    $scope.onSpeechError = function(error)
    {    
        alert("RecogntionCtrl: Speech error " + error.toString());
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

    //--------------------------------------------------------------------------
    // RECOGNITION EVENTS
    // called by plugin interface _pluginEvent::cordova.fireWindowEvent("recognitionresult",...
    $scope.onRecognitionResults = function(event)
    {    
        $scope.recognizedItems = event.items;
        var recognized_index    = parseInt($scope.recognizedItems[0].id);   // IS NOT the command id, but the index/position within the vocabulary.commands array
        var wav_resolved_path   = FileSystemSrv.getResolvedOutDataFolder() + $scope.saAudioPath[recognized_index];
     
//        var command_label       = $scope.vocabulary.commands[recognized_index].id;
//        var wav_resolved_path   = $scope.voicebank_resolved_root + "/vb_" + $scope.commandsList[recognized_index] + ".wav";
        var volume              = 1; //$scope.volume/100;
        
        $scope.playAudio(wav_resolved_path, volume);
        cordova.plugin.pDialog.dismiss();        
        $scope.$apply();
    };
    
    $scope.onRecognitionError = function(error)
    { 
        cordova.plugin.pDialog.dismiss();
    };  
       
    //--------------------------------------------------------------------------
    // PLAYBACK AUDIO    
    $scope.playAudio = function(resolvedfilename, vol)
    {
        if(!$scope.isPlaying)
        {
            $scope.isPlaying = 1;
            
            if(resolvedfilename == null)    IonicNativeMediaSrv.playAudio(resolvedfilename, vol, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
            else                            IonicNativeMediaSrv.playAudio(resolvedfilename, vol, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
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
        alert(error.message);
        $scope.$apply();
    };
    //--------------------------------------------------------------------------

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
//        return TfSrv.loadTFModelPath($scope.modelsJson[index].jsonpath)
        return RuntimeStatusSrv.loadVocabulary($scope.modelsJson[index].localfolder)
        .then(function(res)
        {
            console.log("selectModel success:" + (res ? res.toString() : ""));       
            $scope.loadedModel      = TfSrv.getCfg();
            $scope.commandsList     = $scope.loadedModel.commands.map(function(item) { return item.id});
            $scope.loadedToggleId   = index;
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
        $scope.loadedModel          = TfSrv.getCfg();
        if($scope.loadedModel)      $scope.loadedJsonFolderName = $scope.loadedModel.sLocalFolder;
        else                        $scope.loadedJsonFolderName   = "";
        
        return FileSystemSrv.listDir(dir)
        .then(function(dirs)
        {
            var len = dirs.length;
            $scope.modelsJson = [];
            for (d=0; d<len; d++)
            {
                var jsonpath            = $scope.vocabularies_relpath + "/" + dirs[d].name + "/" + UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;
                $scope.modelsJson[d]    = {"label": dirs[d].name, "localfolder": dirs[d].name, "jsonpath":jsonpath};
                if($scope.loadedJsonFolderName == dirs[d].name)
                {
                    $scope.modelsJson[d].checked    = true;
                    $scope.loadedToggleId           = d;
                }
                else $scope.modelsJson[d].checked   = false;
            }
            $scope.$apply();
            return 1;
        })
        .catch(function(error){
            alert(error.message);
            return 0;
        });
    };
    //=====================================================================================        
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
//        var training_relpath = $scope.relpath_root;        
//        if (!$scope.isPlaying)
//        {        
//            FileSystemSrv.deleteFile($scope.relpath_root + "/" + filename)
//            .then(function(success){
//               $scope.refreshAudioList(training_relpath);
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
//            for (d=0; d<len; d++) that.chunksList[d] = dirs[d].name;
//            that.$apply();
//            return 1;
//        }).catch(function(error){
//            alert(error.message);
//            return 0;
//        });
//    };
//    

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
//        console.log("ManageRecordingsCtrl::onMFCCProgressFile : " + res);
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
//        console.log("ManageRecordingsCtrl::onMFCCProgressFile : " + res);
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
//        $scope.Cfg.captureCfg.audioSourceType   = parseInt($scope.selectedSourceType.value);
//    };
//
//    $scope.updateFrequency = function(selFreq)
//    {
//        $scope.selectedFrequency            = selFreq;
//        $scope.Cfg.captureCfg.sampleRate        = parseInt($scope.selectedFrequency.value);
//    };    
//    
//    $scope.updateCaptureBuffer = function(selCaptBuf)
//    {
//        $scope.selectedCaptureBuffer        = selCaptBuf;
//        $scope.Cfg.captureCfg.bufferSize        = parseInt($scope.selectedCaptureBuffer.value);
//    };    
//
//    $scope.updateSubsamplingFactor = function(selSSF)
//    {
//        $scope.selectedSSF        = selSSF;
//        SpeechDetectionSrv.setSubSamplingFactor(parseInt($scope.selectedSSF.value));
//    }; 
// ============================================================================================
