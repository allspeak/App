/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//function TrainingCtrl($scope, vocabulary)//....use resolve 
//function TrainingCtrl($scope)  
function TrainingCtrl($scope, $state)  
{
    
    //-------------------------------------------------------------------
    $scope.goToShow_sessions = function()
    {
        $state.go("vocabulary.show_sessions", {modeId:1});
    }
    //-------------------------------------------------------------------
}
controllers_module.controller('TrainingTabCtrl', TrainingTabCtrl)
