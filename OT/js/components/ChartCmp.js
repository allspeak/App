/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 * 
 * 
 * two info:
 * the static ones: (axis ...labels maxima
 * the dynamic ones: (mean, min, max, data)
 * 
 * 
 * chart data can be scaled to an exogenous top value, or autoscaled according to the current top value.
 * chart are always symmetrical -max-0-max  or   0-max
 * chart must be apriori defined as displaying only positive or neg/pos values
 * 
 */

function ChartCompCtrl ($scope)
{
//    var $scope = this;
    
    $scope.static = {};
    $scope.dynamic = {};
    //default exogenous static values    
    $scope.static.width         = 100;
    $scope.static.height        = 100;
    $scope.static.yAxis         = "Power";
    $scope.static.xAxis         = "Frequencies";
    $scope.static.autoscale     = 1;      // scale data according to : 0) a predefined global maximum, 1) current maximum         
    $scope.static.all_pos       = 0;    
    $scope.static.max_volume    = 500;
    
    // with autoscale 0...u have to define
    $scope.static.top_value     = 100;

    // exogenous
    $scope.dynamic.mean         = 0;    
    $scope.dynamic.max          = -Infinity;
    $scope.dynamic.min          = Infinity;
    $scope.dynamic.data         = [];

    // endogenous, calculated online
    $scope.yScale               = 0;    
    $scope.y0                   = 0;  
    
    $scope.watch('dynamic', function (newvalue, oldvalue, $scope){
        $scope.scaleData();
    }, true);
    // top indicates if set a global maximum, top_value represents that value
    $scope.scaleData = function()
    {
//        var allpos = ($scope.min_data >= 0 ? 1 : 0);
        if ($scope.static.allpos)
        {
            if ($scope.static.autoscale)
                $scope.yScale    = $scope.dynamic.max;
            else
                $scope.yScale    = $scope.static.top_value;
            
            $scope.y0        = 0;
        }
        else
        {
            var max             = Math.max(Math.abs($scope.dynamic.min, Math.abs($scope.dynamic.max)));
            
            if ($scope.static.autoscale)            
            {
                $scope.yScale    = 2*max;
                $scope.y0        = max;            
            }
            else
            {
                $scope.yScale    = 2*$scope.static.top_value;
                $scope.y0        = $scope.static.top_value;            
            }        
        }
    };    
}

var chartComp = 
{
    templateUrl: 'templates/chartComp.html',
    controller: ChartCompCtrl,
//    controllerAs: '$scope',  
    bindings: {
        static: '<',
        dynamic: '<'
    }
};  
    
    
//components_module = angular.module('components_module', [])
main_module.component('chartComp', chartComp)
