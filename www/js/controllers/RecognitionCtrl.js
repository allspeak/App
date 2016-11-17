/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function RecognitionCtrl($scope, SpeechDetectionSrv, $window)
{
    ionic.Platform.ready(function()
    {
        $scope.ready = true; // will execute when device is ready, or immediately if the device is already ready.
        $scope.input_sources        = SpeechDetectionSrv.getInputSources();
        $scope.capture_buffer       = SpeechDetectionSrv.getCaptureBuffers();
        $scope.sampling_frequencies = SpeechDetectionSrv.getSamplingFrequencies();
        
        $scope.selectedSourceType   = $scope.input_sources[0].value;
        $scope.selectedFrequency    = $scope.sampling_frequencies[0].value;
        $scope.selectedCaptureBuffer= $scope.capture_buffer[0].value;
        });      

    // capture params
    $scope.captureCfg           = SpeechDetectionSrv.getStdCaptureCfg();

    $scope.speech_status_codes = {
        SPEECH_STARTED: 1,
        SPEECH_STOPPED: 2,
        SPEECH_ERROR: 3,
        CAPTURE_STARTED: 4,
        CAPTURE_STOPPED: 5,
        CAPTURE_ERROR: 6,
        ENCODING_ERROR: 7,
        SPEECH_MAX_LENGTH: 8,
        SPEECH_MIN_LENGTH: 9
    };
    $scope.speech_status_label = [ "", "SPEECH_STARTED", "SPEECH_STOPPED","SPEECH_ERROR", 
                                    "CAPTURE_STARTED", "CAPTURE_STOPPED", "CAPTURE_ERROR", "ENCODING_ERROR",
                                    "SPEECH_MAX_LENGTH", "SPEECH_MIN_LENGTH"];

    // monitoring
    $scope.iscapturing          = 0;
    $scope.iscapturing_fft      = 0;
    $scope.isvoicemonitoring    = 0;
        
    $scope.initMonitoringCounters = function()
    {
        $scope.totalReceivedData    = 0;
        $scope.elapsedTime          = 0;
        $scope.packetsNumber        = 0;
        $scope.bitRate              = 0;        
    };
    
    $scope.initMonitoringCounters();
    
    
    $scope.vm_voice_label_start   = "Start Voice Activity Monitoring";
    $scope.vm_voice_label_stop    = "Stop Voice Activity Monitoring";
    $scope.vm_voice_label       = $scope.vm_voice_label_start;

  
  
    // VAD
    $scope.isSpeaking           = "OFF";
    $scope.voicedetection       = { volume : 95 };
    

    
    // ====================================================================================================
    // ====================================================================================================
    // called from DOM
    $scope.startVoiceActivityMonitoring = function()
    {
        $scope.initMonitoringCounters();
        $scope.isvoicemonitoring = !$scope.isvoicemonitoring;
        if ($scope.isvoicemonitoring)
        {
            SpeechDetectionSrv.startSpeechDetection($scope.captureCfg, $window, null, $scope.onSpeechError, $scope.onSpeechStatus);
            $scope.vm_voice_label = $scope.vm_voice_label_stop;
        }
        else
        {
            SpeechDetectionSrv.stopCapture();
            $scope.vm_voice_label = $scope.vm_voice_label_start;
            $scope.volume       = 0;
        }
    };
    //==================================================================================
    // CALLBACKS
    $scope.onSpeechCaptured = function(wavblob)
    {    
        
    };
    
    $scope.onSpeechError = function(error)
    {    
        
    };
    
    $scope.onSpeechStatus = function(code)
    {    

        if(code == $scope.speech_status_codes.SPEECH_STARTED){
            $scope.isSpeaking = "ON"
//            console.log("SPEAKING");
            $scope.$apply();
        }
        else if(code == $scope.speech_status_codes.SPEECH_STOPPED){
            $scope.isSpeaking = "OFF"
//            console.log("NOT   SPEAKING");
            $scope.$apply();
        }
        console.log($scope.speech_status_label[code]);
    };
    
    $scope.refreshMonitoring = function(received_data, elapsed, npackets, bitrate, data_params, data)
    {    
        $scope.totalReceivedData    = received_data;
        $scope.elapsedTime          = elapsed;
        $scope.packetsNumber        = npackets;
        $scope.bitRate              = bitrate;
        
        $scope.chart.min_data       = data_params[0];
        $scope.chart.max_data       = data_params[1];
        $scope.chart.mean_data      = data_params[2];
        $scope.chart.data           = data;

        $scope.scaleData($scope.chart, 1, $scope.chart.top_value);  // scale chart to fit into its window
       
        $scope.$apply();
    };    
    // ============================================================================================
    // ============================================================================================
    // callback from ng-DOM
    $scope.updateSourceType = function(selDevice)
    {
        $scope.selectedSourceType           = parseInt(selDevice);
        $scope.captureCfg.audioSourceType   = $scope.selectedSourceType;
    };

    $scope.updateFrequency = function(selFreq)
    {
        $scope.selectedFrequency        = parseInt(selFreq);
        $scope.captureCfg.sampleRate    = $scope.selectedFrequency;
    };    
    
    $scope.updateCaptureBuffer = function(selCaptBuf)
    {
        $scope.selectedCaptureBuffer    = parseInt(selCaptBuf);
        $scope.captureCfg.BUFFER_SIZES  = $scope.selectedCaptureBuffer;
    };    

    $scope.updateSubsamplingFactor = function(selSSF)
    {
        $scope.selectedSSF        = parseInt(selSSF);
        SpeechDetectionSrv.setSubSamplingFactor($scope.selectedSSF);
    }; 
    // ============================================================================================
    // top indicates if set a global maximum, top_value represents that value
    $scope.scaleData = function(chart_obj, top, top_value)
    {
        var allpos = (chart_obj.min_data >= 0 ? 1 : 0);
        if (allpos)
        {
            if (top)
                chart_obj.yScale    = chart_obj.top_value;
            else
                chart_obj.yScale    = chart_obj.max_scale;
            
            chart_obj.y0        = 0;
        }
        else
        {
            var max             = Math.max(Math.abs(chart_obj.min_data, Math.abs(chart_obj.max_data)));
            
            if (top)            
            {
                chart_obj.yScale    = 2*top_value;
                chart_obj.y0        = top_value;            
            }
            else
            {
                chart_obj.yScale    = 2*max;
                chart_obj.y0        = max;            
            }
        }
    };    
        
};
controllers_module.controller('RecognitionCtrl', RecognitionCtrl)   
  