/* 
 * Allows:
 *  - Create a new vocabulary
 *  - Edit (change items) an existing vocabulary
 *  - start a recording session
 */

function ManageCommandsCtrl($scope, $state, $ionicHistory, $ionicPlatform, $ionicModal, $ionicPopup, VocabularySrv, VoiceBankSrv, InitAppSrv, FileSystemSrv, StringSrv, EnumsSrv, UITextsSrv)  
{
    $scope.labelStartTrainSession                   = "REGISTRA COMANDI";
    $scope.labelEditTrainVocabulary                 = "CAMBIA COMANDI";
    $scope.labelSelectSentences                     = "SELEZIONA COMANDI";
    $scope.labelToggleSentencesEditTrainSequence    = "ADDESTRA I SEGUENTI COMANDI";
    $scope.labelToggleSentencesEditTrainVocabulary  = "MODIFICA LA LISTA DEI COMANDI";
    
    $scope.labelToggleSentences     = $scope.labelToggleSentencesshowTrainVocabulary;
    
    $scope.commands                 = [];
    $scope.vocabulary               = [];
    $scope.training_sequence        = []; 

    $scope.vocabularies_relpath     = "";
    $scope.recordings_folder       = "";               // AllSpeak/recordings
        
    $scope.default_tv_filename      = "";               // "vocabulary.json"              <= UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME
    $scope.default_voc_folder       = "";               // "default"                    <= UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME

    $scope.foldername               = "";               // GIGI                                 <= data.stateParams.foldername
    $scope.vocabulary_relpath       = "";               // AllSpeak/vocabularies/GIGI           <= getVocabulariesFolder + "/" + data.stateParams.foldername
    $scope.vocabulary_json_path      = "";               // AllSpeak/vocabularies/GIGI/vocabulary.json
    
    $scope.selectList               = true;
    $scope.editTrainVocabulary      = false;
    $scope.showTrainVocabulary      = false;
    
    $scope.successState             = "manage_recordings";
    $scope.cancelState              = "vocabularies";
    
    $scope.isDefault                = false;    // if is a default NET, I cannot train it, doesn't have any recordings
                                                // I can see the commands, but cannot edit them    
    $scope.isNewVoc                 = false; 
                                                
    // =======================================================================================================
    // MODAL
    // =======================================================================================================
    // when train_vocabulary does not exist. 
    // prompt user for a name, then retrieve and display all possible commands (voicebank vocabulary)
    // start creating a new vocabulary
    $ionicModal.fromTemplateUrl('templates/modal/newVocabulary.html', 
    {
        scope: $scope,
        animation: 'slide-in-up',
        backdropClickToClose: false      
    })
    .then(function(modal) 
    {
        $scope.modalSelectNewVocabulary = modal; 
    })
    .catch(function(error)
    {
        alert(error.message);
    }); 
    // =======================================================================================================

    $scope.$on("$ionicView.enter", function(event, data)
    {
        $ionicHistory.clearHistory();
        $scope.deregisterFunc           = $ionicPlatform.registerBackButtonAction(function()
        {
            if($scope.backState == "vocabulary")
                $state.go($scope.backState, {"foldername":$scope.foldername}); 
            else
                $state.go($scope.backState); 
            
        }, 100);   
        
        $scope.vocabularies_relpath     = InitAppSrv.getVocabulariesFolder();       // AllSpeak/vocabularies
        $scope.recordings_folder = InitAppSrv.getAudioFolder();              // AllSpeak/recordings        
        $scope.default_tv_filename      = UITextsSrv.TRAINING.DEFAULT_TV_JSONNAME;
        
        //---------------------------------------------------------------------------------------------------------------------
        // manage input params : mode_id/foldername/backState
        //---------------------------------------------------------------------------------------------------------------------
        $scope.backState                = "home";
        
        if(data.stateParams == null)    alert("ERROR in ManageCommandsCtrl::$ionicView.enter. error : NO PARAMS were sent"); 
        else
        {
            if(data.stateParams.modeId != null)         $scope.mode_id         = parseInt(data.stateParams.modeId);
            else                                        alert("ERROR in ManageCommandsCtrl::$ionicView.enter. error : modeId is empty");         

            if(data.stateParams.foldername != null && data.stateParams.foldername != "")
            {
                $scope.foldername           = data.stateParams.foldername;
                $scope.vocabulary_relpath   = $scope.vocabularies_relpath     + "/" + data.stateParams.foldername;
                $scope.vocabulary_json_path = $scope.vocabulary_relpath  + "/" + $scope.default_tv_filename;
            }
            else
            {
                // if foldername is null/empty => IT must be TRAINING.NEW_TV, otherwise go home 
                if($scope.mode_id != EnumsSrv.TRAINING.NEW_TV)
                {
                    alert("ManageCommandsCtrl::$ionicView.enter. error : foldername is empty");
                    $state.go("home");
                } 
            }
            if(data.stateParams.backState != null) $scope.backState = data.stateParams.backState;
        };
        //---------------------------------------------------------------------------------------------------------------------
        $scope.default_voc_folder       = InitAppSrv.getDefaultVocabularyName();    // default
        $scope.createNewVocabularyText  = UITextsSrv.TRAINING.MODAL_CREATE_NEWVOCABULARY;

        $scope.plugin_enums = InitAppSrv.getPlugin().ENUM.PLUGIN;
        
        $scope.isNewVoc                 = false
        if($scope.mode_id != EnumsSrv.TRAINING.NEW_TV)
        {
            // TRAINING.EDIT_TV || TRAINING.SHOW_TV
            return VocabularySrv.getTrainVocabulary($scope.vocabulary_json_path)
            .then(function(voc)
            {
                $scope.vocabulary               = voc;
                $scope.commands                 = voc.commands;
                
                $scope.isDefault                = false;
                if($scope.vocabulary.nModelType != null)
                    if($scope.vocabulary.nModelType == $scope.plugin_enums.TF_MODELTYPE_COMMON)
                        $scope.isDefault = true;                
                
                if($scope.mode_id == EnumsSrv.TRAINING.EDIT_TV) 
                {
                    // EDIT TV
                    $scope.selectList           = false;
                    $scope.editTrainVocabulary  = true;
                    $scope.showTrainVocabulary  = false;     
                    $scope.doEditTrainVocabulary();
                }
                else if($scope.mode_id == EnumsSrv.TRAINING.SHOW_TV)
                {
                    // Record TS
                    $scope.selectList           = false;
                    $scope.editTrainVocabulary  = false;
                    $scope.showTrainVocabulary  = true;  
                }
                else  alert("ERROR in ManageCommandsCtrl::$ionicView.enter. unrecognized modeId: " +  $scope.mode_id.toString());                  
                $scope.$apply();
            });
        }
        else
        {
            // TRAINING.NEW_TV
            // create new vocabulary
            $scope.selectList               = true;
            $scope.editTrainVocabulary      = false;
            $scope.showTrainVocabulary      = false;  
            if($scope.modalSelectNewVocabulary == null)
            {
                // SHOULD NEVER HAPPENS, BUT SOMETIMES IT DOES !!
                $ionicModal.fromTemplateUrl('templates/modal/newVocabulary.html', 
                {
                    scope: $scope,
                    animation: 'slide-in-up',
                    backdropClickToClose: false      
                })
                .then(function(modal) 
                {
                    $scope.isNewVoc                 = true;
                    $scope.modalSelectNewVocabulary = modal; 
                    $scope.modalSelectNewVocabulary.show();
                })
                .catch(function(error)
                {
                    alert(error.message);
                });                 
            }   
            else
            {
                $scope.isNewVoc = true;
                $scope.modalSelectNewVocabulary.show();
                $scope.$apply();
            }
        }         
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 
    
    //-------------------------------------------------------------------  
    // button back to vocabulary
    $scope.cancel = function()
    {
        if($scope.isNewVoc)
            $state.go('home');
        else
            $state.go('vocabulary', {"foldername":$scope.foldername});
    };     
    //-------------------------------------------------------------------
    // NO VOCABULARY EXIST ($scope.selectList = true)
    //------------------------------------------------------------------- 
    // button 1
    $scope.selectSentences = function() 
    {
        return VoiceBankSrv.getVoiceBankVocabulary()
        .then(function(cmds)
        {
            $scope.commands             = cmds;
            
            for(var cmd in $scope.commands) $scope.commands[cmd].checked = false;
            
            $scope.labelButtonMulti     = "SALVA LISTA";
            $scope.selectList           = false;
            $scope.editTrainVocabulary  = true;
            $scope.showTrainVocabulary  = false;
            $scope.$apply();
        })
        .catch(function(err)
        {
            alert(error.message);
        });
    };      
    
    $scope.onSelectNewVocabularyName = function(obj)
    {
        if(obj == null || !obj.label.length )   return;
        
        var validpath = StringSrv.format2filesystem(obj.label);
        
        // check if the selected folder is not called "default"
        if(validpath == $scope.default_voc_folder)
        {
            var alertPopup = $ionicPopup.alert({
                title: 'Attenzione',
                template: 'Il nome \"' + $scope.default_voc_folder + '\" è riservato al sistema. Scegli un\'altro nome'
            }); 
            return;
        }
        
        // check if the selected folder already exist
        var local_voc_folder                 = $scope.vocabularies_relpath     + "/" + validpath;
        return FileSystemSrv.existDir(local_voc_folder)
        .then(function(existdir)
        {
//            if(existdir)      // #DEBUG
            if(false)   
            {
                var alertPopup = $ionicPopup.alert({
                    title: 'Attenzione',
                    template: 'Un vocabolario chiamato \"' + obj.label + '\" è già presente. Scegli un\'altro nome'
                }); 
                return;                
            }
            else
            {
                $scope.modalSelectNewVocabulary.hide();   

                $scope.vocabulary                   = {};
                $scope.vocabulary.sLocalFolder      = validpath; // substitute  " ", "'", "-" with "_"
                $scope.vocabulary.sLabel            = obj.label;

                $scope.foldername                   = $scope.vocabulary.sLocalFolder;
                $scope.vocabulary_relpath           = local_voc_folder;
                $scope.vocabulary_json_path         = $scope.vocabulary_relpath  + "/" + $scope.default_tv_filename;

                $scope.selectSentences();            
            }
        });
    };
    
    $scope.onCancelNewVocabularyName = function()
    {
        $scope.modalSelectNewVocabulary.hide(); 
        if($scope.backState != "")
            $state.go($scope.backState)
        else
            $state.go('home');    
    };    

  
    //-------------------------------------------------------------------
    // SHOW COMMANDS ($scope.showTrainVocabulary = true)
    //-------------------------------------------------------------------  
    // button 1
    $scope.doEditTrainVocabulary = function() 
    {
        $scope.selectList           = false;
        $scope.editTrainVocabulary  = true;
        $scope.showTrainVocabulary  = false; 
        
        $scope.toogleSelectAll      = false;
        $scope.labelToggleSentences = $scope.labelToggleSentencesEditTrainVocabulary;
        
        // get all the registered sentences (when i want to train a new sentence, first I have to add it to the voicebank vocabulary)
        return VoiceBankSrv.getVoiceBankVocabulary()
        .then(function(vbvoc)
        {
            var voicebank_voc   = vbvoc;
            var len_vbv         = voicebank_voc.length;
            var len_tv          = $scope.commands.length;

            // I set all voicebank_voc[:].checked = 0
            // I copy actual $scope.commands[i].checked => voicebank_voc
            for(vbvs=0; vbvs<len_vbv; vbvs++)
            {
                voicebank_voc[vbvs].checked = false;
                var vbv_id = voicebank_voc[vbvs].id;
                for(tvs=0; tvs<len_tv; tvs++)
                    if(vbv_id == $scope.commands[tvs].id)
                        voicebank_voc[vbvs].checked = true;
            }            
            $scope.commands = voicebank_voc;
            $scope.$apply();
        })
        .catch(function(error){
            alert(error.message);
        });          
    };  
    
    //-------------------------------------------------------------------
    // EDIT COMMANDS ($scope.editTrainVocabulary = true)
    //-------------------------------------------------------------------  
    $scope.addSentence = function() {
        var voicebank_voc = VoiceBankSrv.getVoiceBankVocabulary();
    };
    
    $scope.selectAll = function(bool)
    {
        for(s=0; s<$scope.commands.length; s++)
            $scope.commands[s].checked = bool;
    };
    
    // button 1 
    $scope.saveTrainVocabulary = function()
    {
        var selected_commands = [];
        
        if($scope.commands[0].checked == null)
        {
            console.log("ERROR IN ManageCommandsCtrl::saveTrainVocabulary....$scope.commands[0].checked are null")
            return;
        }
        
        // push also the checked ones
        for(s=0; s<$scope.commands.length; s++)
            if($scope.commands[s].checked)
                selected_commands.push($scope.commands[s]);
        
        if(!selected_commands.length)
        {
            var alertPopup = $ionicPopup.alert({
                title: 'Attenzione',
                template: 'Devi selezionare almeno un comando\naltrimenti premi RITORNA per annullare'
            });
        }
        else
        {
            $scope.vocabulary.commands = selected_commands;
            return VocabularySrv.setTrainVocabulary($scope.vocabulary)
            .then(function()
            {
                $scope.isNewVoc             = false;
                $scope.commands             = $scope.vocabulary.commands;
                $scope.selectList           = false;
                $scope.editTrainVocabulary  = false;
                $scope.showTrainVocabulary  = true;    
                $scope.$apply();
            })
            .catch(function(error)
            {
//                if(error.mycode) { switch(error.mycode) { } }
                alert(error.message);
            });          
        };
    };
    //-------------------------------------------------------------------
}
controllers_module.controller('ManageCommandsCtrl', ManageCommandsCtrl);
