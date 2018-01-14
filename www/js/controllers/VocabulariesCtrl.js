/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//function TrainingCtrl($scope, vocabulary)//....use resolve 
//function TrainingCtrl($scope)  
function VocabulariesCtrl($scope, $q, $state, $ionicPopup, $ionicHistory, $ionicPlatform, $ionicModal, VocabularySrv, InitAppSrv, FileSystemSrv, RuntimeStatusSrv, EnumsSrv)  
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
        
        return $scope.refreshSessionsList()
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
            $scope.refreshSessionsList();
        })
        .catch(function(error)
        {
            if(error.message)   alert(error.message);        
            else                alert("Errore durante il caricamento del nuovo modello: " + error);
        })        
    };
    
    $scope.editVocabulary = function(item) 
    {    
        $state.go('vocabulary', {foldername:item.sLocalFolder});
    };

    $scope.refreshSessionsList = function()
    {
        $scope.vocabularies = [];
        return FileSystemSrv.listDir($scope.vocabularies_relpath)    // AllSpeak/vocabularies/
        .then(function(folders)
        {
            // Promises cycle !!
            var subPromises = [];
            for (var v=0; v<folders.length; v++) 
            {
                // MISTERIOSAMENTE NON FUNZIONA #ISSUE# ...codice spostato in fondo al file
                
                var foldername = folders[v].name;
                var active = (foldername == $scope.activeVocabularyName ? true : false);
                $scope.vocabularies.push({"active": active,"inputjson":$scope.vocabularies_relpath + "/" + foldername + "/" + $scope.jsonvocfilename});
                (function(j) 
                {
                    var inputjson       = $scope.vocabularies[j].inputjson;
                    var subPromise  = VocabularySrv.getTrainVocabulary(inputjson)
                    .then(function(voc) 
                    {
                        var tempjson    = $scope.vocabularies[j].inputjson;
                        var isactive    = $scope.vocabularies[j].active;
                        $scope.vocabularies[j] = voc;
                        $scope.vocabularies[j].inputjson        = tempjson;
                        $scope.vocabularies[j].active           = isactive;
                        if(isactive) $scope.activeVocabulary    = $scope.vocabularies[j];
                        return $scope.vocabularies[j];
                    })
                    subPromises.push(subPromise);
                })(v);           
            }
            $q.all(subPromises)
            .then(function(vocs)
            {
                var subPromises = [];
                for(var v=0; v<vocs.length; v++)
                {
                    (function(voc) 
                    {
                        if(voc.sModelFilePath.length)
                        {
                            var subPromise  = FileSystemSrv.existFileResolved(voc.sModelFilePath)
                            .then(function(exist) 
                            {                            
                                if(exist)
                                {
                                    voc.sStatus = "PRONTO";
                                    return voc;
                                }
                                else
                                {
                                    voc.sStatus = "NON PRONTO";
                                    return voc;
                                }
                            })
                            .catch(function(error)
                            {
                               return $q.reject(error); 
                            });                              
                        }   
                        else
                        {
                            voc.sStatus = "NON PRONTO";
                            return voc;
                        }
                        subPromises.push(subPromise);
                    })(vocs[v]);                        
                }
                $q.all(subPromises)
                .then(function(vocs)
                {                
                    return 1;
                })
                .catch(function(error)
                {
                   return $q.reject(error); 
                });                 
            })
            .catch(function(error)
            {
                alert("ERROR in VocabulariesCtrl::refreshSessionsList. " + error);
                error.message = "ERROR in VocabulariesCtrl::refreshSessionsList. " + error.message;
                return $q.reject(error);
            }); 
        })
        .catch(function(error) 
        {
            $scope._showAlert("Error", "SubjectSessionsCtrl::refreshSessionsList : " + error.message);
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



/*
//                var foldername = folders[v].name;
//                var active = (foldername == $scope.activeVocabularyName ? true : false);
//                $scope.vocabularies.push({"active": active,"sLocalFolder":foldername});
//                (function(j) 
//                {
//                    var localfolder = $scope.vocabularies[j].sLocalFolder;
//                    var subPromise  = VocabularySrv.getUpdatedStatusName(localfolder)
//                    .then(function(status) 
//                    {
//                        var voc         = status.vocabulary;
//                        var vocstatus   = status.vocabulary.status;                          
//                        
//                        var folder      = $scope.vocabularies[j].sLocalFolder;
//                        var isactive    = $scope.vocabularies[j].active;
//                        
//                        $scope.vocabularies[j]                  = status.vocabulary;
//                        
//                        $scope.vocabularies[j].sLocalFolder     = folder;
//                        $scope.vocabularies[j].active           = isactive;
//                        $scope.vocabularies[j].sStatus          = vocstatus.label;
//                        if(isactive) $scope.activeVocabulary    = $scope.vocabularies[j]
//                    });
//                    subPromises.push(subPromise);
//                })(v);

 */