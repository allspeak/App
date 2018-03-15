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
 
function InitCheckCtrl($scope, $q, $state, $ionicPlatform, $ionicModal, $ionicPopup, $cordovaSplashscreen, InitAppSrv, RuntimeStatusSrv, RemoteAPISrv, EnumsSrv)
{
    $scope.want2beAssistedText      = "PUOI UTILIZZARE ALLSPEAK CON LE SEGUENTI MODALITA:";
    $scope.want2beRegisteredText    = "Inserisci il codice che ti è stato fornito dal tuo medico";
    $scope.createNewVocabularyText    = "Registra questo dispositivo";
    $scope.appStatus            = null;
    $scope.api_key              = "";
    $scope.modeljson            = "";
    
    //-----------------------------------------------------------------------------------------
    // MODALS
    //-----------------------------------------------------------------------------------------
    // modal Want2beAssisted ?
    $ionicModal.fromTemplateUrl('templates/modal/want2beAssisted.html', {
        scope: $scope,
        animation: 'slide-in-up',
        backdropClickToClose: false,
        hardwareBackButtonClose: false        
    }).then(function(modal) {
        $scope.modalWant2beAssisted = modal;
    });  

    // insert Api Key
    $ionicModal.fromTemplateUrl('templates/modal/modalInsertApiKey.html', {
        scope: $scope,
        animation: 'slide-in-up',
        backdropClickToClose: false,
        hardwareBackButtonClose: false        
    }).then(function(modal) {
        $scope.modalInsertApiKey = modal;
    });  
    //-----------------------------------------------------------------------------------------
    $scope.$on('$ionicView.enter', function()
    {
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function(){ var a=1; }, 100);         
        
        $scope.appStatus = RuntimeStatusSrv.getStatus();
        if($scope.appStatus.isConnected)
            RemoteAPISrv.checkAppUpdate($scope.startApp, null);
//            RemoteAPISrv.checkAppUpdate($scope.startApp, $scope.OnUpdateAppError);
        else
            $scope.startApp(false);
    });
    
    $scope.$on('$ionicView.leave', function(){if($scope.deregisterFunc)   $scope.deregisterFunc();});    
   
    // in case of error during update check...start the current App
    // The timeout error is managed within RemoteAPISrv with a proper timer, which is expected to trigger much later than this callback error. 
    // thus this error should be related to a response from the server. which should be ON.
//    $scope.OnUpdateAppError = function(error) 
//    {
//        $scope.startApp(true);  
//    };
//    
    // callback from RemoteAPISrv.checkAppUpdate
    // callback after update finish/ no update
    // if trylogin = false the server should be considered down
    $scope.startApp = function(isServerOn) 
    {    
        $scope.appStatus    = InitAppSrv.getStatus();
        $scope.modalities   = EnumsSrv.MODALITY;
        $scope.modeljson    = "";
        RuntimeStatusSrv.setStatus({"isLogged": false, "isServerOn": isServerOn});
        
        if(isServerOn)
        {
            if($scope.appStatus.isFirstUse)
            {
                $cordovaSplashscreen.hide();
                $scope.modalWant2beAssisted.show();
            }
            else $scope.checkIsAssisted();        
        }
        else
        {
            alert("Il server sembra attualmente non funzionante, puoi continuare ad usare l\'App senza pero accedere alle funzioni speciali")
            $scope.endCheck('home'); 
        }
    }
   
    $scope.exit = function()
    {
        $ionicPopup.confirm({ title: 'Attenzione', template: 'are you sure you want to exit?'})
        .then(function(res) 
        {
            if (res){  ionic.Platform.exitApp();  }
        });  
    };
    
    // callback from modalWant2beAssisted 
    $scope.OnWant2beAssisted = function(int) 
    {
        $scope.modalWant2beAssisted.hide();

        return InitAppSrv.setStatus({"isFirstUse":false, "appModality":int})
        .then(function()
        {
            $scope.appStatus.isFirstUse     = false;
            $scope.appStatus.appModality    = int;            
            return $scope.checkIsAssisted();
        })
        .catch(function(error)
        {
            $scope.appStatus.isFirstUse     = true;
            $scope.appStatus.appModality    = 0;
            alert(error.toString()); 
        });
    };    

    // called by:
    //          - $ionicView.enter && !firstuse
    //          - OnWant2beAssisted
    // it does:
    //          - solo      => LD & goto home
    //          - guest     => LAV & goto home
    //          - assisted  => check register and if ok => get tasks => LAV & goto home
    //
    $scope.checkIsAssisted = function() 
    {
        switch($scope.appStatus.appModality)
        {
            case EnumsSrv.MODALITY.ASSISTED:
                if($scope.appStatus.isDeviceRegistered)
                {
                    $scope.api_key = RemoteAPISrv.getApiKey();
                    if($scope.api_key == null || !$scope.api_key.length) 
                    {
                        alert("Errore critico ! Contatta il responsabile del App");
                        return $scope.endCheck('home');
                    }
                    return $scope.onApiKey({"label":$scope.api_key});
                }
                else
                {
                    // assisted & NOT registered
                    $cordovaSplashscreen.hide();            
                    return $ionicPopup.confirm({ title: 'Attenzione', template: 'Vuoi registrare ora il telefono sul server?\nIn caso contrario, potrai farlo in seguito\nCosi puoi utilizzare solo le funzioni base'})
                    .then(function(res) 
                    {
                        if(!res)    return $scope.endCheck('home');
                        else        return $scope.modalInsertApiKey.show();
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
            return $ionicPopup.confirm({ title: 'Attenzione', template: "Premendo Cancel non si potrà accedere alle funzioni avanzate di AllSpeak, sicuro di voler saltare la registrazione?"})
            .then(function(res) 
            {
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
                    RuntimeStatusSrv.setStatus("isLogged", true);
                    $scope.modalInsertApiKey.hide();
                    return $scope.getTaskList();      // device is registered, get task list
                }   
                else                   // ERRORE
                {
                    $cordovaSplashscreen.hide();
                    switch(response.status)
                    {
                        case 401:
                            return $ionicPopup.confirm({ title: 'Attenzione', template: response.message})
                            .then(function(res) 
                            {
                                if(!res)    // user pressed cancel, aborted to login in
                                {
                                    $scope.modalInsertApiKey.hide();
                                    return $scope.endCheck('home');
                                }
                            });                    
                            break;
                            
                        default:
                            // here goes the timeout error. in this case go home but load the active vocabulary, if exists
                            return $ionicPopup.alert({ title: 'Attenzione', template: response.message})
                            .then(function()
                            {
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
    $scope.endCheck = function(nextstate) 
    {
        $cordovaSplashscreen.hide();
        $state.go(nextstate);
    };
    //-----------------------------------------------------------------------
};
controllers_module.controller('InitCheckCtrl', InitCheckCtrl);

