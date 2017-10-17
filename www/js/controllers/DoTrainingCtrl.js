/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//function TrainingCtrl($scope, vocabulary)//....use resolve 
//function TrainingCtrl($scope)  
function DoTrainingCtrl($scope, $state, $ionicHistory, $ionicPlatform, VocabularySrv, SequencesRecordingSrv, InitAppSrv, FileSystemSrv, StringSrv, EnumsSrv, TfSrv)  
{
    
    $scope.labelStartTraining                       = "INIZIA TRAINING";
    $scope.labelEditTrainVocabulary                 = "cambia COMANDI";
    $scope.labelSelectSentences                     = "SELEZIONA COMANDI";
    $scope.labelToggleSentencesEditTrainSequence    = "ADDESTRA I SEGUENTI COMANDI";
    $scope.labelToggleSentencesEditTrainVocabulary  = "MODIFICA LA LISTA DEI COMANDI";
    
    $scope.tfCfg                = null;
    
    $scope.labelToggleSentences                     = $scope.labelToggleSentencesEditTrainSequence;
    
    $scope.vocabulary           = [];
    $scope.training_sequence    = []; 
    
    $scope.default_tv_filename                      = "train_vocabulary.json";
    $scope.training_folder      = "";               // AllSpeak/training_sessions/default or /ts_01
                                                    // InitAppSrv.getAudioFolder() + "/" + data.stateParams.foldername
    
    $scope.selectList           = true;
    $scope.editTrainVocabulary  = false;
    $scope.editTrainSequence    = false;
    
    $scope.successState         = "show_session";
    $scope.cancelState          = "training";
    
    // =======================================================================================================

    $scope.$on("$ionicView.enter", function(event, data)
    {
        $ionicHistory.clearHistory();
        // ask user's confirm after pressing back (thus trying to exit from the App)
        $scope.deregisterFunc   = $ionicPlatform.registerBackButtonAction(function(){ $state.go("training"); }, 100);        

        $scope.relpath          = InitAppSrv.getAudioFolder();
        
        $scope.tfCfg            = TfSrv.getCfg();
        
        return VocabularySrv.getTrainVocabulary()       // train_vocabulary could be empty => add promise
        .then(function(voc)
        {
            $scope.vocabulary               = voc.vocabulary;
            
            if(data.stateParams.foldername != null)
                $scope.training_folder = data.stateParams.foldername;
            else
            {
                alert("DoTrainingCtrl::$ionicView.enter. error : foldername is empty");
                $state.go("home");
            }        
            $scope.training_folder          = $scope.relpath + "/" + $scope.training_folder;            
            $scope.repetitionsCount         = SequencesRecordingSrv.getRepetitions(); 
            $scope.selectedTrainingModality = SequencesRecordingSrv.getModalities()[1];              
            
            if(data.stateParams.modeId != null)         $scope.mode_id         = parseInt(data.stateParams.modeId);
            else                                        alert("ERROR in DoTrainingCtrl::$ionicView.enter. error : modeId is empty");        

            switch($scope.mode_id)
            {
                case 1: 
                    // edit
                    $scope.selectList           = false;
                    $scope.editTrainVocabulary  = true;
                    $scope.editTrainSequence    = false;     
                    $scope.doEditTrainVocabulary();
                    break;

                case 2: 
                    // train
                    $scope.selectList           = false;
                    $scope.editTrainVocabulary  = false;
                    $scope.editTrainSequence    = true;  
                    
                    break;

                case 3: 
                    // empty vocabulary
                    $scope.selectList           = true;
                    $scope.editTrainVocabulary  = false;
                    $scope.editTrainSequence    = false;  
                    $scope.selectSentences();
                    break;
                default:
                    alert("ERROR in DoTrainingCtrl::$ionicView.enter. unrecognized modeId: " +  $scope.mode_id.toString());    
   
            }             
        });
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 
    //-------------------------------------------------------------------
    // $scope.selectList = true
    //------------------------------------------------------------------- 
    // when train_vocabulary does not exist. retrieve all possible commands (voicebank vocabulary)
    $scope.selectSentences = function() 
    {
        return VocabularySrv.getVoiceBankVocabulary()
        .then(function(voc)
        {
            $scope.vocabulary           = voc;
            $scope.labelButtonMulti     = "SALVA LISTA";
            $scope.selectList           = false;
            $scope.editTrainVocabulary  = true;
            $scope.editTrainSequence    = false;
            $scope.$apply();
        })
        .catch(function(err)
        {
            alert(error.message);
        });
    };    
    //-------------------------------------------------------------------
    // $scope.editTrainVocabulary = true
    //-------------------------------------------------------------------  
    $scope.doEditTrainVocabulary = function() 
    {
        $scope.selectList           = false;
        $scope.editTrainVocabulary  = true;
        $scope.editTrainSequence    = false; 
        
        $scope.toogleSelectAll      = false;
        $scope.labelToggleSentences = $scope.labelToggleSentencesEditTrainVocabulary;
        
        // get all the registered sentences (when i want to train a new sentence, first I have to add it to the voicebank vocabulary)
        return VocabularySrv.getVoiceBankVocabulary()
        .then(function(vbvoc)
        {
            var voicebank_voc   = vbvoc;
            var len_vbv         = voicebank_voc.length;
            var len_tv          = $scope.vocabulary.length;

            // I set all voicebank_voc[:].checked = 0
            // I copy actual $scope.vocabulary[i].checked => voicebank_voc
            for(vbvs=0; vbvs<len_vbv; vbvs++)
            {
                voicebank_voc[vbvs].checked = false;
                var vbv_id = voicebank_voc[vbvs].id;
                for(tvs=0; tvs<len_tv; tvs++)
                    if(vbv_id == $scope.vocabulary[tvs].id)
                        voicebank_voc[vbvs].checked = true;
            }            
            $scope.vocabulary = voicebank_voc;
            $scope.$apply();
        })
        .catch(function(error){
            alert(error.message);
        });          
    };

    $scope.addSentence = function() {
        var voicebank_voc = VocabularySrv.getVoiceBankVocabulary();
    };
    
    $scope.selectAll = function(bool)
    {
        for(s=0; s<$scope.vocabulary.length; s++)
            $scope.vocabulary[s].checked = bool;
    };
    
    $scope.saveTrainVocabulary = function(bool)
    {
        var selected_sentences = [];
        
        for(s=0; s<$scope.vocabulary.length; s++)
            if($scope.vocabulary[s].checked)
                selected_sentences.push($scope.vocabulary[s]);
        
        $scope.vocabulary = selected_sentences;
                
        return FileSystemSrv.createDir($scope.training_folder, false)
        .then(function()
        {
            var train_obj = {};
            train_obj.sLabel              = "default";
            train_obj.vocabulary          = $scope.vocabulary;
            train_obj.nProcessingScheme   = $scope.tfCfg.nProcessingScheme;
            train_obj.nModelType          = $scope.tfCfg.nModelType;

            return VocabularySrv.setTrainVocabulary(train_obj, $scope.training_folder + "/" + $scope.default_tv_filename);
        })
        .then(function()
        {
            InitAppSrv.setTrainVocabularyPresence(true);
            $state.go('training');
        })
        .catch(function(error){
            alert(error.message);
        });          
    };
    //-------------------------------------------------------------------
    // $scope.editTrainSequence = true
    //-------------------------------------------------------------------    
    $scope.cancel = function()
    {
        $state.go('training');
    };

    $scope.decrementRepCount = function() {
        $scope.repetitionsCount--;
        if($scope.repetitionsCount < 1) $scope.repetitionsCount = 1;
    };
    
    $scope.incrementRepCount = function() {
        $scope.repetitionsCount++;
    }; 
    
    $scope.startTraining = function() 
    {
        var sentences = $scope.vocabulary.map(function(item) { return (item.checked ? item : null)});
        
        if(sentences.length)
        {
            var record_relpath = $scope.training_folder + "/training_" + StringSrv.formatDate();
            return SequencesRecordingSrv.calculateSequence( sentences, 
                                                            $scope.selectedTrainingModality.value, 
                                                            $scope.repetitionsCount, 
                                                            record_relpath,
                                                            "train",
                                                            true)                      //  add #repetition to file name
            .then(function(sequence)
            {
                $scope.training_sequence = sequence;    
                $state.go('record_sequence', {modeId:EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING, sentenceId: 0, successState:$scope.successState, cancelState:$scope.cancelState});
            })
            .catch(function(error){
                alert(error.message);
            });              
        }
        else
            alert("non hai scelto nessuna frase da addestrare");
    };
    
    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    //-------------------------------------------------------------------
    // used to select default comobobox value
    $scope.selectObjByValue = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].value == value)
               return objarray[i];
    }; 
    //-------------------------------------------------------------------
    
}
controllers_module.controller('DoTrainingCtrl', DoTrainingCtrl)

//attempt to follow this: https://codepen.io/liuwenzhuang/pen/PZMqoM
//.directive('multipleHeaders', function($timeout) {
//
// return {
//    
//    restrict: 'AC',
//    
//    link: function(scope, element) {
//      
//      var offsetTop = 0;
//      
//      // Get the parent node of the ion-content
//      var parent = angular.element(element[0].parentNode);
//      
//      // Get all the headers in this parent
//      var headers = parent[0].getElementsByClassName('bar');
//
//      // Iterate through all the headers
//      for(x=0;x<headers.length-2;x++)
//      {
//        // If this is not the main header or nav-bar, adjust its position to be below the previous header
//        if(x > 0) {
//          headers[x].style.top = offsetTop + 'px';
//        }
//        
//        // Add up the heights of all the header bars
//        offsetTop = offsetTop + headers[x].offsetHeight;
//      }      
//      
//      // Position the ion-content element directly below all the headers
//      element[0].style.top = offsetTop + 'px';
//      
//    }
//  };  
//});
