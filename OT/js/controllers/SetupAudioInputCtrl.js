/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function SetupAudioInputCtrl($scope, SpeechDetectionSrv, MfccSrv)
{
    $scope.captureProfile   = "recognition";
    $scope.captureParams    = {"sampleRate": 8000,
                                "audioSourceType": 6, //android voice recognition
                                "bufferSize": 1024};
               
    $scope.initVadParams    = null;
    $scope.initMfccParams   = null;
    
    $scope.Cfg              = null;
    $scope.captureCfg       = null;
    $scope.vadCfg           = null;    
    $scope.mfccCfg          = null;   
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // get standard capture params + overwrite some selected
        $scope.Cfg                  = SpeechDetectionSrv.init($scope.captureParams, $scope.captureProfile, $scope.chunkSaveParams, $scope.initVadParams);
        $scope.captureCfg           = $scope.Cfg.captureCfg;
        $scope.vadCfg               = $scope.Cfg.vadCfg;
        $scope.mfccCfg              = MfccSrv.init($scope.initMfccParams).mfccCfg;

        $scope.input_sources        = SpeechDetectionSrv.getInputSources();
        $scope.capture_buffer       = SpeechDetectionSrv.getCaptureBuffers();
        $scope.sampling_frequencies = SpeechDetectionSrv.getSamplingFrequencies();
        
        $scope.selectedSourceType   = $scope.selectObjByValue($scope.captureCfg.nAudioSourceType, $scope.input_sources);
        $scope.selectedFrequency    = $scope.selectObjByValue($scope.captureCfg.nSsampleRate, $scope.sampling_frequencies);
        $scope.selectedCaptureBuffer= $scope.selectObjByValue($scope.captureCfg.nBbufferSize, $scope.capture_buffer);
        $scope.selectedSSF          = $scope.subsampling_factors[1]; //subsampling factor for visualization: regulates how many data are sent here from the service

        });      

    $scope.captureCfg = null;
    
    $scope.selectObjByValue = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].value == value)
               return objarray[i];
    };    



    $scope.subsampling_factors  = [{label: "%4", value:4},{label: "%8", value:8},{label: "%16", value:16},{label: "%32", value:32}];

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
    
    $scope.vm_raw_label_start   = "Start Raw Voice Monitoring";
    $scope.vm_raw_label_stop    = "Stop Raw Voice Monitoring";
    
    $scope.vm_fft_label_start   = "Start FFT Voice Monitoring";
    $scope.vm_fft_label_stop    = "Stop FFT Voice Monitoring";
    
    $scope.vm_voice_label_start   = "Start Voice Activity Monitoring";
    $scope.vm_voice_label_stop    = "Stop Voice Activity Monitoring";
    
    $scope.vm_raw_label         = $scope.vm_raw_label_start;
    $scope.vm_fft_label         = $scope.vm_fft_label_start;
    $scope.vm_voice_label       = $scope.vm_voice_label_start;

    // charting
    $scope.chart = {width : 300,
                    height : 100,
                    yAxis : "Power",
                    xAxis : "Frequencies",
                    yScale : 10000,
                    data : [],
                    max_data : -Infinity,
                    min_data : Infinity,
                    mean_data : 0,
                    max_volume : 500,
                    all_pos : 0,
                    top_value_time : 0.1,
                    top_value_spectrum : 500000
                };    
    
    // FFT
    $scope.spectrum             = [];
    $scope.max_spectrum         = 2000;
    
    // VAD
    $scope.isSpeaking           = "OFF";
    $scope.voicedetection       = { volume : 95 };
    
    $scope.data2bewritten       = 0;
    
    // ====================================================================================================
    // ====================================================================================================
    // called from DOM
    $scope.startVoiceMonitoring = function()
    {
        if ($scope.iscapturing_fft || $scope.isvoicemonitoring) return;
        
        $scope.initMonitoringCounters();        
        $scope.iscapturing=!$scope.iscapturing;
        if ($scope.iscapturing)
        {
            $scope.chart.top_value = $scope.chart.top_value_time;            
            SpeechDetectionSrv.startRawCapture($scope.captureCfg, $scope.refreshMonitoring);
            $scope.vm_raw_label = $scope.vm_raw_label_stop;
        }
        else
        {
            SpeechDetectionSrv.stopRawCapture();
            $scope.vm_raw_label = $scope.vm_raw_label_start;
            $scope.volume       = 0;
            $scope.spectrum     = [];
        }
    };
    
    $scope.startVoiceMonitoringDebug = function()
    {
        if ($scope.iscapturing || $scope.isvoicemonitoring) return;

        $scope.initMonitoringCounters();
        $scope.iscapturing_fft = !$scope.iscapturing_fft;
        if ($scope.iscapturing_fft)
        {
            $scope.chart.top_value = $scope.chart.top_value_spectrum;            
            SpeechDetectionSrv.startFFTCapture($scope.captureCfg, $scope.refreshMonitoring);
            $scope.vm_fft_label = $scope.vm_fft_label_stop;
        }
        else
        {
            SpeechDetectionSrv.stopFFTCapture();
            $scope.vm_fft_label = $scope.vm_fft_label_start;
            $scope.volume       = 0;
            $scope.spectrum     = [];             
        }
    };
    
    $scope.startVoiceActivityMonitoring = function()
    {
        if ($scope.iscapturing || $scope.iscapturing_fft) return;

        $scope.initMonitoringCounters();
        $scope.isvoicemonitoring = !$scope.isvoicemonitoring;
        if ($scope.isvoicemonitoring)
        {
//            $scope.chart.top_value = $scope.chart.top_value_spectrum;            
            SpeechDetectionSrv.startSpeechDetection($scope.captureCfg, $scope.vadCfg, null, $scope.onSpeechError, $scope.onSpeechStatus, saveFullSpeechData);

            $scope.vm_voice_label = $scope.vm_voice_label_stop;
        }
        else
        {
            SpeechDetectionSrv.stopSpeechCapture();
            $scope.vm_voice_label = $scope.vm_voice_label_start;
            $scope.volume       = 0;
            $scope.spectrum     = [];             
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
        console.log("code: " + code + " = " +$scope.speech_status_label[code]);
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
        $scope.selectedSourceType           = selDevice;
        $scope.captureCfg.audioSourceType   = parseInt($scope.selectedSourceType.value);
    };

    $scope.updateFrequency = function(selFreq)
    {
        $scope.selectedFrequency            = selFreq;
        $scope.captureCfg.sampleRate        = parseInt($scope.selectedFrequency.value);
    };    
    
    $scope.updateCaptureBuffer = function(selCaptBuf)
    {
        $scope.selectedCaptureBuffer        = selCaptBuf;
        $scope.captureCfg.bufferSize        = parseInt($scope.selectedCaptureBuffer.value);
    };    

    $scope.updateSubsamplingFactor = function(selSSF)
    {
        $scope.selectedSSF        = selSSF;
        SpeechDetectionSrv.setSubSamplingFactor(parseInt($scope.selectedSSF.value));
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
controllers_module.controller('SetupAudioInputCtrl', SetupAudioInputCtrl)   
  