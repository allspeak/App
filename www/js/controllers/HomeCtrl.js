/* 
 * get both App and Runtime status
 * 
 * if NOT exist a selected vocabulary => send to 
 * if the selected vocabulary is completed => allows recognition
 * else
 *      if a select
 *
 */
 
function HomeCtrl($scope, $ionicPlatform, $ionicPopup, $ionicModal, $ionicHistory, $state, InitAppSrv, RuntimeStatusSrv, VocabularySrv, EnumsSrv, UITextsSrv) //, VocabularySrv, TfSrv)
{
    $scope.modelLoaded = false;
    
    $scope.$on('$ionicView.enter', function(event, data)
    {
        // delete history once in the home
        $ionicHistory.clearHistory();
        // ask user's confirm after pressing back (thus trying to exit from the App)
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $ionicPopup.confirm({ title: 'Attenzione', template: 'are you sure you want to exit?'})
            .then(function(res) { if (res) ionic.Platform.exitApp(); });
        }, 100); 
        
        // isUpdated=true only when the present (home) state follows the InitCheck one
        // I update the runtimestate in InitCheck, remove the Splash and go here, where I simply get the status without recalculating it.
        // in all other occasion, I recalculate it.
        var do_update = true;
        if(data.stateParams != null)
            if(data.stateParams.isUpdated != null)
                if(data.stateParams.isUpdated == 'true')  do_update = false;    
        
        $scope.appStatus    = InitAppSrv.getStatus();

        return $scope.updateRuntimeStatus($scope.appStatus.userActiveVocabularyName, do_update)
        .then(function(rtstatus)
        {
            $scope.runtimeStatus = rtstatus;
            switch($scope.runtimeStatus.AppStatus)
            {
                case EnumsSrv.STATUS.NEW_TV:
                    $scope.labelActionButton = UITextsSrv.TRAINING.labelSelectSentences;
                    $scope.newTV = {};
                    break;

                case EnumsSrv.STATUS.RECORD_TV:
                case EnumsSrv.STATUS.TRAIN_TV:
                    $scope.labelActionButton = UITextsSrv.TRAINING.labelOpenVocabulary;
                    break;

//
//                    $scope.labelActionButton = UITextsSrv.TRAINING.labelTrainVocabulary;
//                    break;

                case EnumsSrv.STATUS.RECORD_TVA:
                    $scope.labelActionButton = UITextsSrv.TRAINING.labelRecordVoice;
                    break;

                case EnumsSrv.STATUS.CAN_RECOGNIZE:
                    $scope.labelActionButton = UITextsSrv.TRAINING.labelRecognize;
                    break;
            };
            $scope.labelActionButton = $scope.labelActionButton.toLowerCase();
            $scope.$apply();            
        })
        .catch(function(error)
        {
            console.log("Error in HomeCtrl::$ionicView.enter ");
            alert("Error in HomeCtrl::$ionicView.enter "+ error.toString());
        });
    });
    
    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });
    // ---------------------------------------------------------------------------------------------------------
    
    $scope.updateRuntimeStatus = function(localFolder, do_update)
    {
        if(do_update)  return RuntimeStatusSrv.getUpdatedStatusName(localFolder);
        else           return Promise.resolve(RuntimeStatusSrv.getStatus());        
    };
    
    $scope.exit = function()
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'are you sure you want to exit?'})
        .then(function(res) 
        {
            if (res){  ionic.Platform.exitApp();  }
        });
    };
    
    $scope.action = function()
    {
        switch($scope.runtimeStatus.AppStatus)
        {
            case EnumsSrv.STATUS.NEW_TV:
                $state.go('manage_commands', {modeId:EnumsSrv.TRAINING.NEW_TV});
                break;

            case EnumsSrv.STATUS.RECORD_TV:
            case EnumsSrv.STATUS.TRAIN_TV:
                $state.go('vocabulary', {foldername:$scope.appStatus.userActiveVocabularyName, backState:"home"});
                break;
                
//                $state.go('manage_recordings', {foldername:$scope.appStatus.userActiveVocabularyName, backState:"vocabulary"});
//                break;
//                $state.go('manage_training', {foldername:$scope.appStatus.userActiveVocabularyName, backState:"vocabulary"});
//                break;

            case EnumsSrv.STATUS.RECORD_TVA:
                $state.go('voicebank', {elems2display:EnumsSrv.VOICEBANK.SHOW_ALL, backState:"home"});
                break;

            case EnumsSrv.STATUS.CAN_RECOGNIZE:
                $state.go('recognition');
                break;
        };
    }
};
controllers_module.controller('HomeCtrl', HomeCtrl);