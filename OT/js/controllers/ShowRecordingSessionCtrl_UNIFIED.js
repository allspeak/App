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
function ManageRecordingsCtrl($scope, $ionicPopup, $state, $ionicPlatform, InitAppSrv, VocabularySrv, FileSystemSrv, MfccSrv, SubjectsSrv)
{
    $scope.subject              = null;     // stay null in AllSpeak
    $scope.sessionName          = "";

    $scope.nFiles               = 0;    // count number of audio within the session
    $scope.nCurFile             = 0;    // indicates the number of the currently processed file
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("training");
        }, 100);         
        
        //------------------------------------------------------------------------------------------
        $scope.pluginInterface      = InitAppSrv.getPlugin();        
        $scope.plugin_enum          = $scope.pluginInterface.ENUM.PLUGIN;
        
        $scope.initMfccParams       = {"nDataDest": $scope.plugin_enum.MFCC_DATADEST_FILE,
                                       "nDataType": $scope.plugin_enum.MFCC_DATATYPE_MFFILTERS,  //write FILTERS to FILE        
                                       "nProcessingScheme": $scope.plugin_enum.MFCC_PROCSCHEME_F_S_PP_CTX};  //    
        $scope.nFiles               = 0;
        $scope.mfccCfg              = MfccSrv.init($scope.initMfccParams).mfccCfg;
        
        if(data.stateParams.sessionPath != null) $scope.sessionName = data.stateParams.sessionPath;
        else
        {
            alert("ManageRecordingsCtrl::$ionicView.enter. error : foldername is empty");
            $state.go("training");
        }
        
        if(data.stateParams.subjId != null)
        {
            if(Number.isInteger(data.stateParams.subjId))
            {
                // we are in AllSpeakVoiceRecorder => stateParams.subjId is really an integer
                $scope.subject_id      = parseInt(data.stateParams.subjId);
                $scope.subject         = SubjectsSrv.getSubject($scope.subject_id);
                $scope.relpath         = InitAppSrv.getAudioFolder() + "/" + $scope.subject.folder + "/" + $scope.sessionName;   
            }
            else
            {
                // we are in AllSpeak, stateParams.subjId is actually a string with the name of the training scheme
                $scope.relpath         = InitAppSrv.getAudioFolder() + "/" + data.stateParams.subjId + "/" + $scope.sessionName;  
            }
        }        
        
        VocabularySrv.getTrainVocabulary()
        .then(function(vocabulary)
        {
            $scope.vocabulary = vocabulary.vocabulary;
            $scope.refreshAudioList();
        })
        .catch(function(error){
            alert("ManageRecordingsCtrl::$ionicView.enter => " + error.message);
        });
        
    });

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    });     
    
    $scope.refreshAudioList = function()
    {
        if($scope.subject)
        {
            return SubjectsSrv.getSubjectVocabularyFiles($scope.vocabulary, $scope.relpath)
            .then(function(session_vocabulary)
            {
                $scope.subject.vocabulary   = session_vocabulary;
                $scope.nFiles               = $scope.getFilesNum(session_vocabulary);
                $scope.$apply();
            })        
            .catch(function(error){
                $scope.showAlert("Error", "ManageRecordingsCtrl::refreshAudioList => " + error.message);
            });                
        }
        else
        {
            return VocabularySrv.getTrainVocabularyFiles($scope.relpath)
            .then(function(session_vocabulary)
            {
                $scope.vocabulary   = session_vocabulary;
                $scope.nFiles       = $scope.getFilesNum(session_vocabulary);
                $scope.$apply();
            })        
            .catch(function(error){
                $scope.showAlert("Error", "ManageRecordingsCtrl::refreshAudioList => " + error.message);
            });
        }
    };
    
    $scope.calcPerc = function(cur, total)
    {
        return Math.round((cur/total)*100);
    };
    
    $scope.getFilesNum = function(vocabulary)
    {
        var cnt = 0;
        for(var f=0; f<vocabulary.length; f++)
            if(vocabulary[f].existwav)
                cnt = cnt + vocabulary[f].files.length;
        return cnt;
    };
    //==============================================================================================================================
    $scope.extractFeatures = function() 
    {  
        $scope.nCurFile             = 0;

        var overwrite_existing_files= false;
        
        return $ionicPopup.confirm({ title: 'Attenzione', template: 'Vuoi sovrascrivere i file esistenti?'})
        .then(function(res) 
        {
            if (res) overwrite_existing_files = true; 
        
            window.addEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
            window.addEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
            window.addEventListener('pluginError'       , $scope.onMFCCError);
//
//            $scope.relpath  = "AllSpeakVoiceRecorder/audiofiles/allcontrols/allcontrols";  // debug code to calc cepstra in a huge folder
//            $scope.nFiles   = 2385;
//
//            $scope.relpath  = "AllSpeakVoiceRecorder/audiofiles/allpatients/allpatients";  // debug code to calc cepstra in a huge folder
//            $scope.nFiles   = 1857;
//
            $scope.relpath  = "AllSpeakVoiceRecorder/audiofiles/newpatients/newpatients";  // debug code to calc cepstra in a huge folder
            $scope.nFiles   = 907;

            if(MfccSrv.getMFCCFromFolder(   $scope.relpath, 
                                            $scope.mfccCfg.nDataType,
                                            $scope.plugin_enum.MFCC_DATADEST_FILE,
                                            overwrite_existing_files))          // does not overwrite existing (and valid) mfcc files
            {
                cordova.plugin.pDialog.init({
                    theme : 'HOLO_DARK',
                    progressStyle : 'HORIZONTAL',
                    cancelable : true,
                    title : 'Please Wait...',
                    message : 'Extracting CEPSTRA filters from folder \'s files...',
                    max : $scope.nFiles
                });
                cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
            }
        });
    
    };
    
    // manage pluginevents
    $scope.onMFCCProgressFolder = function(res){
        $scope.resetExtractFeatures();
        console.log(res);        
    }
    
    $scope.onMFCCProgressFile = function(res){
        $scope.nCurFile++;
        if($scope.nCurFile < $scope.nFiles) cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
        else                                $scope.resetExtractFeatures();
        
        console.log("ManageRecordingsCtrl::onMFCCProgressFile : " + res);
    };
    
    $scope.resetExtractFeatures = function()
    {
        cordova.plugin.pDialog.dismiss();
        window.removeEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.removeEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
        window.removeEventListener('pluginerror'       , $scope.onMFCCError);  
    };
    
    $scope.onMFCCError = function(res){
        console.log("ManageRecordingsCtrl::onMFCCProgressFile : " + res);
    }
    //==============================================================================================================================
    //==============================================================================================================================
    //==============================================================================================================================
    $scope.deleteSession = function() {
        
        $ionicPopup.confirm({ title: 'Warning', template: 'You are deleting the current subject recording SESSION, are you sure ?'}).then(function(res) 
        {
            if (res){
                FileSystemSrv.deleteDir($scope.relpath)
                .then(function()
                {
                    if($scope.subject)  $state.go("subject", {subjId:$scope.subject.id});       
                    else                $state.go("training");    
                })
                .catch(function(error){
                    alert(error.message);
                });
            }
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
controllers_module.controller('ManageRecordingsCtrl', ManageRecordingsCtrl)
