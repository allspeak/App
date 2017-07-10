main_module = angular.module('main_module', ['ionic', 'controllers_module', 'ionic.native', 'checklist-model']);

main_module.run(function($ionicPlatform, $ionicPopup, InitAppSrv, $state, $rootScope) 
{
    $ionicPlatform.ready(function() 
    {
//                    $cordovaSplashscreen.show();
        if(window.cordova && window.cordova.plugins.Keyboard) 
        {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard for form inputs)
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

            // Don't remove this line unless you know what you are doing. It stops the viewport from snapping when text inputs are focused. 
            // Ionic handles this internally for a much nicer keyboard experience.
            cordova.plugins.Keyboard.disableScroll(true);

            // useful to inform the registered controllers that the App is active again (e.g. after having managed OS popup, like enabling Bluetooth.)
            document.addEventListener("resume", function() {
                $rootScope.$broadcast("onAppResume", []);
            }, false);                        

            // load init params, other json files, and init services. check if plugin is present
            // TODO: evaluate whether init the service here in order to have a callback with possible errors, instead of loading on the APK onLoad 
            InitAppSrv.init()
            .then(function(success)
            {
                //$cordovaSplashscreen.hide();   
                $state.go('home');
            })
            .catch(function(error)
            {
                $ionicPopup.alert({
                    title: 'Errore',
                    template: "L\'applicazione verra chiusa per il seguente errore:\n" + error.message
                })
                .then(function() {
                    ionic.Platform.exitApp();
                });                
                console.log(error.message);
            });
        }
        else
        {
            alert("cordova and/or cordova.plugins.Keyboard is not present");
            ionic.Platform.exitApp();
        }                        
        if(window.StatusBar) {
            StatusBar.styleDefault();
        }
    });
})
.run(function($ionicPlatform, $ionicHistory, $ionicPopup, $state) 
{
    $ionicPlatform.registerBackButtonAction(function()
    {
        // delete history once in the home and 
        // ask for user confirm after pressing back (thus trying to exit from the App)
        if($state.current.name == "home") 
        {
            $ionicPopup.confirm({ title: 'Attenzione', template: 'are you sure you want to exit?'})
            .then(function(res) {
                if (res) ionic.Platform.exitApp();
            });
        }
        else        $ionicHistory.goBack();
    }, 100);
});
//            .run(function($ionicPlatform) {
//                $ionicPlatform.ready(function() 
//                {
//
//                });
//            });            
            

main_module.config(function($stateProvider, $urlRouterProvider) {
  
    $stateProvider
    .state('init', {
        url: '/',
        templateUrl: 'templates/init.html',
        controller: 'InitCtrl'
    })
    .state('home', {
        url: '/home',
        templateUrl: 'templates/home.html',
        controller: 'HomeCtrl'
    })
    .state('login', {
        url: '/login',
        templateUrl: 'templates/login.html'
    })
    .state('recognition', {
        url: '/recognition',
        templateUrl: 'templates/recognition.html',
        controller: 'RecognitionCtrl'
    })
    .state('amplifier', {
        url: '/amplifier',
        templateUrl: 'templates/amplifier.html',
        controller: 'AmplifierCtrl'
    })
    .state('training', {
        url: '/training',
        templateUrl: 'templates/training.html',
        controller: 'TrainingCtrl',
        resolve:{
                    vocabulary :function(VocabularySrv)
                    {
                        // MyServiceData will also be injectable in your controller, if you don't want this you could create a new promise with the $q service
                        return VocabularySrv.getVocabulary(); 
                    }
                }
    })
    .state('record', {
        url: '/record',
        templateUrl: 'templates/record.html',
        controller: 'RecordCtrl',
        resolve:{
                    vocabulary :function(VocabularySrv)
                    {
                        // MyServiceData will also be injectable in your controller, if you don't want this you could create a new promise with the $q service
                        return VocabularySrv.getVocabulary(); 
                    }
                }
    })
    .state('vocabulary', {
        url: '/vocabulary',
        templateUrl: 'templates/vocabulary.html',
        controller: 'VocabularyCtrl',
        resolve:{
                    'MyServiceData':function(VocabularySrv)
                    {
                        // MyServiceData will also be injectable in your controller, if you don't want this you could create a new promise with the $q service
                        return VocabularySrv.promise; 
                    }
                }
    })
    .state('settings', {
        url: '/settings',
        abstract: 'true',
        templateUrl: 'templates/settings_tabs.html'
    })
    .state('settings.device', {
        url: '/device',
        views: 
        {
            'device-settings' : 
            {
                templateUrl: 'templates/settings_device.html',
                controller: 'DeviceCtrl'
            }
        }
    })
//    .state('settings.setup_input', {
//        url: '/setup_input',
//        views: 
//        {
//        'setupinput-settings' : 
//            {
//                templateUrl: 'templates/settings_setup_audioinput_debug.html',  // templateUrl: 'templates/settings_setup_audioinput_chartcmp.html',
//                controller: 'SetupAudioInputCtrl'                               // controller: 'SetupAudioInputCompCtrl'
//            }
//        }
//    })
    .state('settings.recognition', {
        url: '/recognition_settings',
        views: 
        {
        'recognition-settings' : 
            {
                templateUrl: 'templates/settings_recognition.html',  
                controller: 'SetupRecognitionCtrl'                               
            }
        }
    })
    .state('settings.bluetooth', {
        url: '/bluetooth',
        views: 
        {
        'bluetooth-settings' : 
            {
                templateUrl: 'templates/settings_bluetooth.html',
                controller: 'BluetoothCtrl'
            }
        }
    })
    .state('settings.server_connection', {
        url: '/server_connection',
        views: 
        {
        'server-settings' : 
            {
                templateUrl: 'templates/settings_connection.html',
                controller: 'ServerConnectionCtrl'
            }
        }
    });
  
  $urlRouterProvider.otherwise("/");
  
});


//    .state('sentence_train', {
//        url: '/train/:sentenceId',
//        templateUrl: 'templates/sentence_train.html',
//        controller: 'SentenceTrainCtrl'
//    })      
//    .state('sentence_record', {
//        url: '/record/:sentenceId',
//        templateUrl: 'templates/sentence_rec.html',
//        controller: 'SentenceRecordCtrl'
//    }) 