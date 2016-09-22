/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



 
function AmplifierCtrl($scope, cpAISrv, $window)
{
    $scope.volume           = 50;
    $scope.bLabelStart      = "AVVIA";
    $scope.bLabelStop       = "STOP";
    
    $scope.isRunning        = 0;
    $scope.buttonLabel      = ($scope.isRunning ? $scope.bLabelStop : $scope.bLabelStart);
    
        //// capture params
//    $scope.captureCfg       = cpAISrv.getStdCaptureCfg();
      

    $scope.start = function()
    {
        $scope.isRunning=!$scope.isRunning;
        $scope.buttonLabel      = ($scope.isRunning ? $scope.bLabelStop : $scope.bLabelStart);        
        if ($scope.isRunning)
        {
            cpAISrv.startRawPlayback(null, $scope, $window);
            $scope.vm_raw_label = $scope.vm_raw_label_stop;
        }
        else
        {
            cpAISrv.stopCapture();
            $scope.spectrum     = [];
        }
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
    
   $scope.onChangeVolume = function()
   {
       cpAISrv.changeVolume($scope.volume);
   };
   
   
    // ============================================================================================
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
                
    $scope.chart.top_value  = $scope.chart.top_value_time; 
     
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



controllers_module = angular.module('controllers_module', [])

.controller('AmplifierCtrl', AmplifierCtrl);
 