// This object contains functions for life and the abstraction of it's presentation in the view, if you catch my meaning.
var lifeService = {};
(function(context){

    context.computeLifetimeUncertaintyStart = function(lifeStartMs, lifeEndMs){
        console.assert(lifeStartMs !== undefined);
        console.assert(lifeEndMs !== undefined);
        //var lifeDuration = lifeEndMs - lifeStartMs;
        var now = new Date().getTime();
        var remainingLifeDuration = lifeEndMs - now;
        return (remainingLifeDuration / 2) + now;
    }

    /*
    Pre-condition: all parameters are Numbers. uncertaintyStart <= intervalEnd
    TODO: mitä jos samat?
    TODO: parempi nimi
    Returns a number in interval [0, 1].
    */
    context.uncertaintyFunction = function(intervalEnd, uncertaintyStart, point){
        console.assert(uncertaintyStart <= intervalEnd);
        if(uncertaintyStart === intervalEnd){
            console.log("uncertaintyFunction: gonna return 1");
            return 1;
        }
        var normalizedIntervalEnd = intervalEnd - uncertaintyStart;
        var normalizedPoint = point - uncertaintyStart;
        var percentage = normalizedPoint / normalizedIntervalEnd;
        return percentage;
    };

    /*
        Returns true iff note exists in life and is not undefined.
     */
    context.doesNoteExist = function(id, life){
        console.assert(id !== undefined && life !== undefined, "Erroneous parameters");
        var firstNoteFound = life.Notes.find(n => n.Id === id);
        var found = firstNoteFound !== undefined;
        if(!found){
            console.log("doesNoteExist: Note of id", id, "was not found.");
        }
        return found;
    };

    context.getNoteById = function(id, life){
        var firstNoteFound = life.Notes.find(n => n.Id === id);
        console.assert(firstNoteFound !== undefined, "Note of id " + id + " is undefined.");
        return firstNoteFound;
    };

    /*
        Pre-condition start < end (ENTÄ JOS ON SAMA?). life.start < life.end
    */
    context.getNotesByInterval = function(start, end, life){
        /*
        käy läpi kaikki notet lifessä
            jos ne > is ja ns < ie
         */
        var notesInInterval = [];
        life.Notes.forEach(function(note){
            if(note.End.isAfter(start) && note.Start.isBefore(end)){
                notesInInterval.push(note);
            }
        });
        return notesInInterval;
    };

    /*
        Converts date strings in life into Moments of moment.js. Mutates the value of life parameter.
    */
    context.datifyLifeObject = function(life){
        life.Start = moment.utc(life.Start);
        life.End = moment.utc(life.End);
        life.Notes.forEach(function(element, index, array){
            array[index].Start = moment.utc(element.Start);
            console.assert(array[index].Start.hours() === 0, "Hours not 0.");
            array[index].End = moment.utc(element.End);
            console.assert(array[index].End.hours() === 0, "Hours not 0.");
        });
    };

    /*
        Returns array of notes or empty array.
    */
    context.getNotesInTimeBoxInterval = function(timeBox, life){
        var startDate = moment.utc(timeBox.attr("data-start"));
        var endDate = moment.utc(timeBox.attr("data-end"));
        var notes = lifeService.getNotesByInterval(startDate, endDate, life);
        return notes;
    };

    /*
        Pre-condition: timeBoxes has a continuous interval of time boxes in terms of their time,
        and timeBoxes are ordered chronologically.
    */
    context.getNotesInTimeBoxesInterval = function(timeBoxes, life){
        var startDate = moment.utc(timeBoxes.first().attr("data-start"));
        var endDate = moment.utc(timeBoxes.last().attr("data-end"));
        var notes = lifeService.getNotesByInterval(startDate, endDate, life);
        return notes;
    };

    /*
        Returns an array of time box data objects.
    */
    context.createTimeBoxes = function(life, resolutionUnit){
        //var lifeStartDate = moment.utc(life.Start);
        //var lifeEndDate = moment.utc(life.End);
        var lifeStartDate = life.Start;
        var lifeEndDate = life.End;
        if(lifeStartDate.isAfter(lifeEndDate) || lifeStartDate.isSame(lifeEndDate)){
            console.log(lifeStartDate);
            console.log(lifeEndDate);
            console.assert(false, "Life start not before life end.");
        }
        var timeBoxes = [];
        var counter = 0;
        var adjustedLifeStart = lcUtil.getFirstDateOfTimeUnit(lifeStartDate, resolutionUnit);
        for(var t = adjustedLifeStart; true; t = lcUtil.addTimeUnit(t, resolutionUnit)){
            console.assert(counter < 1000 * 100, "This is probably because of a bug.");
            console.assert(t.hours() === 0, "Hours is not 0.");
            var tPlusResolutionUnit = lcUtil.addTimeUnit(t, resolutionUnit);
            console.assert(tPlusResolutionUnit.hours() === 0, "Hours is not 0.");
            var newTimeBox = lifeService.createTimeBox(t, tPlusResolutionUnit, lifeService.getNoteBoxesByInterval(t, tPlusResolutionUnit, life), counter);
            timeBoxes.push(newTimeBox);
            // Life end time is exclusive.
            if(tPlusResolutionUnit.isAfter(lifeEndDate) || tPlusResolutionUnit.isSame(lifeEndDate)){
                break;
            }
            counter += 1;
        }
        return timeBoxes;
    };

    /*
        Returns a time box data object.
     */
    context.createTimeBox = function(startDate, endDate, noteBoxes, id){
        return {
            Start: startDate,
            End: endDate,
            NoteBoxes: noteBoxes,
            Id: id
        };
    };

    /*
        Returns a note box data object.
    */
    context.createNoteBox = function(note, noteBoxId){
        return {
            Note: note,
            Id: noteBoxId // Not the same thing as Note.Id
        };
    };

    /*
        Returns and array of note box data objects.
    */
    context.getNoteBoxesByInterval = function(startDate, endDate, life){
        var notes = lifeService.getNotesByInterval(startDate, endDate, life);
        console.assert(notes !== undefined);
        var noteBoxes = lifeService.createNoteBoxes(notes);
        return noteBoxes;
    };

    /*
        Returns an array of note box data objects.
    */
    context.createNoteBoxes = function(notes){
        var noteBoxes = [];
        notes.forEach(function(note){
            var noteBox = lifeService.createNoteBox(note, lcUtil.generateUniqueId());
            noteBoxes.push(noteBox);
        });
        return noteBoxes;
    };
})(lifeService);