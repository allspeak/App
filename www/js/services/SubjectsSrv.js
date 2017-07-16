/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function SubjectsSrv($http, $q, FileSystemSrv, StringSrv)
{
    var subjects                = null;
    var subjects_json_relpath   = ""; //'./json/vocabulary.json';
//    var subjects_relpath        = "";
    
    
    getSubjects = function (path) {
        if (path)
            subjects_json_relpath = path;

//        if (subjects) return Promise.resolve(subjects);
        return FileSystemSrv.readJSON(subjects_json_relpath)
        .then(function(content){
            subjects = content.subjects;
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
        for(se=0; se<subject.vocabulary.length; se++)
        {
            if(subject.vocabulary[se].id == parseInt(sentence_id))
                return subject.vocabulary[se];
        }            
        return null;
    };    
    
    
    getSubjectVocabularyFiles = function(vocabulary, relpath)    // return filesname without extension
    {
        return getSubjectAudioFiles(relpath)
        .then(function(files){
            // I get only wav file names without extension
            return parseVocabularyFiles(vocabulary, files);// writes subject.vocabulary[:].files[]
        })
        .catch(function(error){
            return $q.reject(error);
        });         
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
    
    // return filesname without extension
    getSubjectSentenceAudioFiles = function(sentence, relpath){    
        if (sentence == null)
            return null;
        
        return getSubjectAudioFiles(relpath)
        .then(function(files){
            // I get only wav file names without extension
            return parseSentenceFiles(sentence, files);// writes subject.vocabulary[:].files[]
        })
        .catch(function(error){
            return $q.reject(error);
        });       
    };    
    
    
    parseVocabularyFiles = function(vocabulary, files)
    {
        for (s=0; s<vocabulary.length; s++)
            vocabulary[s] = parseSentenceFiles(vocabulary[s], files);
        
        return vocabulary;
    };     
    
    // files is: wav file list without extension
    parseSentenceFiles = function(sentence, files)
    {
        sentence.existwav       = 0;
        sentence.firstValidId   = 0;
        sentence.files          = [];

        var len_files           = files.length;
        var max                 = 0;
        for (f=0; f<len_files; f++)
        {
            var filelabel_number = StringSrv.splitStringNumber(files[f]);
            
            if(!filelabel_number[0].length || filelabel_number.length == 1)
                return null;
            
            if(filelabel_number[0] == sentence.label)
            {
                var id = filelabel_number[1];
                if(id > max )   
                    max = id;
                
                sentence.files[sentence.existwav] = {label: files[f]};
                sentence.existwav++;
                sentence.firstValidId = max + 1;
            }
        }
        return sentence;
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
    deleteSubject = function(subject_id, audio_folder){

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
                return FileSystemSrv.deleteDir(audio_folder + "/" + dir2delete); /// mettere anche audiofolder......non trova la cartella ma non dice niente...malissimo
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
    
    insertSubject = function(subject, root_folder){
        subject.vocabulary  = [];
        subject.folder      = StringSrv.format2filesystem(subject.label);
        
        return getHighestID()
        .then(function(id){
            subject.id = id + 1;
            subjects.push(subject);
            return setSubjects(subjects);
        })
        .then(function(success){
            return FileSystemSrv.createDir(root_folder + "/" + subject.folder);
        })      
        .catch(function(error){
           return $q.reject(error);
        });         
    };
    
    setSubjects = function (arrsubjects) {
        var json = {"subjects" : arrsubjects};
        return FileSystemSrv.overwriteFile(subjects_json_relpath, JSON.stringify(json))
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
    
    //================================================================================
    // public interface
    //================================================================================
    return {
        setSubjects: setSubjects,
        getSubjects: getSubjects, 
        createSubjectsFile: createSubjectsFile,
        insertSubject: insertSubject, 
        deleteSubject: deleteSubject, 
        getSubject: getSubject,
        getSubjectFolder: getSubjectFolder,
        getSubjectSentence: getSubjectSentence,
        getHighestID: getHighestID,
        getSubjectAudioFiles: getSubjectAudioFiles,
        getSubjectVocabularyFiles: getSubjectVocabularyFiles,
        getSubjectSentenceAudioFiles: getSubjectSentenceAudioFiles
    };
};


main_module.service('SubjectsSrv', SubjectsSrv);

 