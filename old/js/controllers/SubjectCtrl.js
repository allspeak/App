/* 
 *  Show subject info and list sentences with at least one recording ....allows deleting the subject and record a new/existing sentence
 *  
    "subjects":
    [
        { "label": "Mario Rossi", "id": 1, "age": 91, "description: "abcdefghil", "vocabulary": [
            { "title": "Ho sete", "id": 1, "label": "ho_sete", "filename": "ho_sete.wav", "existwav": 0 },
            { "title": "Chiudi la porta", "id": 2, "label": "chiudi_porta", "filename" : "chiudi_porta.wav", "existwav": 0}
        ]},
        ........
    ]
 */
function SubjectCtrl($scope, $ionicModal, $ionicPopup, $state, SubjectsSrv, InitAppSrv, VocabularySrv, FileSystemSrv, TrainingSrv)
{
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.user                 = {"sentenceids2betrained" : []};
        $scope.selected_sentence    = {"value": null};
        
        $scope.training_modalities  = TrainingSrv.getModalities();
        $scope.repetitionsCount     = TrainingSrv.getRepetitions();
    
        VocabularySrv.getVocabulary()
        .then(function(vocabulary){
            $scope.vocabulary   = vocabulary;
            $scope.subject      = SubjectsSrv.getSubject(data.stateParams.subjId);
            if ($scope.subject) return $scope.refreshAudioList();
            return null;
        })
        .catch(function(error){
            alert(error.message);
        });
        
    });
    
    $scope.refreshAudioList = function()
    {
        SubjectsSrv.getSubjectVocabularyFiles($scope.vocabulary, $scope.subject.label, InitAppSrv.appData.file_system.audio_folder)
        .then(function(vocabulary){
            $scope.subject.vocabulary = vocabulary;
            $scope.$apply();
        })
        .catch(function(error){
//            boh...error sembra un oggetto ma non va il var in
//            var msg=""; for (var e in error) { msg = msg + " " + e + ":" + error[e] + ";"; }
            $scope.showAlert("Error", error.message);
        });
    };
    //==============================================================================================================================
    //==============================================================================================================================
    //==============================================================================================================================
    // add new sentence to record
    $ionicModal.fromTemplateUrl('templates/popNewSentence.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.modalRecordSentence = modal;
    });
    
    $scope.addSentence = function() {
        $scope.modalRecordSentence.show();
    };

    $scope.selectSentence = function(sentence_obj) {
        $scope.modalRecordSentence.hide();
        if (sentence_obj)   $state.go('sentence', {sentenceId:sentence_obj.value, subjId:$scope.subject.id});
        else                alert("non hai scelto nessuna frase da registrare");
    };
    //==============================================================================================================================
    //==    TRAINING SENTENCE SEQUENCES    =========================================================================================
    //==============================================================================================================================
    $scope.training_sequence    = [];
    
    // add new sentences to train
    $ionicModal.fromTemplateUrl('templates/popTrainVocabulary.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.modalTrainSentence = modal;
    });
    
    $scope.addSequence = function() {
        $scope.selectedTrainingModality    = $scope.selectObjByValue(1, $scope.training_modalities);
        $scope.modalTrainSentence.show();
    };
    
    $scope.checkAll = function() {
        $scope.user.sentenceids2betrained = $scope.vocabulary.map(function(item) { return item.id; });
    };
    
    $scope.uncheckAll = function() {
        $scope.user.sentenceids2betrained = [];
    };    
    
    $scope.decrementRepCount = function() {
        $scope.repetitionsCount--;
        if($scope.repetitionsCount < 1) $scope.repetitionsCount = 1;
    };
    
    $scope.incrementRepCount = function() {
        $scope.repetitionsCount++;
    };    
    
    $scope.startTraining = function() {
        $scope.modalTrainSentence.hide();
        if ($scope.user.sentenceids2betrained.length){
            $scope.training_sequence = TrainingSrv.calculateTrainingSequence($scope.user.sentenceids2betrained, $scope.selectedTrainingModality.value, $scope.repetitionsCount, $scope.subject.folder);
            $state.go('record_sequence', {sequenceId:  0, subjId:$scope.subject.id });
        }
        else
            alert("non hai scelto nessuna frase da addestrare");
    };
    

     // used to select default comobobox value
    $scope.selectObjByValue = function(value, objarray)
    {
        var len = objarray.length;
        for (i=0; i<len; i++) 
           if(objarray[i].value == value)
               return objarray[i];
    };     
    //==============================================================================================================================
    //==============================================================================================================================
    //==============================================================================================================================
    $scope.deleteSubject = function() {
        SubjectsSrv.deleteSubject($scope.subject.id, InitAppSrv.appData.file_system.audio_folder)
        .then(function(){
             $state.go("subjects");       
        })
        .catch(function(error){
            alert(error.message);
        });
    };
    
    //-------------------------------------------------------------------------    
    $scope.showAlert = function(title, message) {
        var alertPopup = $ionicPopup.alert({
            title: title,
            template: message
        });
    };

};
controllers_module.controller('SubjectCtrl', SubjectCtrl)
