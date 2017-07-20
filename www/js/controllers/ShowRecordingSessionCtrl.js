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
function ShowRecordingSessionCtrl($scope, $ionicPopup, $state, $ionicPlatform, InitAppSrv, VocabularySrv, FileSystemSrv, MfccSrv, SubjectsSrv)
{
    $scope.pluginInterface      = InitAppSrv.getPlugin();        
    $scope.plugin_enum          = $scope.pluginInterface.ENUM.PLUGIN; 
    
    $scope.subject              = null;
    
    $scope.initMfccParams       = {"nDataDest": $scope.plugin_enum.MFCC_DATADEST_FILE,
                                   "nDataType": $scope.plugin_enum.MFCC_DATATYPE_MFFILTERS};  //write FILTERS to FILE
    
    $scope.nFiles               = 0;    // count number of audio within the session
    $scope.nCurFile             = 0;    // indicates the number of the currently processed file
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("training");
        }, 100);         
        
        $scope.nFiles               = 0;
        $scope.mfccCfg              = MfccSrv.init($scope.initMfccParams).mfccCfg;
        
        if(data.stateParams.sessionPath != null)    $scope.relpath = data.stateParams.sessionPath;
        else
        {
            if($scope.subject)
                $scope.relpath    = InitAppSrv.getAudioFolder();
            else
                $scope.relpath    = InitAppSrv.getAudioFolder() + "/" + $scope.subject.folder;            
        }
        
        // optional param
        if(data.stateParams.subjId != null)
        {
            $scope.subject_id      = parseInt(data.stateParams.subjId);
            $scope.subject         = SubjectsSrv.getSubject($scope.subject_id);
        }        
        
        VocabularySrv.getTrainVocabulary()
        .then(function(vocabulary){
            $scope.vocabulary = vocabulary;
            $scope.refreshAudioList();
        })
        .catch(function(error){
            alert(error.message);
        });
        
    });

    $scope.$on('$ionicView.leave', function(){
        $scope.deregisterFunc();
    });     
    
    $scope.refreshAudioList = function()
    {
        if($scope.subject)
        {
            return SubjectsSrv.getSubjectVocabularyFiles($scope.vocabulary, $scope.relpath)
            .then(function(session_vocabulary)
            {
                $scope.subject.vocabulary = session_vocabulary;
                $scope.nFiles = $scope.getFilesNum(session_vocabulary);
                $scope.$apply();
            })        
            .catch(function(error){
                $scope.showAlert("Error", error.message);
            });                
        }
        else
        {
            return VocabularySrv.getTrainVocabularyFiles($scope.relpath)
            .then(function(session_vocabulary)
            {
                $scope.vocabulary = session_vocabulary;
                $scope.nFiles = $scope.getFilesNum(session_vocabulary);
                $scope.$apply();
            })        
            .catch(function(error){
                $scope.showAlert("Error", error.message);
            });
        }
    };
    
    $scope.calcPerc = function(cur, total)
    {
        return Math.round((cur/total)*100);
    }
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

        window.addEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.addEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
        window.addEventListener('pluginError'       , $scope.onMFCCError);

        MfccSrv.getMFCCFromFolder(  $scope.relpath, 
                                    $scope.mfccCfg.nDataType,
                                    $scope.mfccCfg.nDataDest);
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
    
    // manage pluginevents
    $scope.onMFCCProgressFolder = function(res){
        $scope.resetExtractFeatures();
        console.log(res);        
    }
    
    $scope.onMFCCProgressFile = function(res){
        $scope.nCurFile++;
        if($scope.nCurFile < $scope.nFiles) cordova.plugin.pDialog.setProgress({value:$scope.nCurFile});
        else                                $scope.resetExtractFeatures();
        
        console.log("ShowRecordingSessionCtrl::onMFCCProgressFile : " + res);
    };
    
    $scope.resetExtractFeatures = function()
    {
        cordova.plugin.pDialog.dismiss();
        window.removeEventListener('mfccprogressfile'  , $scope.onMFCCProgressFile);
        window.removeEventListener('mfccprogressfolder', $scope.onMFCCProgressFolder);
        window.removeEventListener('pluginerror'       , $scope.onMFCCError);  
    };
    
    $scope.onMFCCError = function(res){
        console.log("ShowRecordingSessionCtrl::onMFCCProgressFile : " + res);
    }
    //==============================================================================================================================
    //==============================================================================================================================
    //==============================================================================================================================
    $scope.deleteSession = function() {
        
        $ionicPopup.confirm({ title: 'Warning', template: 'You are deleting the current subject recording SESSION, are you sure ?'}).then(function(res) 
        {
            if (res){
                FileSystemSrv.deleteDir($scope.relpath)
                .then(function(){
                     $state.go("subject", {subjId:$scope.subject.id});       
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
controllers_module.controller('ShowRecordingSessionCtrl', ShowRecordingSessionCtrl)
