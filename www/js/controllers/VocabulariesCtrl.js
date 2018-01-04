/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//function TrainingCtrl($scope, vocabulary)//....use resolve 
//function TrainingCtrl($scope)  
function VocabulariesCtrl($scope, $q, $state, $ionicPopup, $ionicHistory, $ionicPlatform, $ionicModal, VocabularySrv, InitAppSrv, FileSystemSrv, StringSrv, EnumsSrv)  
{
    $scope.vocabularies             = [];
    $scope.activeVocabulary         = null;
    $scope.activeVocabularyFolder   = "";
    
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
        
        $scope.relpath                  = InitAppSrv.getVocabulariesFolder();
        $scope.jsonvocfilename          = InitAppSrv.getUniversalJsonFileName();
        
        $scope.appStatus                = InitAppSrv.getStatus();
        $scope.activeVocabularyFolder   = $scope.appStatus.userActiveVocabularyName;
        
        return $scope.refreshSessionsList()
        .catch(function(error)
        {
            alert("Error in VocabulariesCtrl::$ionicView.enter " + error.toString());
        });
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 

    $scope.selectVocabulary = function(item) 
    {    
        $state.go('vocabulary', {foldername:item.sLocalFolder});
    };

    $scope.refreshSessionsList = function()
    {
        $scope.vocabularies = [];
        return FileSystemSrv.listDir($scope.relpath)    //// AllSpeak/vocabularies/
        .then(function(folders)
        {
            // Promises cycle !!
            var subPromises = [];
            for (var v=0; v<folders.length; v++) 
            {
                var foldername = folders[v].name;
                var active = (foldername == $scope.activeVocabularyFolder ? true : false);
                $scope.vocabularies.push({"active": active,"inputjson":$scope.relpath + "/" + foldername + "/" + $scope.jsonvocfilename});
                (function(j) 
                {
                    inputjson       = $scope.vocabularies[j].inputjson;
                    var subPromise  = VocabularySrv.getTempTrainVocabulary(inputjson)
                    .then(function(voc) 
                    {
                        var tempjson    = $scope.vocabularies[j].inputjson;
                        var isactive    = $scope.vocabularies[j].active;
                        $scope.vocabularies[j] = voc;
                        $scope.vocabularies[j].inputjson        = tempjson;
                        $scope.vocabularies[j].active           = isactive;
                        $scope.vocabularies[j].sStatus          = "OK";
                        if(isactive) $scope.activeVocabulary    = $scope.vocabularies[j]
                    });
                    subPromises.push(subPromise);
                })(v);
            }
            $q.all(subPromises).then(function()
            {
                return $q.defer().resolve(1);
            })
            .catch(function(error)
            {
                alert("ERROR in VocabulariesCtrl::refreshSessionsList. " + error);
                error.message = "ERROR in VocabulariesCtrl::refreshSessionsList. " + error.message;
                $q.reject(error);
            }); 
        })
//        .then(function(){     this then would be called before the return $q.defer().resolve(1);
//            return 1;
//        })
        .catch(function(error)  // this catch does not catch errors in the subPromises array. teh above  $q.reject is not propagated
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
