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
                    var subPromise      = VocabularySrv.getTrainVocabulary(inputjson)
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
                    .catch(function(error)
                    {
                        if(error.mycode == ErrorSrv.ENUMS.VOCABULARY.JSONFILE_NOTEXIST)
                        {
                            // vocabulary could not be recovered or user did not want to do it...and was thus deleted
                            $state.go("vocabularies"); 
                        }                        
                    })
                    subPromises.push(subPromise);
                })(v);           
            }
            return $q.all(subPromises)
        })
        .then(function(vocs)    // array of vocabulary.json contents
        {
            var subPromises = [];
            for(var v=0; v<vocs.length; v++)
            {
                if(vocs[v].sModelFileName != null && vocs[v].sModelFileName != "")
                {
                    (function(voc) 
                    {
                        var selected_net_relpath = $scope.vocabularies_relpath + "/" + voc.sLocalFolder + "/" + voc.sModelFileName + ".json";                    
                        var subPromise = VocabularySrv.getTrainVocabulary(selected_net_relpath)
                        subPromises.push(subPromise);
                    })(vocs[v]);                
                }
                else    subPromises.push(Promise.resolve(null))
            }        
            return $q.all(subPromises)            
        })
        .then(function(nets)    // array of net_xxxxxxx.json contents
        {
            var subPromises = [];
            for(var v=0; v<nets.length; v++)
            {
                (function(voc, v) 
                {
                    if(voc != null)
                    {
                        if(voc.sModelFilePath == null || !voc.sModelFilePath.length)
                        {
                            $scope.vocabularies[v].sStatus = "NON PRONTO";
                            subPromises.push(Promise.resolve(null))
                        }   
                        else
                        {
                            var subPromise  = FileSystemSrv.existFileResolved(voc.sModelFilePath)
                            .then(function(exist) 
                            {                            
                                if(exist)   $scope.vocabularies[v].sStatus = "PRONTO";
                                else        $scope.vocabularies[v].sStatus = "NON PRONTO";
                                return voc;
                            })
                            .catch(function(error)
                            {
                               return $q.reject(error); 
                            });   
                            subPromises.push(subPromise);
                        }
                    }
                    else
                    {
                        $scope.vocabularies[v].sStatus = "NON PRONTO";
                        subPromises.push(Promise.resolve(null));
                    }
                })(nets[v], v);                        
            }
            return $q.all(subPromises);
       })
        .then(function(vocs)
        {                
            $scope.$apply()
            return 1;
        })
        .catch(function(error)
        {
            alert("ERROR in VocabulariesCtrl::refreshVocabulariesList. " + error);
            error.message = "ERROR in VocabulariesCtrl::refreshVocabulariesList. " + error.message;
            $scope._showAlert("Error", "SubjectSessionsCtrl::refreshVocabulariesList : " + error.message);
            return $q.reject(error);
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
