/* 
Manage a sequence of sentences to be recorded (soon trained)
sequence can be created :
    1)  by sentences blocks     ( s1r1, s1r2,s1r3,...,s2r1,s2r2,s2r3,...)
    2)  by repetition blocks    ( s1r1, s2r1,s3r1,...,s1r2,s2r2,s3r2,...)

it provides curr_sequence_id
 */


function SequencesRecordingSrv($q, FileSystemSrv, InitAppSrv, CommandsSrv, EnumsSrv, StringSrv)
{
    var sequence            = [];   // array of sentences to be recorded
    var repetitionOrder     = EnumsSrv.RECORD.BY_REPETITIONS;    // by repetitions....blocks of nsentences repetitions S1R1, S2R1, SnR1,....., S1Rm,..SnRm
    var sequenceMode        = EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_APPEND;
    var repetitions         = EnumsSrv.RECORD.SESSION_MIN_REPETITIONS;
    var curr_sequence_id    = 0;
    
    var destDir             = "";       // final folder to store recorded repetitions == recordings
    
    var separator_filename_rep = "_";
    
    var training_modalities  = [{"label": "by sentences", "value":EnumsSrv.RECORD.BY_SENTENCE},
                                {"label": "by repetitions", "value":EnumsSrv.RECORD.BY_REPETITIONS}];    

    // replace mode vars
    var backupDir           = "";   // folder to store replaced repetitions
    var sourceDir           = "";   // coincides with recordings (append) or recordings/temp/temp_XXXXXX (replace)
    
    // sentences            : [{nrepetitions:int, files:["filename.wav", ""], firstAvailableId:int, id:int, title:String}] 
    // mode                 : RECORD.BY_REPETITIONS | RECORD.BY_SENTENCE
    // sessrep              : define number of repetitions that must have the full session. 
    //                        It plans to record as much repetitions to reach this number. Thus default behavior is to complete a session
    // rel_folder_root      : determined file name : rel_folder_root + "/"+ file_prefix + separator_filename_rep + sentence.id.toString();
    // appendRepetitions    : [true] determine whether append current session with new repetitions OR substitute existing one with
    // file_prefix          : ["audio"] define file prefix 
    // add_rep_cnt          : [true] indicates whether append file name with _REPNUM 
    // 
    // RETURNS:             [{"id":int, "rel_filepath":string, "title":string}]
    calculateSequence = function(sentences, rep_mode, sessrep, rel_folder_root, seq_mode, file_prefix, add_rep_cnt)
    {
        _clear();

        var new_folder  = false;
        var nsentences  = sentences.length;
        destDir         = rel_folder_root;      // AllSpeak/recordings
        repetitionOrder = rep_mode;
                
        if(seq_mode == null)            sequenceMode        = EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_APPEND;
        else                            sequenceMode        = seq_mode;
        
        if(file_prefix == null)         file_prefix         = "audio";
        if(add_rep_cnt == null)         add_rep_cnt         = true;
       
        if(!add_rep_cnt && sessrep > 1)
        {
            alert("Errore Interno: tentativo di fare piu ripetizioni con lo stesso nome")
            return null;
        }
        
        // in case of replace mode, I create a brand new session in a temp folder
        if(sequenceMode == EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_REPLACE)
        {
            for(var s=0; s<sentences.length; s++)
            {
                sentences[s].firstAvailableId   = 0;
                sentences[s].nrepetitions       = 0;
            }
            var date = StringSrv.formatDate();
            
            backupDir = InitAppSrv.getAudioBackupFolder() + "/backup_" + date;  // AllSpeak/recordings/backup/backup_XXXXXX
            sourceDir = InitAppSrv.getAudioTempFolder() + "/temp_" + date;      // AllSpeak/recordings/temp/temp_XXXXXX
            // destDir is AllSpeak/recordings
        }
        else  sourceDir = destDir;  
            

        return FileSystemSrv.existDir(sourceDir)
        .then(function(exist)
        {
            if(!exist) new_folder = true;   // if new, delete it in catch 
            return FileSystemSrv.createDir(sourceDir) // create dir preserving it in casa already exist
        })       
        .then(function()
        {
            if(repetitionOrder == EnumsSrv.RECORD.BY_REPETITIONS)
            { 
                // by repetitions: 
                for(var r = 0; r < sessrep; r++)
                {
                    for(var s = 0; s < nsentences; s++)
                    {
                        var sentence        = sentences[s];
                        if(sentence == null) continue;
                        var curr_rep        = sentence.nrepetitions + r;
                        if(curr_rep > (sessrep-1))   continue;
                        else
                        {
                            var rep_id          = (parseInt(sentence.firstAvailableId) + r).toString();
                            var rel_filepath    = sourceDir + "/"+ file_prefix + separator_filename_rep + sentence.id.toString();
                            if(add_rep_cnt)     rel_filepath += separator_filename_rep + rep_id + EnumsSrv.RECORD.FILE_EXT;
                            else                rel_filepath += EnumsSrv.RECORD.FILE_EXT;

                            sequence.push({"id": sentence.id, "rel_filepath":rel_filepath, "title":sentence.title});
                        }
                    }
                }                
            }
            else
            {
                // by sentence
                for(s = 0; s < nsentences; s++)
                {
                    var sentence = sentences[s];
                    if(sentence == null) continue;
                    for(r = 0; r < sessrep; r++)
                    {
                        var curr_rep = sentence.nrepetitions + r;
                        if(curr_rep > (sessrep-1))   continue;                    
                        else
                        {
                            var rep_id          = (parseInt(sentence.firstAvailableId) + r).toString();
                            var rel_filepath    = sourceDir + "/"+ file_prefix + separator_filename_rep + sentence.id.toString();
                            if(add_rep_cnt)     rel_filepath += separator_filename_rep + rep_id + EnumsSrv.RECORD.FILE_EXT;
                            else                rel_filepath += EnumsSrv.RECORD.FILE_EXT;

                            sequence.push({"id": sentence.id, "rel_filepath":rel_filepath, "title":sentence.title});
                        }
                    }
                }
            }
            return sequence;    // unused in the controller
        })
        .catch(function(error)
        {
            if(new_folder)  FileSystemSrv.deleteDir(rel_folder_root);
            alert(error.message);
            return null;
        });
    };

    // sentences            : [{nrepetitions:int, files:["filename.wav", ""], firstAvailableId:int, id:int, title:String}] 
    // rel_folder_root      : determined file name : rel_folder_root + "/"+ file_prefix + separator_filename_rep + sentence.id.toString();
    // file_prefix          : ["audio"] define file prefix 
    // RETURNS:             [{"id":int, "rel_filepath":string, "title":string}]
    calculateVBSequence = function(sentences, rel_folder_root, file_prefix)
    {
        _clear();

        var nsentences          = sentences.length;
        if(file_prefix == null) file_prefix         = "vb";
        
        for(var s = 0; s < nsentences; s++)
        {
            var sentence        = sentences[s];
            if(sentence == null) continue;
            
            var rel_filepath    = rel_folder_root + "/"+ file_prefix + separator_filename_rep + sentence.id.toString() + EnumsSrv.RECORD.FILE_EXT;
            sequence.push({"id": sentence.id, "rel_filepath":rel_filepath, "title":sentence.title});
        }
        return sequence;    // unused in the controller
    };

    // it manage sequence progression. 
    // returns :
    // - next sequence 
    // - if sequence is finished : -1 (APPEND) mergeDirs and then -1 (REPLACE)

    getNextSentenceId = function()
    {
        curr_sequence_id++;
        if(curr_sequence_id >= sequence.length)
        {
            // sequence terminated. 
            if(sequenceMode == EnumsSrv.RECORD.MODE_SEQUENCE_TRAINING_REPLACE)
            {
                // merge this temp session with the current one
                // I get a recordings/temp/temp_XXXXXX, I must backup to recordings/backup/backup_XXXXXX
                return mergeDirs()
                .then(function()
                {
                    return -1;
                })
                .catch(function(error)
                {
                    return $q.reject(error)
                });
            }
            else return Promise.resolve(-1);
        }
        else  return Promise.resolve(curr_sequence_id);
    };
    
    mergeDirs = function()
    {
        return CommandsSrv.mergeDirs(sourceDir, destDir, backupDir);
    };
    // ======== UNUSED !!!!!!! ====================================================================================
    // for each command, get the highest recorded repetition IDs (+1). New repetitions will start from that Id
//    calculateFirstAvailableRepetitions = function(sentences, rel_folder_root)
//    {
//        return FileSystemSrv.listFilesInDir(rel_folder_root)
//        .then(function(files)               // files = [wav file names with extension]
//        {
//            var len     = sentences.length;
//            var lastIDs = [];
//            for(var s=0; s<len; s++)
//                lastIDs[s] =  CommandsSrv.getFirstAvailable(sentences[s], files);
//            return lastIDs;
//        })         
//        .catch(function(error){
//            return $q.reject(error);
//        }); 
//    };
    
    getSequenceLength = function()
    {
        return sequence.length;
    };
    
    getRepetitions = function()
    {
        return repetitions;
    };
    
    getModalities = function()
    {
        return training_modalities;
    };
    
    getNextSentence = function()
    {
        curr_sequence_id++;
        return getSentenceBySequenceId(curr_sequence_id);
    };
    
    getSentenceBySequenceId = function(seq_id)
    {
        if(seq_id >= sequence.length) return null;
        else                          return sequence[curr_sequence_id];
    };
    
    getSentenceById = function(sentence_id)
    {
        for(se=0; se<sequence.length; se++)
        {
            if(sequence[se].id == parseInt(seq_id))
                return sequence[se];
        }            
        return null;
    };
    
    
    getSeparator = function()
    {
        return separator_filename_rep;
    };
    
    //================================================================================
    // PRIVATE
    //================================================================================
    _clear = function()
    {
        sequence = [];
        curr_sequence_id    = 0;        
    };    
    //================================================================================
    return {
        calculateSequence: calculateSequence,
        calculateVBSequence: calculateVBSequence,
        mergeDirs: mergeDirs,
        getRepetitions: getRepetitions,
        getModalities: getModalities,
        getNextSentence: getNextSentence,
        getNextSentenceId: getNextSentenceId,
        getSentenceById: getSentenceById,
        getSentenceBySequenceId: getSentenceBySequenceId,
        getSequenceLength: getSequenceLength,
        getSeparator: getSeparator
    };
};


main_module.service('SequencesRecordingSrv', SequencesRecordingSrv);

 