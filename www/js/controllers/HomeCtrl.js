/* 
 * get both App and Runtime status
 * 
 * if NOT exist a selected vocabulary => send to 
 * if the selected vocabulary is completed => allows recognition
 * else
 *      if a select
 *
 */
 
function HomeCtrl($scope, $ionicPlatform, $ionicPopup, $ionicHistory, $state, InitAppSrv, RuntimeStatusSrv, EnumsSrv, UITextsSrv, RemoteAPISrv)
{
    $scope.$on('$ionicView.enter', function(event, data)
    {
        // delete history once in the home
        $ionicHistory.clearHistory();
        // ask user's confirm after pressing back (thus trying to exit from the App)
        $scope.deregisterFunc   = $ionicPlatform.registerBackButtonAction(function()
        {
            $scope.exit();
        }, 100); 
        $scope.enum_show_allvb  = EnumsSrv.VOICEBANK.SHOW_ALL;
        $scope.appStatus        = InitAppSrv.getStatus();

        return RuntimeStatusSrv.loadVocabulary($scope.appStatus.userActiveVocabularyName)
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
            var msg = "Error in HomeCtrl::$ionicView.enter";
            if(error.message)
                msg = msg + " " + error.message;
                
            console.log(msg);
            alert(msg);
        });
    });
    
    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });
    // ===============================================================================================
    // EXIT APP
    // ===============================================================================================
    $scope.exit = function()
    {
        $ionicPopup.confirm({ title: UITextsSrv.labelAlertTitle, template: UITextsSrv.labelExit})
        .then(function(res) 
        {
            if (res){  ionic.Platform.exitApp();  }
        });
    };
    
    // ===============================================================================================
    // BUTTONS
    // ===============================================================================================    
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
                $state.go('voicebank', {elems2display:EnumsSrv.VOICEBANK.SHOW_TRAINED, backState:"home"});
                break;

            case EnumsSrv.STATUS.CAN_RECOGNIZE:
                $state.go('recognition', {foldername:$scope.appStatus.userActiveVocabularyName});
                break;
        };
    }
};
controllers_module.controller('HomeCtrl', HomeCtrl);