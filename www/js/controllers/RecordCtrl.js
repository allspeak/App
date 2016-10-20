/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



 
function RecordCtrl($scope, cpAISrv, $window, $ionicPopup)
{
    $scope.volume           = 50;
    $scope.bLabelStart      = "REGISTRA";
    $scope.bLabelStop       = "STOP";
    
    $scope.isRunning        = 0;
    $scope.buttonLabel      = ($scope.isRunning ? $scope.bLabelStop : $scope.bLabelStart);
    
    $scope.DO_SAVE          = 2;
    
    $scope.wavName          = "test.wav";
        //// capture params
//    $scope.captureCfg       = cpAISrv.getStdCaptureCfg();
      

    $scope.start = function()
    {
        $scope.isRunning        = !$scope.isRunning;
        $scope.buttonLabel      = ($scope.isRunning ? $scope.bLabelStop : $scope.bLabelStart);        
        if ($scope.isRunning)
        {
            cpAISrv.startRawCapture(null, $scope, $window);
            $scope.vm_raw_label = $scope.vm_raw_label_stop;
        }
        else
        {
            cpAISrv.stopCapture();
            $scope.spectrum     = [];
            $scope.showPopup();
        }
    };
  
   
    
    $scope.onChangeVolume = function()
    {
       cpAISrv.changeVolume($scope.volume);
    };
   
   
    $scope.showPopup = function() 
    {
        var myPopup = $ionicPopup.show({
            title: 'Salva la frase',
            subTitle: 'Sei soddisfatto della registrazione?, vuoi salvarla?',
            scope: $scope,
            buttons: [
                        {text: 'Cancella' },
                        {text: '<b>Salva</b>',
                         type: 'button-positive',
                         onTap: function(e) {
                            return 2;
                            }
                        },
                        {text: '<b>Riascolta</b>',
                         type: 'button-positive',
                         onTap: function(e) {
                            e.preventDefault();
                            }
                        },
                    ]
        });
        myPopup.then(function(res) {
            if (res == $scope.DO_SAVE) 
            {
                cpAISrv.save2Wave($scope.wavName);
            }
        });        
    }   

    // ============================================================================================
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
    // ============================================================================================
    // ============================================================================================
};



controllers_module.controller('RecordCtrl', RecordCtrl);
 