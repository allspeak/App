/* 
 * Pre-home controller that verify which steps are needed to be ready to recognize
 * follows AppInitSrv tasks, goes on initializing the App while interacting with the user
 *  
 * it manages:
 *  - AppStatus.isFirstUse
 *  - AppStatus.appModality
 *  - isDeviceRegistered
 *  - api_key
 *  
 * Then, it calculates the vocabulary status
 * 
 * TV selected      => record TS
 * TS recorded      => send to training
 * TF model loaded  => record voices or use first version of TS
 * TVA              => CAN RECOGNIZE
 * 
 * finally, before sending to home, load the active vocabulary (if exists)
 */
 
function InitCheckCtrl($scope, $q, $state, $ionicPlatform, $ionicModal, $ionicPopup, $cordovaSplashscreen, InitAppSrv, RuntimeStatusSrv, RemoteAPISrv, EnumsSrv, UITextsSrv)
{
    $scope.want2beAssistedText              = "";
    $scope.want2beAssistedText2             = "";
    $scope.want2beRegisteredText            = "";
    $scope.registerNewDeviceText            = "";
    $scope.confirmRegisterDeviceText        = "";
    $scope.askConfirmSkipRegistrationText   = "";
    $scope.criticalErrorText                = "";
    $scope.confirmExitText                  = "";
    
    $scope.appStatus                        = null;
    $scope.api_key                          = "";
    $scope.modeljson                        = "";
    
    //-----------------------------------------------------------------------------------------
    $scope.$on('$ionicView.enter', function()
    {
        $scope.modalities       = EnumsSrv.MODALITY;
        $scope.deregisterFunc   = $ionicPlatform.registerBackButtonAction(function(){ var a=1; }, 100);         
        
        $scope.want2beAssistedText              = UITextsSrv.SETUP.want2beAssistedText;
        $scope.want2beAssistedText2             = UITextsSrv.SETUP.want2beAssistedText2;
        $scope.want2beRegisteredText            = UITextsSrv.SETUP.want2beRegisteredText;
        $scope.registerNewDeviceText            = UITextsSrv.SETUP.registerNewDeviceText;
        $scope.confirmRegisterDeviceText        = UITextsSrv.SETUP.confirmRegisterDeviceText; 
        $scope.askConfirmSkipRegistrationText   = UITextsSrv.SETUP.askConfirmSkipRegistrationText; 
        $scope.criticalErrorText                = UITextsSrv.SETUP.criticalErrorText; 
        $scope.confirmExitText                  = UITextsSrv.SETUP.confirmExitText; 
        $scope.specifyGenderText                = UITextsSrv.SETUP.specifyGenderText; 
        
        // setup modal Want2beAssisted
        return $ionicModal.fromTemplateUrl('templates/modal/want2beAssisted.html', {
                                            scope: $scope,
                                            animation: 'slide-in-up',
                                            backdropClickToClose: false,
                                            hardwareBackButtonClose: false
        })
        .then(function(modal) 
        {
            $scope.modalWant2beAssisted = modal;
            // setup modal insert api key
            return $ionicModal.fromTemplateUrl('templates/modal/modalInsertApiKey.html', {
                                            scope: $scope,
                                            animation: 'slide-in-up',
                                            backdropClickToClose: false,
                                            hardwareBackButtonClose: false})
        })
        .then(function(modal) 
        {
            $scope.modalInsertApiKey = modal;
            // setup modal insert api key
//            return $ionicModal.fromTemplateUrl('templates/modal/specifyGender.html', {
//                                            scope: $scope,
//                                            animation: 'slide-in-up',
//                                            backdropClickToClose: false,
//                                            hardwareBackButtonClose: false})
//        })
//        .then(function(modal) 
//        {
//            $scope.modalSpecifyGender = modal;
            if(RemoteAPISrv.hasInternet())
                RemoteAPISrv.checkAppUpdate($scope.startApp, null);
            else
            {
                $ionicPopup.alert({title: UITextsSrv.labelAlertTitle, template: UITextsSrv.SETUP.noConnectionText});
                $scope.endCheck('home'); 
            }
        });  
    });
    
    $scope.$on('$ionicView.leave', function(){if($scope.deregisterFunc)   $scope.deregisterFunc();});    
   
    // callback from RemoteAPISrv.checkAppUpdate (after update-finish or no-update)
    $scope.startApp = function(isServerOn) 
    {    
        $scope.appStatus    = InitAppSrv.getStatus();
        $scope.modeljson    = "";
        RuntimeStatusSrv.setStatus({"isLogged": false, "isServerOn": isServerOn});
        
        if(isServerOn)
        {
            if($scope.appStatus.isFirstUse)
            {
                $cordovaSplashscreen.hide();
                $scope.modalWant2beAssisted.show();
            }
            else $scope.checkIsAssisted($scope.appStatus.appModality);        
        }
        else
        {
            $ionicPopup.alert({title: UITextsSrv.labelAlertTitle,template: UITextsSrv.REMOTE.labelServerDown});
            $scope.endCheck('home'); 
        }
    };
   
    $scope.exit = function()
    {
        $ionicPopup.confirm({ title: UITextsSrv.labelAlertTitle, template: $scope.confirmExitText})
        .then(function(res) 
        {
            if (res){ionic.Platform.exitApp();}
        });  
    };
    
    // callback from modalWant2beAssisted 
    $scope.OnWant2beAssisted = function(modality) 
    {
        $scope.modalWant2beAssisted.hide();
        return $scope.checkIsAssisted(modality);
    };    

    // called by:
    //          - $ionicView.enter && !firstuse
    //          - OnWant2beAssisted
    // it does:
    //          - solo      => LD & goto home
    //          - guest     => LAV & goto home
    //          - assisted  => check register and if ok => get tasks => LAV & goto home
    //
//    $scope.checkIsAssisted = function() 
    $scope.checkIsAssisted = function(modality) 
    {
//        switch($scope.appStatus.appModality)
        switch(modality)
        {
            case EnumsSrv.MODALITY.ASSISTED:
                if($scope.appStatus.isDeviceRegistered)
                {
                    $scope.api_key = RemoteAPISrv.getApiKey();
                    if($scope.api_key == null || !$scope.api_key.length) 
                    {
                        alert($scope.criticalErrorText);
                        return $scope.endCheck('home');
                    }
                    return $scope.onApiKey({"label":$scope.api_key});
                }
                else
                {
                    // assisted & NOT registered
                    $cordovaSplashscreen.hide();           
                    
                    var myNullAction = $ionicPlatform.registerBackButtonAction(function(){ var a=1;}, 401);                    
                    
                    return $ionicPopup.confirm({ title: UITextsSrv.labelAlertTitle, template: $scope.confirmRegisterDeviceText})
                    .then(function(res) 
                    {
                        myNullAction();                        
                        if(res == false)        return $scope.endCheck('home');
                        else if(res == true)    return $scope.modalInsertApiKey.show();

                    });        
                }                 
                break;
                
            case EnumsSrv.MODALITY.SOLO:
            case EnumsSrv.MODALITY.GUEST:
                return $scope.endCheck('home');
                break;
        }
    };
        
    // callback from modalInsertApiKey or, whether already registered, called from checkIsAssisted
    // if connection absent => LV or LD => go home
    // if login ok          => getTaskList()
    $scope.onApiKey = function(apikey)
    {
        if(apikey == null) // user pressed cancel in modalInsertApiKey
        {
            var myNullAction = $ionicPlatform.registerBackButtonAction(function(){ var a=1;}, 401);
            return $ionicPopup.confirm({title: UITextsSrv.labelAlertTitle,
                                        template: $scope.askConfirmSkipRegistrationText,
                                        cancelText: 'RIPROVA',
                                        okText: 'PROSEGUI senza registrare'})
            .then(function(res) 
            {
                myNullAction();
                if(res)    // user wants to skip registration
                {
                    $scope.modalInsertApiKey.hide();
                    return $scope.endCheck('home');
                }
            });              
        }  
        else
        {
            $scope.api_key = apikey.label;    
            return RemoteAPISrv.registerDevice($scope.api_key)       // if successfull it calls: InitAppSrv.setStatus({"isDeviceRegistered":true, "api_key":api_key})
            .then(function(response)
            {
                $scope.appStatus.isDeviceRegistered = response.result;
                if(response.result)    // CODICE VALIDO
                {
                    // now I can set firstuse=false and app modality
                    return InitAppSrv.setStatus({"isFirstUse":false, "appModality":EnumsSrv.MODALITY.ASSISTED})
                    .then(function()
                    {
                        $scope.appStatus.isFirstUse     = false;
                        $scope.appStatus.appModality    = EnumsSrv.MODALITY.ASSISTED;                     

                        RuntimeStatusSrv.setStatus("isLogged", true);
                        $scope.modalInsertApiKey.hide();
                        return $scope.getTaskList();      // device is registered, get task list
                    })
                    .catch(function(error)
                    {
                        $scope.appStatus.isFirstUse     = true;
                        $scope.appStatus.appModality    = 0;
                        alert(error.toString()); 
                    });                    
                }   
                else                   // ERRORE
                {
                    $cordovaSplashscreen.hide();
                    var myNullAction = $ionicPlatform.registerBackButtonAction(function(){ var a=1;}, 401);
                    switch(response.status)
                    {
                        case 401:
                            return $ionicPopup.confirm({title: UITextsSrv.labelAlertTitle, template: response.message})
                            .then(function(res) 
                            {
                                myNullAction();
                                if(!res)    // user pressed cancel, aborted to login in
                                {
                                    $scope.modalInsertApiKey.hide();
                                    return $scope.endCheck('home');
                                }
                                else
                                    $scope.modalInsertApiKey.show();
                            });                    
                            break;
                            
                        default:
                            // here goes the timeout error. in this case go home but load the active vocabulary, if exists
                            return $ionicPopup.alert({ title: UITextsSrv.labelAlertTitle, template: response.message})
                            .then(function()
                            {
                                myNullAction();
                                $scope.modalInsertApiKey.hide();
                                return $scope.endCheck('home');   
                            });                    
                            break
                    }
                }
            })
            .catch(function(error)
            {
                alert("ERRORE CRITICO in InitCheckCtrl::checkIsAssisted " + error.toString());
                RuntimeStatusSrv.setStatus("isLogged", false);
                return $scope.endCheck('home');
            });
        }
    };    
    
    // successfull onApiKey
    // getActivities => LV or LD => go home
    $scope.getTaskList = function()
    {
        return RemoteAPISrv.getActivities()         // if successfull it calls: RuntimeStatusSrv.setStatus({"isLogged":true})
        .then(function(tasklist)
        {
            // user is logged in I receive a task list (download, execute something)
            // I can do it or ignore them. in the latter, I have to tell whether repeat the question next time or not. TODO
            return $scope.endCheck('home');   
        })
        .catch(function(error)
        {
            alert("ERRORE CRITICO in InitCheckCtrl::doLogin " + error.toString());
            error.message = "ERRORE CRITICO in InitCheckCtrl::doLogin " + error.message;
            return $q.reject(error);
        });     
    };    
    
    //-----------------------------------------------------------------------
    // LOAD ACTIVE VOC & MOVE TO DEST STATE
    //-----------------------------------------------------------------------
    $scope.endCheck = function(unusedpath) 
    {
//        if($scope.appStatus.isMale == "")
//            $scope.modalSpecifyGender.show();
//        else
//        {
            $cordovaSplashscreen.hide();
            $state.go("home");            
//        }
    };
    //-----------------------------------------------------------------------
    // unused
    $scope.isMale = function(bool)
    {
        return InitAppSrv.setStatus({"isMale":bool})
        .then(function()
        {       
            $scope.modalSpecifyGender.hide();
            $cordovaSplashscreen.hide();
            $state.go("home");
        });
    };    
    //-----------------------------------------------------------------------
};
controllers_module.controller('InitCheckCtrl', InitCheckCtrl);