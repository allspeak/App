main_module = angular.module('main_module', ['ionic', 'controllers_module', 'ionic.native']);

main_module.run(function($ionicPlatform, $ionicPopup, InitAppSrv, $state, $rootScope) //, $cordovaSplashscreen) 
{
    $ionicPlatform.ready(function() 
    {
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
            InitAppSrv.initApp()
            .then(function(success)
            {
//                $cordovaSplashscreen.hide();   
                $state.go('initCheck');
            })
            .catch(function(error)
            {
                var str;
                if(error.message)  str = error.message;
                else               str = error;
                $ionicPopup.alert({ title: 'Errore', template: "L\'applicazione verra chiusa per il seguente errore:\n" + str })
                .then(function() {
                    console.log(error.message);
                    //ionic.Platform.exitApp(); // to uncomment in production
                });                
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
});

main_module.config(function($stateProvider, $urlRouterProvider) 
{
    $stateProvider
    .state('init', {
        url: '/'
    })
    .state('initCheck', {
        url: '/check',
        templateUrl: 'templates/init.html',
        controller: 'InitCheckCtrl'
    })
    .state('home', {
        url: '/home/:isUpdated',
        templateUrl: 'templates/home.html',
        controller: 'HomeCtrl'
    })
    .state('amplifier', {
        url: '/amplifier',
        templateUrl: 'templates/amplifier.html',
        controller: 'AmplifierCtrl'
    })    
    .state('recognition', {
        url: '/recognition',
        templateUrl: 'templates/recognition.html',
        controller: 'RecognitionCtrl'
    })
    .state('voicebank', {
        url: '/voicebank/:elems2display/:foldername/:backState',
        templateUrl: 'templates/voicebank.html',
        controller: 'VoiceBankCtrl'
    })
    .state('vocabularies', {
        url: '/vocabularies',
        templateUrl: 'templates/vocabularies.html',
        controller: 'VocabulariesCtrl'
    })
    .state('vocabulary', {
        url: '/vocabulary/:foldername',
        templateUrl: 'templates/vocabulary.html',
        controller: 'VocabularyCtrl'
    })
    .state('managevoccommands', {
        url: '/managevoccommands/:modeId/:foldername/:backState',
        templateUrl: 'templates/managevoccommands.html',
        controller: 'ManageVocCommandsCtrl'
    })
    .state('show_recording_session', {
        url: '/show_recording_session/:foldername/:backState/:sessionPath/:subjId',
        templateUrl: 'templates/show_recording_session.html',
        controller: 'ShowRecordingSessionCtrl'
    }) 
    .state('sentence', {
        url: '/sentence/:foldername/:sessionPath/:commandId/:subjId',
        templateUrl: 'templates/sentence.html',
        controller: 'SessionSentenceCtrl'
    })    
    .state('record_sequence', {
        url: '/record/:modeId/:commandId/:subjId/:successState/:cancelState/:foldername',
        templateUrl: 'templates/record_sequence.html',
        controller: 'SequenceRecordCtrl'
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
                controller: 'SettingsDeviceCtrl'
            }
        }
    })
    .state('settings.recognition', {
        url: '/recognition_settings',
        views: 
        {
        'recognition-settings' : 
            {
                templateUrl: 'templates/settings_recognition.html',  
                controller: 'SettingsRecognitionCtrl'                               
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
                controller: 'SettingsBluetoothCtrl'
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
                controller: 'SettingsServerCtrl'
            }
        }
    });
  
  $urlRouterProvider.otherwise("/");
  
});


    
    
    
    
//    
//    .state('login', {
//        url: '/login',
//        templateUrl: 'templates/login.html'
//    })    
//    .state('vocabulary', {
//        url: '/vocabulary',
//        abstract: 'true',
//        templateUrl: 'templates/vocabulary_tabs.html'
//    })
//    .state('vocabulary.show_sessions', {
//        url: '/show_sessions',
//        views: 
//        {
//            'show_sessions-vocabulary' : 
//            {
//                templateUrl: 'templates/vocabulary_show_sessions.html',
//                controller: ''
//            }
//        }
//    })
//    .state('vocabulary.edit', {
//        url: '/edit/:modeId',
//        views: 
//        {
//        'edit-vocabulary' : 
//            {
//                templateUrl: 'templates/vocabulary_edit.html',  
//                controller: 'SettingsRecognitionCtrl'                               
//            }
//        }
//    })
//    .state('vocabulary.train', {
//        url: '/train/:modeId',
//        views: 
//        {
//        'train-vocabulary' : 
//            {
//                templateUrl: 'templates/vocabulary_train.html',
//                controller: 'SettingsBluetoothCtrl'
//            }
//        }
//    })
//    .state('vocabulary.show_recording_session', {
//        url: '/show_recording_session',
//        views: 
//        {
//        'show_recording_session-vocabulary' : 
//            {
//                templateUrl: 'templates/vocabulary_show_session.html',
//                controller: 'ShowRecordingSessionCtrl'
//            }
//        }
//    })
//    .state('vocabulary', {
//        url: '/vocabulary',
//        templateUrl: 'templates/vocabulary.html',
//        controller: 'VocabularyCtrl',
//        resolve:{
//                    'MyServiceData':function(VocabularySrv)
//                    {
//                        // MyServiceData will also be injectable in your controller, if you don't want this you could create a new promise with the $q service
//                        return VocabularySrv.promise; 
//                    }
//                    vocabulary :function(VocabularySrv)
//                    {
//                        // MyServiceData will also be injectable in your controller, if you don't want this you could create a new promise with the $q service
//                        return VocabularySrv.getVocabulary(); 
//                    }//                    
//                    
//                    
//                }
//    })
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
//    .state('sentence_train', {
//        url: '/train/:commandId',
//        templateUrl: 'templates/sentence_train.html',
//        controller: 'SentenceTrainCtrl'
//    })      
//    .state('sentence_record', {
//        url: '/record/:commandId',
//        templateUrl: 'templates/sentence_rec.html',
//        controller: 'SentenceRecordCtrl'
//    }) 