/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function SetupAudioInputCtrl($scope, cpAISrv, HWSrv, $window, VadSrv)
{
    ionic.Platform.ready(function()
    {
        $scope.ready = true; // will execute when device is ready, or immediately if the device is already ready.
        $scope.input_sources        = cpAISrv.getInputSources();
        $scope.capture_buffer       = cpAISrv.getCaptureBuffers();
        $scope.sampling_frequencies = cpAISrv.getSamplingFrequencies();
        
        $scope.selectedSourceType   = $scope.input_sources[0].value;
        $scope.selectedFrequency    = $scope.sampling_frequencies[0].value;
        $scope.selectedCaptureBuffer= $scope.capture_buffer[0].value;
        });      

    // capture params
    $scope.captureCfg           = cpAISrv.getStdCaptureCfg();

    // monitoring
    $scope.iscapturing          = 0;
    $scope.iscapturing_fft      = 0;
        
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
    
    $scope.vm_raw_label         = $scope.vm_raw_label_start;
    $scope.vm_fft_label         = $scope.vm_fft_label_start;

    // charting
    $scope.chart = {width : 300,
                    height : 100,
                    yAxis : "Power",
                    xAxis : "Frequencies",
                    yScale : 10000,
                    data : [],
                    max_data : 0,
                    volume : 0,
                    max_volume : 500
                };    
    
    // FFT
    $scope.spectrum             = [];
    $scope.max_spectrum         = 2000;
    $scope.subsampling_factors  = [{label: "%1", value:1},{label: "%2", value:2},{label: "%4", value:4},{label: "%8", value:8},{label: "%16", value:16},{label: "%32", value:32}];
    $scope.selectedSSF          = 32; //subsampling factor for visualization: regulates how many data are sent here from the service
    
    // VAD
    $scope.vad_status           = "OFF";
    $scope.voicedetection       = { volume : 95 };
    
    $scope.data2bewritten       = 0;
    
    // ====================================================================================================
    // ====================================================================================================
    // called from DOM
    $scope.startVoiceMonitoring = function()
    {
        if ($scope.iscapturing_fft) return;
        
        $scope.initMonitoringCounters();        
        $scope.iscapturing=!$scope.iscapturing;
        if ($scope.iscapturing)
        {
            cpAISrv.startRawCapture($scope.captureCfg, $scope, $window);
            $scope.vm_raw_label = $scope.vm_raw_label_stop;
        }
        else
        {
            cpAISrv.stopCapture();
            $scope.vm_raw_label = $scope.vm_raw_label_start;
            $scope.volume       = 0;
            $scope.spectrum     = [];
        }
    };
    
    $scope.startVoiceMonitoringDebug = function()
    {
        if ($scope.iscapturing) return;

        $scope.initMonitoringCounters();
        $scope.iscapturing_fft = !$scope.iscapturing_fft;
        if ($scope.iscapturing_fft)
        {
//            cpAISrv.startCapture($scope.captureCfg, $scope, $window);
            cpAISrv.startFFTCapture($scope.captureCfg, $scope, $window);
//            VadSrv.startCapture($scope.captureCfg, $scope, $window);
            $scope.vm_fft_label = $scope.vm_fft_label_stop;
        }
        else
        {
            cpAISrv.stopCapture();
            $scope.vm_fft_label = $scope.vm_fft_label_start;
            $scope.volume       = 0;
            $scope.spectrum     = [];             
        }
    };
    
    $scope.refreshMonitoring = function(received_data, elapsed, npackets, bitrate, volume, data)
    {    
        $scope.totalReceivedData    = received_data;
        $scope.elapsedTime          = elapsed;
        $scope.packetsNumber        = npackets;
        $scope.bitRate              = bitrate;
        $scope.chart.volume[2]      = volume;
        $scope.chart.data           = data;

        $scope.$apply();
    };    
    // ============================================================================================
    // ============================================================================================
    // callback from ng-DOM
    $scope.updateSourceType = function(selDevice)
    {
        $scope.selectedSourceType           = selDevice;
        $scope.captureCfg.audioSourceType   = $scope.selectedSourceType;
    };

    $scope.updateFrequency = function(selFreq)
    {
        $scope.selectedFrequency        = selFreq;
        $scope.captureCfg.sampleRate    = $scope.selectedFrequency;
    };    
    
    $scope.updateCaptureBuffer = function(selCaptBuf)
    {
        $scope.selectedCaptureBuffer    = selCaptBuf;
        $scope.captureCfg.BUFFER_SIZES  = $scope.selectedCaptureBuffer;
    };    

    $scope.updateSubsamplingFactor = function(selSSF)
    {
        $scope.selectedSSF        = selSSF;
        cpAISrv.setSubSamplingFactor(selSSF);
    }; 
    // ============================================================================================
};
controllers_module.controller('SetupAudioInputCtrl', SetupAudioInputCtrl)   
  