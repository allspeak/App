// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
main_module = angular.module('main_module', ['ionic', 'controllers_module', 'ionic.native']);

main_module.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
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
        templateUrl: 'templates/settings.html',
        controller: 'SettingsCtrl'
    });
  
  $urlRouterProvider.otherwise("/");
  
});
 