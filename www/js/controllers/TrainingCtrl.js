/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//function TrainingCtrl($scope, vocabulary)//....use resolve 
//function TrainingCtrl($scope)  
function TrainingCtrl($scope, $state, $ionicHistory, $ionicPlatform, VocabularySrv, SequencesRecordingSrv, InitAppSrv, StringSrv, EnumsSrv)  
{
    
    $scope.labelStartTraining                       = "INIZIA TRAINING";
    $scope.labelEditTrainVocabulary                 = "cambia COMANDI";
    $scope.labelSelectSentences                     = "SELEZIONA COMANDI";
    $scope.labelToggleSentencesEditTrainSequence    = "ADDESTRA I SEGUENTI COMANDI";
    $scope.labelToggleSentencesEditTrainVocabulary  = "MODIFICA LA LISTA DEI COMANDI";
    
    $scope.labelToggleSentences                     = $scope.labelToggleSentencesEditTrainSequence;
    
    $scope.vocabulary           = [];
    $scope.training_sequence    = []; 
    
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
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            if($scope.editTrainVocabulary)
            {
                $scope.goToEditTrainSequence();
                $scope.$apply();
            }
            else    $state.go("home");
        }, 100);        
        
        $scope.relpath = InitAppSrv.getAudioFolder();
        
        return VocabularySrv.getTrainVocabulary()       // train_vocabulary could be empty => add promise
        .then(function(voc)
        {
            $scope.vocabulary               = voc;
            $scope.repetitionsCount         = SequencesRecordingSrv.getRepetitions(); 
            $scope.selectedTrainingModality = SequencesRecordingSrv.getModalities()[1]; 
            
            if($scope.vocabulary.length)
            {
                $scope.selectList           = false;
                $scope.editTrainVocabulary  = false;
                $scope.editTrainSequence    = true;
                
                $scope.toogleSelectAll      = true;
            }
            else
            {
                $scope.selectList           = true;
                $scope.editTrainVocabulary  = false;
                $scope.editTrainSequence    = false;                
            }
        });
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 
    //-------------------------------------------------------------------
    // $scope.selectList = true
    //-------------------------------------------------------------------     
    $scope.selectSentences = function() {
        $scope.vocabulary           = VocabularySrv.getVoiceBankVocabulary();
        $scope.labelButtonMulti     = "SALVA LISTA";
        $scope.selectList           = false;
        $scope.editTrainVocabulary  = true;
        $scope.editTrainSequence    = false;
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
        
        // get all the registered sentences (when i want to train a new sentence, first I have to add to the voicebank vocabulary)
        var voicebank_voc   = VocabularySrv.getVoiceBankVocabulary(); 
        var len_vbv         = voicebank_voc.length;
        var len_tv          = $scope.vocabulary.length;
        
        // I set all : voicebank_voc[:].checked = 0
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
        return VocabularySrv.setTrainVocabulary($scope.vocabulary)
        .then(function(){
            InitAppSrv.setTrainVocabularyPresence(true);
            $scope.goToEditTrainSequence();
            $scope.$apply();
        });
    };
    
   //-------------------------------------------------------------------
    // $scope.editTrainSequence = true
    //-------------------------------------------------------------------
    $scope.goToEditTrainSequence = function()
    {
        $scope.selectList           = false;
        $scope.editTrainVocabulary  = false;
        $scope.editTrainSequence    = true;  
        $scope.toogleSelectAll      = true;        
        $scope.labelToggleSentences = $scope.labelToggleSentencesEditTrainSequence;            
        
        return VocabularySrv.getTrainVocabulary()       // should not be necessary => nevertheless, add promise
        .then(function(voc)
        {
            $scope.vocabulary           = voc;
        });  
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
            var record_relpath = $scope.relpath + "/training_" + StringSrv.formatDate();
            return SequencesRecordingSrv.calculateSequence( sentences, 
                                                            $scope.selectedTrainingModality.value, 
                                                            $scope.repetitionsCount, 
                                                            record_relpath,
                                                            true)                      //  add #repetition to file name
            .then(function(sequence)
            {
                $scope.training_sequence = sequence;    
                $state.go('record_sequence', {modeId:EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING, sentenceId: 0, successState:$scope.successState, cancelState:$scope.cancelState});
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
controllers_module.controller('TrainingCtrl', TrainingCtrl)
