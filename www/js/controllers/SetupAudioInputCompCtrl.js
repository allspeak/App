/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function SetupAudioInputCompCtrl($scope, cpAISrv, $window)
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
        
    //defaults:
    
    $scope.CHART_TYPE           = {time:0, spectrum:1};
    $scope.vm_raw_label_start   = "Start Raw Voice Monitoring";
    $scope.vm_raw_label_stop    = "Stop Raw Voice Monitoring";
    
    $scope.vm_fft_label_start   = "Start FFT Voice Monitoring";
    $scope.vm_fft_label_stop    = "Stop FFT Voice Monitoring";
    
    $scope.vm_raw_label         = $scope.vm_raw_label_start;
    $scope.vm_fft_label         = $scope.vm_fft_label_start;

    $scope.top_value_time       = 0.1;
    $scope.top_value_spectrum   = 500000;

    $scope.max_volume           = 500;    
    $scope.chart_width          = 300;
    $scope.chart_height         = 100;
    
    
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
    
    
    // charting options
    $scope.static_charts_params = [
                    {yAxis:"Power", xAxis: "Frequencies", autoscale: 0, top_value: $scope.top_value_spectrum, max_volume: $scope.max_volume},
                    {yAxis:"db"   , xAxis: "Time"       , autoscale: 0, top_value: $scope.top_value_time    , max_volume: $scope.max_volume}
                    ];

    $scope.chart_static_data = $scope.static_charts_params[0];
    $scope.chart_dynamic_data = {min:0, max:0, mean:0, data: []};
    
    $scope.subsampling_factors  = [{label: "%1", value:1},{label: "%2", value:2},{label: "%4", value:4},{label: "%8", value:8},{label: "%16", value:16},{label: "%32", value:32}];
    $scope.selectedSSF          = 32; //subsampling factor for visualization: regulates how many data are sent here from the service
    
    // VAD
    $scope.vad_status           = "OFF";
    
    $scope.data2bewritten       = 0;
    
    // ====================================================================================================
    $scope.setChartType = function(type)
    {
        $scope.chart_static_data = $scope.static_charts_params[type];
    };
    // ====================================================================================================
    // ====================================================================================================
    // called from DOM
    $scope.startRawMonitoring = function()
    {
        if ($scope.iscapturing_fft) return;
        
        $scope.initMonitoringCounters();        
        $scope.iscapturing=!$scope.iscapturing;
        if ($scope.iscapturing)
        {
            $scope.setChartType($scope.CHART_TYPE.time);
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
    
    $scope.startFFTMonitoring = function()
    {
        if ($scope.iscapturing) return;

        $scope.initMonitoringCounters();
        $scope.iscapturing_fft = !$scope.iscapturing_fft;
        if ($scope.iscapturing_fft)
        {
            $scope.setChartType($scope.CHART_TYPE.spectrum);
            cpAISrv.startFFTCapture($scope.captureCfg, $scope, $window);
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
    
    $scope.refreshMonitoring = function(received_data, elapsed, npackets, bitrate, data_params, data)
    {    
        $scope.totalReceivedData    = received_data;
        $scope.elapsedTime          = elapsed;
        $scope.packetsNumber        = npackets;
        $scope.bitRate              = bitrate;
        
//        $scope.min_data       = data_params[0];
//        $scope.max_data       = data_params[1];
//        $scope.mean_data      = data_params[2];
//        $scope.data           = data;

        $scope.chart_dynamic_data = {min:data_params[0], max:data_params[1], mean:data_params[2], data: data}
       
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
        cpAISrv.setSubSamplingFactor($scope.selectedSSF);
    }; 
    // ============================================================================================
};
controllers_module.controller('SetupAudioInputCompCtrl', SetupAudioInputCompCtrl)   
  