/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 * */

/*                                
                                return $ionicPopup.prompt(
                                $scope.copyvocdata = {data:""};
                                return $ionicPopup.show(
                                {
                                    title: UITextsSrv.labelAlertTitle,
                                    subTitle: "Scegli il nome del vocabolario",     
                                    template:'<input type = "text" ng-model = "copyvocdata.data">',
                                    scope: $scope,
                                    buttons: [
                                        {
                                           text: '<b>CANC</b>',
                                           type: 'button-positive',
                                           onTap: function() { return false; }
                                        },
                                        {
                                           text: '<b>OK</b>',
                                           type: 'button-positive',
                                           onTap: function(ev)
                                           {
                                               if($scope.copyvocdata.data == "") 
                                                   ev.preventDefault();
                                               else
                                               {
                                                    $scope.vocabulary.commands = selected_commands;
                                                    return VocabularySrv.copyVocabulary($scope.copyvocdata.data, $scope.vocabulary)                                                    
                                                    .then(function(success_or_null)
                                                    {
                                                        if(success_or_null)
                                                        {
                                                            $state.go("vocabulary", {foldername: StringSrv.format2filesystem($scope.copyvocdata.data)})
                                                            return false;                                                              
                                                        }
                                                        else
                                                        {
                                                            return $ionicPopup.alert({ title: UITextsSrv.labelAlertTitle, 
                                                                               template: UITextsSrv.VOCABULARY.labelSelectAnotherVocName1 + $scope.copyvocdata.data + UITextsSrv.VOCABULARY.labelSelectAnotherVocName2
                                                            })
                                                            .then(function()
                                                            {
                                                               return true;
                                                            })
                                                        }
                                                    })
                                                    .then(function(prevent)
                                                    {
                                                        if(prevent) ev.preventDefault();
                                                        else        return false;
                                                    })                                                    
                                                }
                                            }
                                        }]                                    
                                })
//                                .then(function(newvocname)
//                                {
//                                    $scope.vocabulary.commands = selected_commands;
//                                    return VocabularySrv.copyVocabulary(newvocname, $scope.vocabulary)
//                                })
//                                .then(function(success)
//                                {
//                                    if(success)
//                                    {
//                                        $state.go("vocabulary", {foldername: StringSrv.format2filesystem(newvocname)})
//                                        return false;   
//                                    }
//                                    else
//                                        $ionicPopup.alert({ title: UITextsSrv.labelAlertTitle, 
//                                                            template: UITextsSrv.VOCABULARY.labelSelectAnotherVocName1 + newvocname + UITextsSrv.VOCABULARY.labelSelectAnotherVocName2}); 
//                                        return false;
//                                })


*/