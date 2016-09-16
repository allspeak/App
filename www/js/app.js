// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
main_module = angular.module('main_module', ['ionic', 'controllers_module', 'ionic.native' ]);    // ,'ng-fusioncharts'

main_module.run(function($ionicPlatform) 
                {
                    $ionicPlatform.ready(function() 
                    {
                      if(window.cordova && window.cordova.plugins.Keyboard) 
                      {
                        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                        // for form inputs)
                        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

                        // Don't remove this line unless you know what you are doing. It stops the viewport
                        // from snapping when text inputs are focused. Ionic handles this internally for
                        // a much nicer keyboard experience.
                        cordova.plugins.Keyboard.disableScroll(true);
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
                    if($state.current.name == "home") 
                    {
                        $ionicPopup.confirm({ title: 'Attenzione', template: 'are you sure you want to exit?'}).then(function(res) {
                              if (res) {
                                  ionic.Platform.exitApp();
                              }
                              else{   event.preventDefault();}
                          });
                    }else{
                        $ionicHistory.goBack();
                    }
                }, 100);
            });                

main_module.config(function($stateProvider, $urlRouterProvider) {
  
    $stateProvider
    .state('home', {
        url: '/',
        templateUrl: 'templates/home.html',
        controller: 'HomeCtrl'
    })
    .state('login', {
        url: '/login',
        templateUrl: 'templates/login.html'
    })
    .state('recognition', {
        url: '/recognition',
        templateUrl: 'templates/recognition.html'
    })
    .state('amplifier', {
        url: '/amplifier',
        templateUrl: 'templates/amplifier.html'
    })
    .state('vocabulary', {
        url: '/vocabulary',
        templateUrl: 'templates/vocabulary.html',
        controller: 'VocabularyCtrl'
    })
    .state('sentence_train', {
        url: '/train/:sentenceId',
        templateUrl: 'templates/sentence_train.html',
        controller: 'SentenceTrainCtrl'
    })      
    .state('sentence_record', {
        url: '/record/:sentenceId',
        templateUrl: 'templates/sentence_rec.html',
        controller: 'SentenceRecordCtrl'
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
    .state('settings.setup_input', {
        url: '/setup_input',
        views: 
        {
        'setupinput-settings' : 
            {
                templateUrl: 'templates/settings_setup_audioinput_debug.html',
                controller: 'SetupAudioInputCtrl'
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
    })    
    
    ;
  
  $urlRouterProvider.otherwise("/");
  
});
 
 
 main_module.filter('secondsToDateTime', function() 
 {
    return function (duration) 
    {
        var milliseconds = parseInt((duration%1000)/10)
        , seconds = parseInt((duration/1000)%60)
        , minutes = parseInt((duration/(1000*60))%60);
//        , hours = parseInt((duration/(1000*60*60))%24);

//        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;
        milliseconds = (milliseconds < 10) ? "0" + milliseconds : milliseconds;

//        return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
        return minutes + ":" + seconds + "." + milliseconds;
    }

});