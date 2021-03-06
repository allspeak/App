/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function SubjectsSrv($http, $q, FileSystemSrv, StringSrv, VocabularySrv, CommandsSrv)
{
    var subjects                = null;
    var initSubjectsJson        = {"subjects" : []}

    var tempsubjects            = null;     // used to store subjects while performing ops on it.
    // values taken by defaults.json
    var subjects_filerel_path   = "";   // AllSpeak/json/subjects.json
    var recordings_folder   = "";            // AllSpeak/audiofiles
    
    //-----------------------------------------------------------------------------------------------------------------
    init = function(default_paths)
    {
        subjects_filerel_path   = default_paths.subjects_filerel_path;
        recordings_folder         = default_paths.recordings_folder;
        
        return FileSystemSrv.existFile(subjects_filerel_path)
        .then(function(exist){
            if(exist)   return getSubjects();
            else        return FileSystemSrv.createFile(subjects_filerel_path, JSON.stringify(initSubjectsJson)); 
        })
        .catch(function(error){
            return $q.reject(error);            
        });        
    };
    //-----------------------------------------------------------------------------------------------------------------
    // read from json and return it
    getSubjects = function (path) 
    {
        if (path)  subjects_filerel_path = path;

        if (subjects) return Promise.resolve(subjects);
        
        return FileSystemSrv.readJSON(subjects_filerel_path)
        .then(function(content)
        {
            subjects = content.subjects;
            return subjects;
        });
    };

    updateSubjects = function () 
    {
        subjects = [];
        return FileSystemSrv.listDir(recordings_folder)
        .then(function(folders)
        {
            for(var f=0; f<folders.length; f++)
                if(folders[f].name != "temp")   
                    insertSubject({"label":folders[f]})
            return subjects;
        })
        .catch(function(error)
        {
            alert("Error while updating subjects: " + error.toString());
            subjects = tempsubjects;
            return subjects;
        });
    };
    
    updateSubjects = function () 
    {
        subjects = [];
        return FileSystemSrv.listDir(recordings_folder)
        .then(function(folders)
        {
            for(var f=0; f<folders.length; f++)
                if(folders[f].name != "temp")   
                    insertSubject({"label":folders[f]})
            return subjects;
        })
        .catch(function(error)
        {
            alert("Error while updating subjects: " + error.toString());
            subjects = tempsubjects;
            return subjects;
        });
    };
    
    updateSubjects = function () 
    {
        subjects = [];
        return FileSystemSrv.listDir(recordings_folder)
        .then(function(folders)
        {
            for(var f=0; f<folders.length; f++)
                if(folders[f].name != "temp")   
                    insertSubject({"label":folders[f]})
            return subjects;
        })
        .catch(function(error)
        {
            alert("Error while updating subjects: " + error.toString());
            subjects = tempsubjects;
            return subjects;
        });
    };
    
    getHttpSubjects = function (path) {
        return $http.get(path)
        .then(function(res){
            return res.data.subjects;
        });
    },    
    
    getSubject = function (subject_id) {
           
        if (subject_id == null || subjects == null)
            return null;

        for(s=0; s<subjects.length; s++)
        {
            if(subjects[s].id == parseInt(subject_id))
                return subjects[s];
        }
        return null;
    };
    
    getSubjectSentence = function (subject_id, sentence_id) {
           
        if (subject_id == null || sentence_id == null || subjects == null)
            return null;

        var subject = getSubject(subject_id);
        for(se=0; se<subject.commands.length; se++)
        {
            if(subject.commands[se].id == parseInt(sentence_id))
                return subject.commands[se];
        }            
        return null;
    };    
    
    // get files from subject (sub)folder and remove extension
    getSubjectAudioFiles = function(relpath)    
    {
        if (subjects == null)
            return null;

        return FileSystemSrv.listFilesInDir(relpath, ["wav"])
        .then(function(files){
            var len = files.length;
            for (f=0; f<len; f++)
               files[f] = StringSrv.removeExtension(files[f]);
            return files;
        })
        .catch(function(error){
            return $q.reject(error);
        });   
    };
        
    getSubjectVocabularyFiles = function(commands, relpath)    // return filesname without extension
    {
        if (commands == null)
            return null;
        
        return getSubjectAudioFiles(relpath)
        .then(function(files){
            // I get only wav file names without extension
            return CommandsSrv.updateCommandsFiles(commands, files);// writes subject.commands[:].files[]
        })
        .catch(function(error){
            return $q.reject(error);
        });         
    };
    
    // return filesname without extension
    getSubjectSentenceAudioFiles = function(sentence, relpath)
    {    
        if (sentence == null)
            return null;
        
        return getSubjectAudioFiles(relpath)
        .then(function(files){
            // files = [wav file names without extension]
            return VocabularySrv.updateSentenceFiles(sentence, files);// writes subject.commands[:].files[]
        })
        .catch(function(error){
            return $q.reject(error);
        });       
    };    

    getHighestID = function(){
        return getSubjects()
        .then(function(subjects){
            var max         = 0;
            var len_subjs   = subjects.length;
            for(s=0; s<len_subjs; s++){
                if(subjects[s].id > max) max = subjects[s].id;
            }
            return max;
        });
    };
    /* aim      : remove a subject;remove element from service array, update json, remove folder
     * params   : subject unique id
     * returns  : updated subjects array
     * called by: subjectCtrl
     */
    deleteSubject = function(subject_id, recordings_folder){

        var len_subjs   = subjects.length;
        var id          = -1;
        for(s=0; s<len_subjs; s++){
            if(subjects[s].id == subject_id){
                id = s;
            }
        }
        var dir2delete = subjects[id].folder;
        if(id > -1)
        {
            subjects.splice(id, 1);
            return setSubjects(subjects)
            .then(function(){
                return FileSystemSrv.deleteDir(recordings_folder + "/" + dir2delete); /// mettere anche audiofolder......non trova la cartella ma non dice niente...malissimo
            })
            .then(function(){
                return subjects;
            })
            .catch(function(error){
               return $q.reject(error);
            });          
        }
        else        return $q.reject({"message": "subject id not found....very bad error!"});
    };
    
    // update array and writes
    insertSubject = function(subject)
    {
        subject.commands  = [];
        subject.folder      = StringSrv.format2filesystem(subject.label);
        subject.path        = recordings_folder + "/" + subject.folder;
        
        return getHighestID()
        .then(function(id){
            subject.id = id + 1;
            subjects.push(subject);
            return setSubjects(subjects);
        })
        .then(function(success){
            return FileSystemSrv.createDir(subject.path);
        })      
        .catch(function(error){
           return $q.reject(error);
        });         
    };
    
    setSubjects = function (arrsubjects) {
        var json = {"subjects" : arrsubjects};
        return FileSystemSrv.overwriteFile(subjects_filerel_path, JSON.stringify(json))
        .then(function(){
            return 1;
        });
    };
    
    getSubjectFolder = function(subject_id){
        return getSubject(subject_id).folder;
    };
    
    createSubjectsFile = function(){
        var subjects = {"subjects" : []};
    };
    
    validateSubject = function(new_subject)
    {
        var len = subjects.length;
        for (s=0; s<len; s++){
           if(subjects[s].label == new_subject.label)
               return 0;
        }
        return 1;
    };     
    //================================================================================
    // public interface
    //================================================================================
    return {
        init: init,
        setSubjects: setSubjects,
        getSubjects: getSubjects, 
        updateSubjects: updateSubjects, 
        createSubjectsFile: createSubjectsFile,
        insertSubject: insertSubject, 
        deleteSubject: deleteSubject, 
        getSubject: getSubject,
        getSubjectFolder: getSubjectFolder,
        getSubjectSentence: getSubjectSentence,
        getHighestID: getHighestID,
        getSubjectAudioFiles: getSubjectAudioFiles,
        getSubjectVocabularyFiles: getSubjectVocabularyFiles,
        getSubjectSentenceAudioFiles: getSubjectSentenceAudioFiles,
        validateSubject: validateSubject
    };
};


main_module.service('SubjectsSrv', SubjectsSrv);

 