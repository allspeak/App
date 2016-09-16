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
        $scope.input_sources        = HWSrv.getInputSources();
        $scope.sampling_frequencies = HWSrv.getSamplingFrequencies();
        $scope.selectedSourceType   = $scope.input_sources[0].value;
        $scope.selectedFrequency    = $scope.sampling_frequencies[0].value;
        
        });      

    // capture params
    $scope.captureCfg           = cpAISrv.getStdCaptureCfg();

    // monitoring
    $scope.ismonitoring         = 0;
        
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
    
    // FFT
    
    $scope.width = 300;
    $scope.height = 100;
    $scope.yAxis = "Power";
    $scope.xAxis = "Frequencies";  
    
    $scope.volume               = 0;
    $scope.max_volume           = 500;
    
    
    $scope.spectrum             = [];
    $scope.max_spectrum         = 2000;
    $scope.subsampling_factors  = [{label: "%1", value:1},{label: "%2", value:2},{label: "%4", value:4},{label: "%8", value:8},{label: "%16", value:16}];
    $scope.selectedSSF          = 8; //subsampling factor for visualization: regulates how many data are sent here from the service
    $scope.getSpectrumMax = function()
    {
        $scope.max_spectrum = -Infinity;
        var l = $scope.spectrum.length;
        for (var i = 0; i < l; i++) 
        {
          if ($scope.spectrum[i] > $scope.max_spectrum)
                $scope.max_spectrum = $scope.spectrum[i];
        }
    }
    
    // VAD
    $scope.vad_status           = "OFF";
    $scope.voicedetection       = { volume : 95 };
    
    $scope.data2bewritten       = 0;
    
    // ====================================================================================================
    // ====================================================================================================
    // called from DOM
    $scope.startVoiceMonitoring = function()
    {
        $scope.initMonitoringCounters();        
        $scope.ismonitoring=!$scope.ismonitoring;
        if ($scope.ismonitoring)
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
        $scope.initMonitoringCounters();
        $scope.ismonitoring = !$scope.ismonitoring;
        if ($scope.ismonitoring)
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
    
    // callback from window.addEventListener
    $scope.refreshMonitoring = function(received_data, elapsed)
    {    
        $scope.totalReceivedData    = received_data;
        $scope.elapsedTime          = elapsed;
        $scope.$apply();
    }
    
    $scope.refreshMonitoringEx = function(received_data, elapsed, npackets, bitrate, volume, spectrum)
    {    
        $scope.totalReceivedData    = received_data;
        $scope.elapsedTime          = elapsed;
        $scope.packetsNumber        = npackets;
        $scope.bitRate              = bitrate;
        $scope.volume               = volume;
        $scope.spectrum             = spectrum;
        
//        console.log(volume.toString());
        //$scope.getSpectrumMax();
        $scope.$apply();
    };    
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

    $scope.updateSubsamplingFactor = function(selSSF)
    {
        $scope.selectedSSF        = selSSF;
        cpAISrv.setSubSamplingFactor(selSSF);
    }; 
};
controllers_module.controller('SetupAudioInputCtrl', SetupAudioInputCtrl)   
  