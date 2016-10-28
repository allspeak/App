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
    var vm = this;
    
    vm.static = {};
    vm.dynamic = {};
    //default exogenous static values    
    vm.static.width         = 100;
    vm.static.height        = 100;
    vm.static.yAxis         = "Power";
    vm.static.xAxis         = "Frequencies";
    vm.static.autoscale     = 1;      // scale data according to : 0) a predefined global maximum, 1) current maximum         
    vm.static.all_pos       = 0;    
    vm.static.max_volume    = 500;
    
    // with autoscale 0...u have to define
    vm.static.top_value     = 100;

    // exogenous
    vm.dynamic.mean         = 0;    
    vm.dynamic.max          = -Infinity;
    vm.dynamic.min          = Infinity;
    vm.dynamic.data         = [];

    // endogenous, calculated online
    vm.yScale               = 0;    
    vm.y0                   = 0;  
    
    $scope.watch('dynamic', function (newvalue, oldvalue, scope){
        vm.scaleData();
    });
    // top indicates if set a global maximum, top_value represents that value
    vm.scaleData = function()
    {
//        var allpos = (vm.min_data >= 0 ? 1 : 0);
        if (vm.static.allpos)
        {
            if (vm.static.autoscale)
                vm.yScale    = vm.dynamic.max;
            else
                vm.yScale    = vm.static.top_value;
            
            vm.y0        = 0;
        }
        else
        {
            var max             = Math.max(Math.abs(vm.dynamic.min, Math.abs(vm.dynamic.max)));
            
            if (vm.static.autoscale)            
            {
                vm.yScale    = 2*max;
                vm.y0        = max;            
            }
            else
            {
                vm.yScale    = 2*vm.static.top_value;
                vm.y0        = vm.static.top_value;            
            }        
        }
    };    
}

var chartComp = 
{
    templateUrl: 'templates/chartComp.html',
    controller: ChartCompCtrl,
    controllerAs: 'vm',  
    bindings: {
        static: '<',
        dynamic: '<'
    }
};  
    
    
//components_module = angular.module('components_module', [])
main_module.component('chartComp', chartComp)
