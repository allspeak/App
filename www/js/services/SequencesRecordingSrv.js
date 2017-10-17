/* 
Manage a sequence of sentences to be recorded (soon trained)
sequence can be created :
    1)  by sentences blocks     ( s1r1, s1r2,s1r3,...,s2r1,s2r2,s2r3,...)
    2)  by repetition blocks    ( s1r1, s2r1,s3r1,...,s1r2,s2r2,s3r2,...)

it provides curr_sequence_id
 */


function SequencesRecordingSrv(FileSystemSrv, StringSrv, EnumsSrv)
{
    var sequence            = [];   // array of sentences to be recorded
    var modality            = 1;    // by sentence....blocks of nrepetition sentences
    var repetitions         = EnumsSrv.RECORD.SESSION_MIN_REPETITIONS;
    var curr_sequence_id    = 0;
    var seq_folder          = "";
    
    var separator_filename_rep = "_";
    
    var training_modalities  = [{"label": "by sentences", "value":EnumsSrv.RECORD.BY_SENTENCE},
                                {"label": "by repetitions", "value":EnumsSrv.RECORD.BY_REPETITIONS}];    

    clear = function()
    {
        sequence = [];
        curr_sequence_id    = 0;        
    };
    
    //        seq_folder          = rel_folder_root + "/training_" + StringSrv.formatDate();
    //        $scope.voicebankSentences.map(function(item) { return item.id; })
    // sentences_ids
    calculateSequence = function(sentences, mode, nrepetitions, rel_folder_root, file_prefix, add_rep_cnt)
    {
        clear();
        if(file_prefix == null) file_prefix = "audio";
        if(add_rep_cnt == null) add_rep_cnt = true;
        var modality            = mode;
        var repetitions         = nrepetitions;
        var new_folder          = false;
        var nsentences          = sentences.length;
        
        if(!add_rep_cnt && nrepetitions > 1)
        {
            alert("Errore Interno: tentativo di fare piu ripetizioni con lo stesso nome")
            return null;
        }
        
        return FileSystemSrv.existDir(rel_folder_root)
        .then(function(exist)
        {
            if(!exist) new_folder = true;   // if new, delete it in catch 
            return FileSystemSrv.createDir(rel_folder_root)
        })        
        .then(function()
        {
            if(modality == EnumsSrv.RECORD.BY_REPETITIONS)
            { 
                // by repetitions: 
                for(r = 0; r < nrepetitions; r++)
                {
                    for(s = 0; s < nsentences; s++)
                    {
                        var sentence        = sentences[s];
                        var rel_filepath    = rel_folder_root + "/"+ file_prefix + separator_filename_rep + sentence.id.toString();
                        if(add_rep_cnt)     rel_filepath += separator_filename_rep + r.toString() + EnumsSrv.RECORD.FILE_EXT;
                        else                rel_filepath += EnumsSrv.RECORD.FILE_EXT;
                        
                        sequence.push({"id": sentence.id, "rel_filepath":rel_filepath, "title":sentence.title});
                    }
                }                
            }
            else
            {
                // by sentence
                for(s = 0; s < nsentences; s++)
                {
                    var sentence = sentences[s];
                    for(r = 0; r < nrepetitions; r++)
                    {
                        var rel_filepath    = rel_folder_root + "/"+ file_prefix + separator_filename_rep + sentence.id.toString();
                        if(add_rep_cnt)     rel_filepath += separator_filename_rep + r.toString() + EnumsSrv.RECORD.FILE_EXT;
                        else                rel_filepath += EnumsSrv.RECORD.FILE_EXT;
                        sequence.push({"id": sentence.id, "rel_filepath":rel_filepath, "title":sentence.title});
                    }
                }
            }
            return sequence;
        })
        .catch(function(error)
        {
            if(new_folder)  FileSystemSrv.deleteDir(rel_folder_root);
            alert(error.message);
            return null;
        });
    };

    completeSequence = function(sentences, mode, nrepetitions, rel_folder_root, file_prefix, add_rep_cnt)
    {
        
    }
    
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
    
    getNextSentenceId = function()
    {
        curr_sequence_id++;
        if(curr_sequence_id >= sequence.length) return -1;
        else                                    return curr_sequence_id;
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
    }
    //================================================================================
    return {
        calculateSequence: calculateSequence,
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

 