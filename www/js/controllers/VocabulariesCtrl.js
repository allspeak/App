/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//function TrainingCtrl($scope, vocabulary)//....use resolve 
//function TrainingCtrl($scope)  
function VocabulariesCtrl($scope, $q, $state, $ionicPopup, $ionicHistory, $ionicPlatform, $ionicModal, VocabularySrv, InitAppSrv, FileSystemSrv, RuntimeStatusSrv, EnumsSrv, ErrorSrv)  
{
    $scope.vocabularies             = [];
    $scope.activeVocabulary         = null;
    $scope.activeVocabularyName     = "";
    
    $scope.modalSelectNewVocabulary = null;
    // =======================================================================================================
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $ionicHistory.clearHistory();
        // ask user's confirm after pressing back (thus trying to exit from the App)
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("home");
        }, 100);        
        
        $scope.vocabularies_relpath     = InitAppSrv.getVocabulariesFolder();
        $scope.jsonvocfilename          = InitAppSrv.getUniversalJsonFileName();
        
        $scope.appStatus                = InitAppSrv.getStatus();
        $scope.activeVocabularyName     = $scope.appStatus.userActiveVocabularyName;
        
        return $scope.refreshVocabulariesList()
        .catch(function(error)
        {
            alert("Error in VocabulariesCtrl::$ionicView.enter " + error.toString());
        });
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 

    $scope.activateVocabulary = function(item) 
    {    
        return RuntimeStatusSrv.loadVocabulary(item.sLocalFolder)
        .then(function(status)
        {
            $scope.activeVocabulary     = status.vocabulary;
            $scope.activeVocabularyName = $scope.activeVocabulary.sLocalFolder;
            $scope.refreshVocabulariesList();
        })
        .catch(function(error)
        {
            if(error.message)   alert(error.message);        
            else                alert("Errore durante il caricamento del nuovo modello: " + error);
        });      
    };
    
    $scope.editVocabulary = function(item) 
    {    
        $state.go('vocabulary', {foldername:item.sLocalFolder});
    };

    $scope.refreshVocabulariesList = function()
    {
        $scope.vocabularies = [];
        return FileSystemSrv.listDir($scope.vocabularies_relpath)    // AllSpeak/vocabularies/
        .then(function(folders)
        {
            // Promises cycle !!
            var subPromises = [];
            for (var v=0; v<folders.length; v++) 
            {
                var foldername = folders[v];
                var active = (foldername == $scope.activeVocabularyName ? true : false);
                $scope.vocabularies.push({"active": active,"inputjson":$scope.vocabularies_relpath + "/" + foldername + "/" + $scope.jsonvocfilename});

                (function(j) 
                {
                    var inputjson       = $scope.vocabularies[j].inputjson;
                    var subPromise      = VocabularySrv.getTrainVocabularySelectedNet(inputjson)
                    .then(function(retvoc) 
                    {
                        var tempjson    = $scope.vocabularies[j].inputjson;
                        var isactive    = $scope.vocabularies[j].active;
                        $scope.vocabularies[j] = retvoc.voc;
                        $scope.vocabularies[j].inputjson        = tempjson;
                        $scope.vocabularies[j].active           = isactive;
                        
                        if(retvoc.net == null)  $scope.vocabularies[j].sStatus = "NON PRONTO";
                        else                    $scope.vocabularies[j].sStatus = "PRONTO";
                        
                        if(isactive) $scope.activeVocabulary    = $scope.vocabularies[j];
                        return $scope.vocabularies[j];
                    });
                    subPromises.push(subPromise);
                })(v);           
            }
            return $q.all(subPromises);
        })
        .then(function()
        {                
            $scope.$apply()
            return 1;
        })
        .catch(function(error)
        {
            if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST)
                return $scope.refreshVocabulariesList();
            else
            {
                alert("ERROR in VocabulariesCtrl::refreshVocabulariesList. " + error);
                error.message = "ERROR in VocabulariesCtrl::refreshVocabulariesList. " + error.message;
                $scope._showAlert("Error", "SubjectSessionsCtrl::refreshVocabulariesList : " + error.message);
                return $q.reject(error);
            }
        }); 
    }; 

    $scope.newVocabulary = function()
    {
        $state.go('manage_commands', {modeId:EnumsSrv.TRAINING.NEW_TV, backState:"vocabularies"});         
    };
    
    $scope._showAlert = function(title, message) {
        var alertPopup = $ionicPopup.alert({
            title: title,
            template: message
        });
    };    
}
controllers_module.controller('VocabulariesCtrl', VocabulariesCtrl)
