"use strict";

// This object contains functions for life and the abstraction of it's presentation in the view, if you catch my meaning.
const lifeService = {};
(function(context){

    context.computeLifetimeUncertaintyStart = function(lifeStartMs, lifeEndMs){
        console.assert(lifeStartMs !== undefined);
        console.assert(lifeEndMs !== undefined);
        const now = new Date().getTime();
        const remainingLifeDuration = lifeEndMs - now;
        return (remainingLifeDuration / 2) + now;
    };

    /*
    Pre-condition: all parameters are Numbers. uncertaintyStart <= intervalEnd
    TODO: mitä jos samat?
    TODO: parempi nimi
    Returns a number in interval [0, 1].
    */
    context.uncertaintyFunction = function(intervalEnd, uncertaintyStart, point){
        console.assert(uncertaintyStart <= intervalEnd);
        if(uncertaintyStart === intervalEnd){
            return 1;
        }
        const normalizedIntervalEnd = intervalEnd - uncertaintyStart;
        const normalizedPoint = point - uncertaintyStart;
        const percentage = normalizedPoint / normalizedIntervalEnd;
        return percentage;
    };

    /*
        Returns true iff note exists in life and is not undefined.
     */
    context.doesNoteExist = function(id, life){
        console.assert(id !== undefined && life !== undefined, "Erroneous parameters");
        const firstNoteFound = life.Notes.find(n => n.Id === id);
        const found = firstNoteFound !== undefined;
        if(!found){
            console.log("doesNoteExist: Note of id", id, "was not found.");
        }
        return found;
    };

    context.getNoteById = function(id, life){
        console.assert(id !== undefined && life !== undefined);
        const firstNoteFound = life.Notes.find(n => n.Id === id);
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
        const notesInInterval = [];
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
        const startDate = moment.utc(timeBox.attr("data-start"));
        const endDate = moment.utc(timeBox.attr("data-end"));
        const notes = lifeService.getNotesByInterval(startDate, endDate, life);
        return notes;
    };

    /*
        Pre-condition: timeBoxes has a continuous interval of time boxes in terms of their time,
        and timeBoxes are ordered chronologically.
    */
    context.getNotesInTimeBoxesInterval = function(timeBoxes, life){
        const startDate = moment.utc(timeBoxes.first().attr("data-start"));
        const endDate = moment.utc(timeBoxes.last().attr("data-end"));
        const notes = lifeService.getNotesByInterval(startDate, endDate, life);
        return notes;
    };

    /*
        Returns an array of time box data objects.
    */
    context.createTimeBoxes = function(life, resolutionUnit){
        const lifeStartDate = life.Start;
        const lifeEndDate = life.End;
        console.log(lifeStartDate);
        console.log(lifeEndDate);
        if(lifeStartDate.isAfter(lifeEndDate) || lifeStartDate.isSame(lifeEndDate)){
            console.log(lifeStartDate.format());
            console.log(lifeEndDate.format());
            console.assert(false, "Life start not before life end.");
        }
        const timeBoxes = [];
        let counter = 0;
        const adjustedLifeStart = lcUtil.getFirstDateOfTimeUnit(lifeStartDate, resolutionUnit);
        for(let t = adjustedLifeStart; true; t = lcUtil.addTimeUnit(t, resolutionUnit)){
            console.assert(counter < 1000 * 100, "This is probably because of a bug.");
            console.assert(t.hours() === 0, "Hours is not 0.");
            const tPlusResolutionUnit = lcUtil.addTimeUnit(t, resolutionUnit);
            console.assert(tPlusResolutionUnit.hours() === 0, "Hours is not 0.");
            const newTimeBox = lifeService.createTimeBox(t, tPlusResolutionUnit, lifeService.getNoteBoxesByInterval(t, tPlusResolutionUnit, life), counter);
            timeBoxes.push(newTimeBox);
            // Life end time is exclusive.
            if(tPlusResolutionUnit.isAfter(lifeEndDate) || tPlusResolutionUnit.isSame(lifeEndDate)){
                console.log("life end is:", lifeEndDate.format());
                console.log("createTimeBoxes: the last one was", tPlusResolutionUnit.format());
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
        const notes = lifeService.getNotesByInterval(startDate, endDate, life);
        console.assert(notes !== undefined);
        const noteBoxes = lifeService.createNoteBoxes(notes);
        return noteBoxes;
    };

    /*
        Returns an array of note box data objects.
    */
    context.createNoteBoxes = function(notes){
        const noteBoxes = [];
        notes.forEach(function(note){
            const noteBox = lifeService.createNoteBox(note, lcUtil.generateUniqueId());
            noteBoxes.push(noteBox);
        });
        return noteBoxes;
    };
})(lifeService);