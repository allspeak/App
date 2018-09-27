/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function RecognitionCtrl($scope, $q, $state, $ionicPopup, $cordovaTextToSpeech, SpeechDetectionSrv, $ionicPlatform, IonicNativeMediaSrv, FileSystemSrv, BluetoothSrv, MfccSrv, TfSrv, InitAppSrv, RuntimeStatusSrv, VocabularySrv, RemoteAPISrv, UITextsSrv, ErrorSrv, EnumsSrv)
{
    //--------------------------------------------------------------------
    // debug
    $scope.saveFullSpeechData       = false;
    $scope.saveSentences            = false;    
    $scope.chunkName                = "chunk.wav";
    $scope.commandsList             = null; // [1305, 1404, 1405, 1616, 1208, 1400, 1211, 1203, 1202, 1205, 1204, 1206, 1207, 1210, 1302, 1401, 1306, 1102, 1103, 1619, 1407, 1209, 1105]
    //--------------------------------------------------------------------
    
    $scope.foldername               = "";   // gigi
    $scope.sessionname              = "";   // train_XXXXXX   name of the temporary training session to evaluate.
    
    $scope.vocabulary               = null;
    $scope.vocabulary_status        = null;
    $scope.selnet_jsonpath          = "";       // path of the net that should be loaded.
    
    
    $scope.vocabularies_relpath     = "";     // AllSpeak/vocabularies
    $scope.voicebank_relpath        = "";    // AllSpeak/voicebank
    $scope.voicebank_resolved_root  = "";       // 
    $scope.vocabulary_json          = "";       // AllSpeak/vocabularies/gigi/vocabulary.json
    $scope.recThreshold             = 0;        // data threshold is below 0-1. Displayed threshold is 0-100.
    $scope.recDistance              = 0;        // data threshold is below 0-1. Displayed threshold is 0-100.
    $scope.pluginInterface          = null; 
    
    $scope.isDefault                = false;
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
                    
    $scope.mExistHeadsetConnected   = false;
    $scope.mIsOnHeadsetSco          = false;
    $scope.mActiveHeadSetName       = "";
    $scope.mActiveHeadSetAddress    = "";
    
    $scope.modelsList               = [];
    $scope.loadedModel              = null;
    $scope.loadedJsonFolderName     = ""; 
    
    $scope.loadedToggleId           = 0;        // id of the enabled toggle
    $scope.originalLoadedToggleId   = -1;        // id of the selected net (to be loaded when exiting the testing phases)
    
    $scope.selectedNoise            = 0;
    $scope.noiseLevels              = [15, 20, 25];
    
    $scope.isConnected              = false;  // store whether there is an internet connection. used for TTS operation.
    //--------------------------------------------------------------------------                    
    $scope.$on("$ionicView.leave", function(event, data)
    {
        window.removeEventListener('headsetstatus', $scope.onHSStatusChange);
        window.removeEventListener('connection'  , $scope.onConnection);
        
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            if(!$scope.sessionname.length)  $state.go("home", {"isUpdated":false});
            else                            $scope.onStopTesting();
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
        
        if(data.stateParams.sessionname != "")  $scope.sessionname = "/" + data.stateParams.sessionname;
        else                                    $scope.sessionname = "";

        $scope.pluginInterface                  = InitAppSrv.getPlugin();            
        $scope.vocabularies_relpath             = InitAppSrv.getVocabulariesFolder();   // AllSpeak/vocabularies
        $scope.voicebank_relpath                = InitAppSrv.getVoiceBankFolder();      // AllSpeak/voicebank
        $scope.voicebank_resolved_root          = FileSystemSrv.getResolvedOutDataFolder() + $scope.voicebank_relpath;   // FileSystemSrv.getResolvedOutDataFolder() ends with a slash: "file:///storage/emulated/0/"
        $scope.vocabulary_relpath               = $scope.vocabularies_relpath     + "/" + $scope.foldername;     // AllSpeak/vocabularies/gigi
        $scope.vocabulary_json                  = VocabularySrv.getTrainVocabularyJsonPath($scope.foldername);

        $scope.isDefault                        = ($scope.foldername == EnumsSrv.VOCABULARY.DEFAULT_FOLDERNAME  ?   true    : false);
        // get standard capture params + overwrite some selected
        $scope.Cfg.captureCfg                   = $scope.initCaptureParams;
        $scope.Cfg.vadCfg                       = $scope.initVadParams;
        $scope.Cfg.vadCfg.nAudioResultType      = ($scope.saveSentences ? $scope.pluginInterface.ENUM.PLUGIN.VAD_RESULT_PROCESS_DATA_SAVE_SENTENCE : $scope.pluginInterface.ENUM.PLUGIN.VAD_RESULT_PROCESS_DATA);
        $scope.Cfg                              = SpeechDetectionSrv.getUpdatedCfgCopy($scope.Cfg, $scope.captureProfile, null);

        $scope.Cfg.mfccCfg                      = MfccSrv.getUpdatedCfgCopy($scope.initMfccParams);
        
        $scope.initTfParams                     = {nDataDest:$scope.pluginInterface.ENUM.PLUGIN.TF_DATADEST_MODEL_FILE};
//        $scope.Cfg.tfCfg                        = TfSrv.getUpdatedCfgCopy($scope.initTfParams);
        
        $scope.selectedSF                       = $scope.Cfg.captureCfg.nSampleRate;
        $scope.selectedCBS                      = $scope.Cfg.captureCfg.nBufferSize;

        $scope.speech_status_label              = EnumsSrv.VAD.SPEECH_STATUS_LABELS;


        $scope.isConnected                      = RemoteAPISrv.hasInternet();
        window.addEventListener('connection' , $scope.onConnection);
        window.addEventListener('headsetstatus', $scope.onHSStatusChange);
        
        $scope.mActiveHeadSetName       = UITextsSrv.RECOGNITION.labelHeadsetAbsent;

        return RuntimeStatusSrv.loadVocabulary($scope.foldername, true)
        .then(function(status)
        {
            $scope.vocabulary_status    = status;
            $scope.vocabulary           = status.vocabulary;
            
            $scope.selnet_jsonpath      = VocabularySrv.getNetJsonPath($scope.vocabulary);  // json path of the selected net or "" if sModelFileName is empty.
            
            // OVERRIDE LOADED VOC
            for(var item in $scope.initTfParams)        $scope.vocabulary[item] = $scope.initTfParams[item];
            return VocabularySrv.getExistingTrainVocabularyVoicesPaths($scope.vocabulary);  // get the path of the wav to playback once a sentence is recognized            
        })
        .then(function(voicefiles)  // [{id,filepath}]
        {
            $scope.saAudioPath = voicefiles;
            return $scope.refreshModelsList($scope.vocabulary_relpath);      // look for existing nets
        })
        .then(function()
        {
            return BluetoothSrv.getBluetoothStatus()
        })
        .then(function(bluetooth_status)
        {
            $scope.onHSStatusChange(bluetooth_status);  // a $scope.$apply(); is inside onHSStatusChange
            if($scope.saveSentences)
            {
                $scope.relpath_root                     = InitAppSrv.getAudioTempFolder();
                $scope.audio_files_resolved_root        = FileSystemSrv.getResolvedOutDataFolder() + $scope.relpath_root;   // FileSystemSrv.getResolvedOutDataFolder() ends with a slash: "file:///storage/emulated/0/"
                $scope.initVadParams.sDebugString       = $scope.audio_files_resolved_root + "/" + $scope.chunkName;
                return $scope.refreshAudioList($scope.relpath_root);
            }
            else $scope.initVadParams.sDebugString       = "";            
        })        
        .catch(function(error)
        {
            alert("RecognitionCtrl::$ionicView.enter => " + error.message);
        });  
    });    

    $scope.subsampling_factors  = [{label: "%4", value:4},{label: "%8", value:8},{label: "%16", value:16},{label: "%32", value:32}];

    // monitoring
    $scope.isSpeaking               = "OFF";
    $scope.isvoicemonitoring        = false;
    $scope.isclosingrecognition     = false;    // indicates whether a stoprecognition has been issued but onStopCallback still has not been called.
    $scope.voiceDB                  = 0;
    $scope.thresholdDB              = 0;
    $scope.totalNoOfSpeechCaptured  = 0;
    $scope.chunksList               = [];    
        
    $scope.totalNoOfSpeechCaptured  = 0;       

    $scope.vm_voice_label_start     = UITextsSrv.RECOGNITION.labelStartRecognition;
    $scope.vm_voice_label_stop      = UITextsSrv.RECOGNITION.labelStopRecognition;
    $scope.vm_voice_label           = $scope.vm_voice_label_start;

    // ====================================================================================================
    // ====================================================================================================
    // called from DOM
    $scope.startVoiceActivityMonitoring = function()
    {
        if (!$scope.isvoicemonitoring)
        {
            $scope.loadedModel.fRecognitionThreshold    = ($scope.recThreshold/100);
            $scope.totalNoOfSpeechCaptured              = 0;
            if($scope.saveSentences)
            {
                return $scope.emptyFolder()
                .then(function(success)
                {
                    SpeechDetectionSrv.startSpeechRecognition($scope.Cfg.captureCfg, $scope.Cfg.vadCfg, $scope.Cfg.mfccCfg, $scope.loadedModel, $scope.onStartCapture, $scope.onStopCapture, $scope.onSpeechCaptured, $scope.onSpeechError, $scope.onSpeechStatus, false); // recording is performed in the plugin 
                })
            }
            else    SpeechDetectionSrv.startSpeechRecognition($scope.Cfg.captureCfg, $scope.Cfg.vadCfg, $scope.Cfg.mfccCfg, $scope.loadedModel, $scope.onStartCapture, $scope.onStopCapture, $scope.onSpeechCaptured, $scope.onSpeechError, $scope.onSpeechStatus, false); // recording is performed in the plugin 
        }
        else
        {
            SpeechDetectionSrv.stopSpeechRecognition();
            $scope.isclosingrecognition = true;
        }
    };
    
    $scope.go2settings = function()
    {
        $state.go('settings.recognition', {modeid:EnumsSrv.RECOGNITION.PARAMS_MOD_VOC, foldername:$scope.foldername, sessionname:$scope.sessionname}); 
    };

//    $scope.changeThreshold = function(boolincrement)
//    {
//        $scope.recThreshold = (boolincrement == true ? $scope.recThreshold+5    :   $scope.recThreshold-5)
//        $scope.recThreshold = Math.max($scope.recThreshold, 0);
//        $scope.recThreshold = Math.min($scope.recThreshold, 50);
//    }
    
    $scope.onStopTesting = function()
    {
        return(function()
        {
            if($scope.originalLoadedToggleId)   return $scope.selectModel($scope.originalLoadedToggleId)    // restore the selected net if existed (originalLoadedToggleId > 0)
            else                                return Promise.resolve(true);
        })()
        .then(function()
        {
            $state.go("manage_training", {foldername:$scope.foldername, backState:'vocabulary'})
        })

    }
    
    $scope.resetVADThreshold = function()
    {
        return TfSrv.adjustVADThreshold()
        .then(function()
        {
            var a = 1;
        });
    }
    
    $scope.selectNoise = function(selnoise)
    {
        $scope.selectedNoise = selnoise;
        
        return TfSrv.adjustVADThreshold($scope.noiseLevels[selnoise])
        .then(function()
        {
            var a = 1;
        });        
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
        $scope.isclosingrecognition     = false;
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
        if (!$scope.$$phase) $scope.$apply();
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
    // event.items[i].id : IS NOT the command id, but the index/position within the vocabulary.commands array
    $scope.onRecognitionResults = function(event)
    {    
        $scope.recognizedItems = event.items;
        
        if(!$scope.filterResults($scope.recognizedItems.map(function(item) { return parseInt(item.confidence.substring(0, item.confidence.length-1)); })))
        {
            $scope.isPlaying = 1;
            return $scope.playbackTTS(UITextsSrv.RECOGNITION.labelUncertainResults);
        }
        else
        {
            var recognized_index    = parseInt($scope.recognizedItems[0].id);   
            $scope.$apply();        

            if($scope.saAudioPath[recognized_index].id == EnumsSrv.VOCABULARY.NOISE_ID)
            {
                $scope.OnPlaybackCompleted();
                return;
            }

            var audiofilename       = $scope.saAudioPath[recognized_index].filepath;

            if(audiofilename == "")
            {
                var text = $scope.vocabulary.commands[recognized_index].title;
                cordova.plugin.pDialog.dismiss(); 
                $scope.isPlaying = 1;
                return $scope.playbackTTS(text)
            }
            else
            {
                var wav_resolved_path   = FileSystemSrv.getResolvedOutDataFolder() + $scope.saAudioPath[recognized_index].filepath;
                var volume              = 1; //$scope.volume/100;
                $scope.playAudio(wav_resolved_path, volume);
                cordova.plugin.pDialog.dismiss();        
            }
        }
    };
    
    $scope.onRecognitionError = function(error)
    { 
        cordova.plugin.pDialog.dismiss();
    };  
   
    // SIMPLE METHOD:
    // when the 1st and 2nd commands have % difference < net.nRecognitionDistance => I ask user to repeat the sentence.
    $scope.filterResults = function(confidences)
    {
        var delta12 = confidences[0]-confidences[1];
        if(delta12 < $scope.recDistance)    return false;
        else                                return true;
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
    
    // send resumeRecognition command to plugin whether: 1) is recognizing AND 2) is not waiting for stoprecognition (as when the HS suddenly disconnected)
    $scope.OnPlaybackCompleted = function(success)
    {
        $scope.isPlaying    = 0;
        if (!$scope.$$phase) $scope.$apply();

        if($scope.isvoicemonitoring && !$scope.isclosingrecognition) SpeechDetectionSrv.resumeSpeechRecognition();
    };
    
    $scope.OnPlaybackError = function(error)
    {
        $scope.isPlaying    = 0;
        console.log(error.message);
        alert(error.message);
        $scope.$apply();
    };
    //--------------------------------------------------------------------------

    $scope.playbackTTS = function(text, locale)
    {
        if(!$scope.isConnected)
        {
            $scope.OnPlaybackCompleted();
            return Promise.resolve(false);
        }
        
        if(locale == null) locale = "it-IT";
        
        return $cordovaTextToSpeech.speak({"text":text, "locale":locale})
        .then(function()
        {
            $scope.OnPlaybackCompleted();
            return true;
        })
        .catch(function(error)
        {
            $scope.OnPlaybackCompleted();
            return false;
        });
    };
    //=====================================================================================
    // HEADSET
    //=====================================================================================
    // plugin callback
    $scope.onHSStatusChange = function(event)
    {   
        // if the HS suddenly disconnects during recognition....stop it (if is on) and playback an alert.
        if($scope.isvoicemonitoring && $scope.mIsOnHeadsetSco) // && !event.data.mExistHeadsetConnected)
            $scope.onSuddenHeadSetDisconnection(); 
        
        $scope.mExistHeadsetConnected   = event.data.mExistHeadsetConnected;
        $scope.mIsOnHeadsetSco          = event.data.mIsOnHeadsetSco;
        $scope.mActiveHeadSetName       = (event.data.mActiveHeadSetName.toString().length ? event.data.mActiveHeadSetName : UITextsSrv.RECOGNITION.labelHeadsetAbsent);
        $scope.mActiveHeadSetAddress    = event.data.mActiveHeadSetAddress;
        $scope.mAutoConnect             = event.data.mAutoConnect;
        
        if(event.data.type == pluginInterface.ENUM.PLUGIN.HEADSET_DISCONNECTED)
        {
            $scope.mActiveHeadSetName = UITextsSrv.RECOGNITION.labelHeadsetAbsent;
            $scope.mActiveHeadSetAddress = "";
        }
        
        console.log("RecognitionCtrl::onHSStatusChange => mAutoConnect: " + $scope.mAutoConnect.toString() + " SCO:" + $scope.mIsOnHeadsetSco.toString() + ", exisths: " + $scope.mExistHeadsetConnected.toString());
        $scope.$apply();
    };
   
    $scope.onSuddenHeadSetDisconnection = function()
    {
        SpeechDetectionSrv.stopSpeechRecognition();
        $scope.isclosingrecognition = true;
//        return $scope.playbackTTS();        
    };
    
   
    $scope.toogleHeadSet = function()
    {    
        $scope.mIsOnHeadsetSco = !$scope.mIsOnHeadsetSco;
        BluetoothSrv.enableHeadSet($scope.mIsOnHeadsetSco);
        if($scope.mIsOnHeadsetSco)    $scope.selectNoise(2);
    };
    //=====================================================================================
    //
    // event broadcasted by RemoteAPISrv when internet connection availability changes
    $scope.onConnection = function(event)
    {
        $scope.isConnected = event.value;
    };    
    //=====================================================================================
    //=====================================================================================
    // MODEL CHANGE
    //=====================================================================================
    $scope.selectModel = function(index)
    {
        var currentId = $scope.loadedToggleId;
        for(s=0; s<$scope.modelsJson.length; s++)
            if(s != index)
                $scope.modelsJson[s].checked = false;
        
        var sModelFileName  = $scope.modelsJson[index].sModelFileName;
        var selLabel        = $scope.modelsJson[index].sLabel;
        
        // I update the vocabulary.json only when a valid net is selected 
        return (function(str) 
        {
            if(!selLabel.startsWith(UITextsSrv.TRAINING.labelTestNetName))
                return FileSystemSrv.updateJSONFileWithObj($scope.vocabulary_json, {"sModelFileName":sModelFileName}, FileSystemSrv.OVERWRITE)
            else             
                return Promise.resolve(true);
        })(selLabel)
        .then(function()
        {
            // try loading a net json. ignore automatic recover, as this is a net json
            return VocabularySrv.getTrainVocabulary($scope.modelsJson[index].jsonpath, EnumsSrv.VOCABULARY.IGNORE_RECOVERY); 
        })
        .then(function(net)
        {
            return TfSrv.loadTFNet(net);
        })        
        .then(function()
        {
            $scope.loadedModel      = TfSrv.getCfg();
            $scope.recThreshold     = $scope.loadedModel.fRecognitionThreshold*100;     

            $scope.commandsList     = $scope.loadedModel.commands.map(function(item) { return item.id;});
            $scope.loadedToggleId   = index;
            $scope.$apply();
        })
        .catch(function(error)
        {
            return(function() 
            {
                if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST) //got from VocabularySrv.get Train Vocabulary($scope.modelsJson[index].jsonpath, true)
                {
                    return VocabularySrv.recoverMissingNetJsonFile($scope.foldername, $scope.modelsJson[index].sModelFileName)
                    .then(function()
                    {  
                        $state.go("vocabulary", {"foldername": $scope.foldername});
                        return false;       
                    });
                }
                else
                    return $ionicPopup.alert({title:UITextsSrv.labelAlertTitle, template:"Errore durante il caricamento del nuovo modello: " + (error.message != null   ? error.message : error.toString())});
            })()            
            .then(function(goon)
            {            
                if(goon)
                {
                    $scope.modelsJson[index].checked = false;
                    $scope.modelsJson[currentId].checked = true;
                    console.log("selectModel ERROR:" + error.message); 
                    return $scope.selectModel(currentId);
                }
                else return true;
            })
            .catch(function(err)
            {            
                console.log("selectModel ERROR:" + err.message);
            });
        });
    };
    
    $scope.refreshModelsList = function(dir)
    {    
        $scope.loadedModel  = TfSrv.getCfg();
        var existing_vocs   = [];
        
        return (function(net) 
        {
            if(net)
            {
                // a net is loaded
                $scope.loadedJsonFolderName = net.sModelFileName;      // net_27X_25X_28X
                return Promise.resolve(true);
            }   
            else         
            {
                // no net is loaded. check whether a net should be loaded...do it !
                if($scope.selnet_jsonpath.length) 
                {
                    return TfSrv.loadTFNetPath(selnet_jsonpath)  
                    .then(function()
                    {
                        $scope.loadedJsonFolderName   = net.sModelFileName;
                        return true;
                    })
                }
                else
                {
                    $scope.loadedJsonFolderName = ""; 
                    return Promise.resolve(true);
                }
            }            
        
        })($scope.loadedModel)
        .then(function()
        {        
            $scope.modelsJson               = [];
            $scope.loadedToggleId           = 0;
            $scope.originalLoadedToggleId   = -1;
            return VocabularySrv.getExistingLastNets($scope.foldername)    // AllSpeak/vocabularies/gigi/
        })
        .then(function(validvocs)  // [vocs with also properties: sStatus & jsonpath]
        {
            if(JSON.stringify(validvocs) !== "{}")
            {
                $scope.modelsJson   = [];
                existing_vocs       = validvocs;
                var cnt             = -1;
                for (var net in existing_vocs)
                {
                    cnt++;
                    $scope.modelsJson[cnt] = {"sLabel": existing_vocs[net].voc.sLabel2, "sModelFileName": existing_vocs[net].voc.sModelFileName, "jsonpath":dir + "/" + existing_vocs[net].voc.sModelFileName + ".json"};

                    if($scope.modelsJson[cnt].sModelFileName == $scope.loadedJsonFolderName)
                    {
                        $scope.modelsJson[cnt].checked    = true;
                        $scope.loadedToggleId             = cnt;
                    }
                    else $scope.modelsJson[cnt].checked   = false;
                }
                $scope.originalLoadedToggleId = $scope.loadedToggleId;
            }
            return 1;    
        })
        .then(function()
        {
            if($scope.sessionname != "")
            {
                // get the test net 
                // put it in first position of modelsJson
                // set it to checked and the remaining to unchecked
                return $scope.getTestVocabulary($scope.vocabulary_relpath + $scope.sessionname)
                .then(function(testvoc)
                {
                    testvoc.sLabel          = UITextsSrv.TRAINING.labelTestNetName + testvoc.sLabel;
                    $scope.modelsJson.unshift({"sLabel":testvoc.sLabel, "checked":true, "sModelFileName": testvoc.sModelFileName, "jsonpath":testvoc.jsonpath});
                    $scope.originalLoadedToggleId++;
                    $scope.loadedToggleId   = 0;
                    var len                 = $scope.modelsJson.length;
                    for (var jf=1; jf<len; jf++)
                        $scope.modelsJson[jf].checked = false;
                    return TfSrv.loadTFNet(testvoc);
                })  
                .then(function()   // string or throws
                {
                    $scope.loadedModel          = TfSrv.getCfg();
                    $scope.loadedJsonFolderName = $scope.loadedModel.sModelFileName;        // net_27X_25X_28X
                    return true;
                })
                .catch(function(error)
                {
                    if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST) //got from getTestVocabulary ...test json is absent, remove the session folder & go to vocabulary
                    {
                        return $ionicPopup.alert({title:UITextsSrv.labelAlertTitle, template:UITextsSrv.VOCABULARY.labelErrorMissingNetJsonTestSession})
                        .then(function()
                        {
                            return FileSystemSrv.deleteDir($scope.vocabulary_relpath + $scope.sessionname)
                        })
                        .then(function()
                        {  
                            $state.go("vocabulary", {"foldername": $scope.foldername});
                            return false;       
                        })
                    }  
                    else $q.reject(error);
                })                
            }
            else return true;
        })
        .then(function()
        {
            $scope.recThreshold         = $scope.loadedModel.fRecognitionThreshold*100;     
            $scope.recDistance          = $scope.loadedModel.nRecognitionDistance;     
            $scope.$apply();
        })
        .catch(function(error) 
        {
            existing_vocs           = [];
            $scope.modelsJson       = [];
            $scope.loadedToggleId   = 0;            
            $scope.$apply();            
            return $q.reject(error);
        });
    };
    
    $scope.getTestVocabulary = function(testnetdir)
    {
        var jsonpath;
        return FileSystemSrv.listFilesInDir(testnetdir, ["json"])
        .then(function(jsonfiles)
        {
            jsonpath = jsonfiles[0];
            return VocabularySrv.getTrainVocabulary(testnetdir + "/" + jsonpath, EnumsSrv.VOCABULARY.IGNORE_RECOVERY); // ignore autocorrection, manage the absence of the json in the caller
        })     
        .then(function(testvoc)
        {
            testvoc.sStatus     = "PRONTO";
            testvoc.jsonpath    = testnetdir + "/" + jsonpath;
            return testvoc;
        })
    };
    //=====================================================================================
    // ACCESSORY
    //=====================================================================================
    $scope.refreshAudioList = function(dir)
    {    
        return FileSystemSrv.listDir(dir)
        .then(function(dirs)
        {
            var len = dirs.length;
            $scope.chunksList = [];
            for (d=0; d<len; d++) $scope.chunksList[d] = dirs[d].name;
            $scope.$apply();
            return 1;
        })
        .catch(function(error)
        {
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