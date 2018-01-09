/* 
 * Pre-home controller that verify which steps are needed to be ready to recognize
 * follows AppInitSrv tasks, goes on initializing the App while interacting with the user
 *  
 * it manages:
 *  - AppStatus.isFirstUse
 *  - AppStatus.appModality
 *  - remote.isDeviceRegistered
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
    $scope.want2beAssistedText      = "puoi utilizzare AllSpeak con le seguenti modalità: SOLO - GUEST - ASSISTITA";
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
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function() 
        {
            var a=1;
        }, 100);         
        
        $scope.appStatus    = InitAppSrv.getStatus();
        $scope.modalities   = EnumsSrv.MODALITY;
        $scope.modeljson    = "";
        RuntimeStatusSrv.setStatus("isLogged", false);
        
        if($scope.appStatus.isFirstUse)
        {
            $cordovaSplashscreen.hide();
            $scope.modalWant2beAssisted.show();
        }
        else $scope.checkIsAssisted();
    });
    
    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });    
   
    // callback from modalWant2beAssisted 
    $scope.OnWant2beAssisted = function(int) 
    {
        $scope.modalWant2beAssisted.hide();

        return InitAppSrv.setStatus({"isFirstUse":false, "appModality":int})
        .then(function(res)
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
    //          - if not assisted  => goto home
    //          - if assisted      => check register and if ok => get tasks
    //
    $scope.checkIsAssisted = function() 
    {
        if($scope.appStatus.appModality != EnumsSrv.MODALITY.ASSISTED)
        {
             // if SOLO or GUEST
            return RuntimeStatusSrv.loadDefault() 
            .then(function(res) 
            {            
                $scope.endCheck('home');
                return true;
            })
        }   
        else
        {
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
                $cordovaSplashscreen.hide();            
                return $ionicPopup.confirm({ title: 'Attenzione', template: 'Vuoi registrare ora il telefono sul server?\nIn caso contrario, potrai farlo in seguito\nCosi puoi utilizzare solo le funzioni base'})
                .then(function(res) 
                {
                    if(!res)    return $scope.endCheck('home');
                    else        return $scope.modalInsertApiKey.show();
                });        
            }            
        }
    };
        
    // callback from modalInsertApiKey or, whether already registered, called from checkIsAssisted
    $scope.onApiKey = function(apikey)
    {
        if(apikey == null) // l'utente ha premuto cancella
        {
            $scope.endCheck('home');
            $scope.modalInsertApiKey.hide();
            return;
        }  
        else
        {
            $scope.api_key = apikey.label;    
            return RemoteAPISrv.registerDevice($scope.api_key)       // if successfull it calls: InitAppSrv.setStatus({"isDeviceRegistered":true, "api_key":api_key})
            .then(function(response)
            {
                $scope.appStatus.isDeviceRegistered = response.result;
                if(!response.result)    // ERRORE
                {
                    $cordovaSplashscreen.hide();
                    switch(response.status)
                    {
                        case 401:
                            return $ionicPopup.confirm({ title: 'Attenzione', template: response.message})
                            .then(function(res) 
                            {
                                if(!res)
                                {
                                    $scope.modalInsertApiKey.hide();
                                    $scope.endCheck('home');
                                }
                            });                    
                            break;
                            
                        default:
                            // here goes the timeout error. in this case go home but load the active vocabulary, if exists
                            return $ionicPopup.alert({ title: 'Attenzione', template: response.message})
                            .then(function(res) 
                            {
                                if($scope.appStatus.userActiveVocabularyName != "") return RuntimeStatusSrv.loadVocabulary($scope.appStatus.userActiveVocabularyName);                            
                                else                                                return true;
                            })
                            .then(function()
                            {
                                $scope.modalInsertApiKey.hide();
                                $scope.endCheck('home');   
                            });                    
                            break
                    }
                }   
                else                    // CODICE VALIDO
                {
                    RuntimeStatusSrv.setStatus("isLogged", true);
                    $scope.modalInsertApiKey.hide();
                    return $scope.getTaskList();      // device is registered, get task list
                }
            })
            .catch(function(error)
            {
                alert("ERRORE CRITICO in InitCheckCtrl::checkIsAssisted " + error.toString());
                RuntimeStatusSrv.setStatus("isLogged", false);
                $scope.endCheck('home');
                error.message = "ERRORE CRITICO in InitCheckCtrl::checkIsAssisted " + error.message;
                return $q.reject(error);
            });
        }
    };    
    
    // successfull onApiKey
    $scope.getTaskList = function()
    {
        return RemoteAPISrv.getActivities()         // if successfull it calls: RuntimeStatusSrv.setStatus({"isLogged":true})
        .then(function(tasklist)
        {
            // user is logged in I receive a task list (download, execute something)
            // I can do it or ignore them. in the latter, I have to tell whether repeat the question next time or not. TODO
            if($scope.appStatus.userActiveVocabularyName != "") return RuntimeStatusSrv.loadVocabulary($scope.appStatus.userActiveVocabularyName);                            
            else                                                return true;
        })
        .then(function()
        {
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
    // MOVE TO DEST STATE
    $scope.endCheck = function(nextstate) 
    {
        $cordovaSplashscreen.hide();
        if(nextstate == "home")     $state.go(nextstate, {"isUpdated":true});       // add isupdated params to tell home to not recalculate everything
        else                        $state.go(nextstate);
    };
    //-----------------------------------------------------------------------
};
controllers_module.controller('InitCheckCtrl', InitCheckCtrl);

