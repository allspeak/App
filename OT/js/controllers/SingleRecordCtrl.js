/* 
audio files are automatically saved after captured, in order to may listen to them
- the save button thus simply go back
- the cancel button, first delete the file then go back
 */

function SingleRecordCtrl($scope, $window, $q, $ionicHistory, $ionicPopup, SpeechDetectionSrv, SubjectsSrv, InitAppSrv, FileSystemSrv, StringSrv, IonicNativeMediaSrv) //, $ionicPopup)
{
    $scope.initCaptureParams = {"nSampleRate": 8000,
                                "nAudioSourceType": 6, //android voice recognition
                                "nBufferSize": 1024};    
    //==================================================================================================================
    //==================================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // get standard capture params + overwrite some selected
        $scope.captureCfg       = SpeechDetectionSrv.init($scope.initCaptureParams, null);        
        
        var subject_id          = parseInt(data.stateParams.subjId);
        var sentence_id         = parseInt(data.stateParams.sentenceId);
        
        $scope.subject          = getSubject(subject_id);
        $scope.sentence         = SubjectsSrv.getSubjectSentence(subject_id, sentence_id);
        if ($scope.sentence)
        {
            $scope.filename     = StringSrv.removeExtension($scope.sentence.filename) + $scope.sentence.firstValidId + ".wav";
            $scope.audioFolder  = InitAppSrv.appData.file_system.training_folder; 
            $scope.relwavpath   = $scope.audioFolder + "/" + $scope.subject.folder + "/" + $scope.filename;                
        }
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

    $scope.onChangeVolume = function(vol)
    {
        $scope.volume = vol;
        if ($scope.playback_file)
            $scope.playback_file.setVolume($scope.volume/100);
    };
    
    //=====================================================================
    // CAPTURING (cordova-plugin-audioinput)
    //=====================================================================    
    $scope.startRecording = function()
    {
        $scope.isRecording      = !$scope.isRecording;
        $scope.recButtonLabel   = ($scope.isRecording ? $scope.bLabelStop : $scope.bLabelStart);        
        if ($scope.isRecording)
        {
            SpeechDetectionSrv.startRawCapture($scope.captureCfg, $scope.refreshMonitoring, $window);
            $scope.something2save   = 0;
            $scope.vm_raw_label     = $scope.vm_raw_label_stop;
        }
        else
        {
            SpeechDetectionSrv.stopCapture();
            $scope.saveAudio();
        }
    };
    
    $scope.saveAudio = function()
    {
        SpeechDetectionSrv.saveData2Wav($scope.relwavpath, 1)
        .then(function(){
            $scope.something2save   = 1;
            $scope.$apply();
        })
        .catch(function(error){
            alert("ERROR while saving " + $scope.filename + ": " + error.message);
        });
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
            IonicNativeMediaSrv.playAudio(InitAppSrv.appData.file_system.resolved_odp + $scope.relwavpath, volume, $scope.OnPlaybackCompleted, $scope.OnPlaybackError);
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
    //=====================================================================
    
    $scope.resetFlags = function()
    {
        $scope.playback_file    = null;
        $scope.isPlaying        = 0; 
        $scope.isPaused         = 0;       
    };
    
    $scope.save = function()
    {
        $ionicHistory.goBack();      
    };
    
    
    $scope.cancel = function()
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'You did not save the audio file, are you sure you want to exit?'})
        .then(function(res) 
        {
            if (res)
            {
                FileSystemSrv.deleteFile($scope.relwavpath)
                .then(function(success){
                    $ionicHistory.goBack();
                })
                .catch(function(error){
                    alert(error.message);
                });                
            }
            else        event.preventDefault();
        });
    };
    
    $scope.refreshMonitoring = function(received_data, elapsed, npackets, bitrate, data_params, data)
    {
        
//        $scope.totalReceivedData    = received_data;
//        $scope.elapsedTime          = elapsed;
//        $scope.packetsNumber        = npackets;
//        $scope.bitRate              = bitrate;
        
//        $scope.chart.min_data       = data_params[0];
//        $scope.chart.max_data       = data_params[1];
//        $scope.chart.mean_data      = data_params[2];
//        $scope.chart.data           = data;

//        $scope.scaleData($scope.chart, 1, $scope.chart.top_value);  // scale chart to fit into its window
       
//        $scope.$apply();
    };     
    // ============================================================================================
    // ============================================================================================
    // charting
//    $scope.chart = {width : 300,
//                    height : 100,
//                    yAxis : "Power",
//                    xAxis : "Frequencies",
//                    yScale : 10000,
//                    data : [],
//                    max_data : -Infinity,
//                    min_data : Infinity,
//                    mean_data : 0,
//                    max_volume : 500,
//                    all_pos : 0,
//                    top_value_time : 0.1,
//                    top_value_spectrum : 500000
//                };       
//                
//    $scope.chart.top_value  = $scope.chart.top_value_time; 
//     
//    // top indicates if set a global maximum, top_value represents that value
//    $scope.scaleData = function(chart_obj, top, top_value)                                            
//    {
//        var allpos = (chart_obj.min_data >= 0 ? 1 : 0);
//        if (allpos)
//        {
//            if (top)
//                chart_obj.yScale    = chart_obj.top_value;
//            else
//                chart_obj.yScale    = chart_obj.max_scale;
//            
//            chart_obj.y0        = 0;
//        }
//        else
//        {
//            var max             = Math.max(Math.abs(chart_obj.min_data, Math.abs(chart_obj.max_data)));
//            
//            if (top)            
//            {
//                chart_obj.yScale    = 2*top_value;
//                chart_obj.y0        = top_value;            
//            }
//            else
//            {
//                chart_obj.yScale    = 2*max;
//                chart_obj.y0        = max;            
//            }
//        }
//    };     
    // ============================================================================================
    // ============================================================================================
};

controllers_module.controller('SingleRecordCtrl', SingleRecordCtrl);
 
 
 
    
   
//    $scope.showPopup = function() 
//    {
//        var myPopup = $ionicPopup.show({
//            title: 'Salva la frase',
//            subTitle: 'Sei soddisfatto della registrazione?, vuoi salvarla?',
//            scope: $scope,
//            buttons: [
//                        {text: 'Cancella' },
//                        {text: '<b>Salva</b>',
//                         type: 'button-positive',
//                         onTap: function(e) {
//                            return 2;
//                            }
//                        },
//                        {text: '<b>Riascolta</b>',
//                         type: 'button-positive',
//                         onTap: function(e) {
//                            e.preventDefault();
//                            }
//                        },
//                    ]
//        });
//        myPopup.then(function(res) {
//            if (res == $scope.DO_SAVE) 
//            {
//                cpAISrv.save2Wave($scope.wavName);
//            }
//        });        
//    }  
 
 //    $scope.PlayAudio = function()
//    {
////        var media = $cordovaMedia.newMedia(InitAppSrv.appData.file_system.resolved_odp + $scope.relwavpath, function(success){
//        var media = $cordovaMedia.newMedia(InitAppSrv.appData.file_system.resolved_odp + $scope.relwavpath, function(success){
//           console.log("success: "+success); 
//        }, function (error){
//           console.log(error.message); 
//        }, function (status){
//           console.log(status); 
//        });
////        media.getDuration()
//        media.play();
//        
////        media.getCurrentPosition().then(function (pos){
////            console.log(pos);
////        });
//        
//
//     };