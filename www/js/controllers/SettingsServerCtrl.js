/* 
 * if is not assisted : icon/button "register device"
 * if is assisted     : displays the following:
 *                         - info
 *                         - restore / upload data 
    
 */

function SettingsServerCtrl($scope, $state, $ionicPlatform, $ionicModal, InitAppSrv, RemoteAPISrv, EnumsSrv, UITextsSrv)
{
    $scope.isAssisted           = false;
    $scope.isRegistered         = false;
    $scope.appStatus            = null;
    
    $scope.want2beRegisteredText= UITextsSrv.REMOTE.labelWant2Connect;    
    $scope.unassistedText       = UITextsSrv.REMOTE.labelConnect;        
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        // take control of BACK buttons
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("home");
        }, 100);  
        $scope.refresh();
    });
    
    $scope.refresh = function()
    {
        $scope.appStatus    = InitAppSrv.getStatus();
        $scope.isAssisted   = ($scope.appStatus.appModality == EnumsSrv.MODALITY.ASSISTED ? true : false);
        $scope.isRegistered = $scope.appStatus.isDeviceRegistered;
        
        if($scope.isRegistered)
        {
            
        }
        $scope.$apply();
    }; 
    
    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });    

    //-----------------------------------------------------------------------------------------
    // $scope.isRegistered = false
    //-----------------------------------------------------------------------------------------
    // modal Want2beRegistered ?
    $ionicModal.fromTemplateUrl('templates/modal/want2beRegistered.html', {
        scope: $scope,
        animation: 'slide-in-up',
        backdropClickToClose: false,
        hardwareBackButtonClose: false        
    }).then(function(modal) {
        $scope.modalWant2beRegistered = modal;
    });      
    
    $scope.registerDevice = function()
    {
        $scope.modalWant2beRegistered.show();
    };    
    
    $scope.OnWant2beRegistered = function(doregister)
    {
        if(doregister) return RemoteAPISrv.registerDevice()       // if successfull it calls: InitAppSrv.setStatus({"isDeviceRegistered":true})
        .then(function()
        {
            $scope.refresh();
        })
        .catch(function(error)
        {
            alert("Error in SettingsServer : " + error.toString());
            $scope.refresh();        
        });
    };
    //-----------------------------------------------------------------------------------------
};
controllers_module.controller('SettingsServerCtrl', SettingsServerCtrl);   
  