"use strict";

var resolutionUnit = "Week"; // TODO: saatava serveriltä, ehkä samalla kertaa kuin life.
//$(initialize);
$(document).ready(initialize);

var life;
var lcOptionsForm;

var selectedTimeBox = null;

const isInvalidClass = "is-invalid";

function initialize(){
    console.log("initializing");
    lcOptionsForm = $('#lc-options-form');
    // is-valid ja is-invalid -luokat näyttävät feedbackin ja punaiset reunat!
    lcOptionsForm.submit(function(e){
        console.log("form inputs:");
        console.log(lcOptionsForm.children("input, select"));
        lcOptionsForm.children("input, select").each(function(){
            var isValid = $(this)[0].checkValidity(); // onko html-validaation mukaan validi?
            if(!isValid){
                $(this).addClass(isInvalidClass);
            }
        });
        var startInput = $('#life-start-input');
        var endInput = $('#life-end-input');
        var startInputValue = moment.utc(startInput.val());
        var endInputValue = moment.utc(endInput.val());
        var isStartValid = startInputValue.isSameOrAfter(MIN_DATE) && startInputValue.isBefore(MAX_DATE);
        var isEndValid = endInputValue.isSameOrAfter(MIN_DATE) && endInputValue.isBefore(MAX_DATE);
        if(!isStartValid){
            startInput.addClass(isInvalidClass);
            startInput.next().text("Date out of range");
        }
        if(!isEndValid){
            endInput.addClass(isInvalidClass);
            endInput.next().text("Date out of range");
        }
        console.log("start input value:");
        console.log(endInputValue);
        if(!endInputValue.isAfter(startInputValue)){
            startInput.addClass(isInvalidClass);
            endInput.addClass(isInvalidClass);
            console.log("invalid classes add'd!");
            startInput.add(endInput).next().text("Erroneous chronology");
        }
        var isAnyInvalid = false;
        lcOptionsForm.children("input, select").each(function(){
            console.log("loopung");
            if($(this).hasClass(isInvalidClass)){
                isAnyInvalid = true;
                console.log("is invalid");
            }
        });
        if(!isAnyInvalid) {
            $.ajax($(this).attr("data-action"),
                {
                    data: $(this).serialize(),
                    method: $(this).attr("data-method"),
                    error: function (jqXHR, textStatus, errorThrown) {
                        alert("error'd: " + errorThrown);
                    },
                    success: function (data, textStatus, jqXHR) {
                        console.log("This is what I got: " + data);
                        glueMainPageData(JSON.parse(data));
                    }
                });
        }
        e.preventDefault();
    });
    $('#note-changing-form').submit(function(e){
        $.ajax( $(this).attr("data-action"),
            {
                data: $(this).serialize(),
                method: $(this).attr("data-method"),
                error: function(jqXHR, textStatus, errorThrown){ alert("error'd: " + errorThrown); },
                success: function(data, textStatus, jqXHR){
                    console.log("This is what I got: " + data);
                    glueMainPageData(JSON.parse(data));
                }
            });
        e.preventDefault();
    });
    $('#new-note-form').submit(function(e){
        $.ajax( $(this).attr("data-action"),
            {
                data: $(this).serialize(),
                method: $(this).attr("data-method"),
                error: function(jqXHR, textStatus, errorThrown){ alert("error'd: " + errorThrown); },
                success: function(data, textStatus, jqXHR){
                    console.log("This is what I got: " + data);
                    glueMainPageData(JSON.parse(data));
                }
            });
        e.preventDefault();
    });

    $(document).click(function(e){
        var eventTargetJQuery = $(e.target);
        // if(eventTargetJQuery.is(".js-note-box")){
        //     editNoteButtonClicked(e);
        // }
        //console.log("We have detected a click! Target: ");
        //console.log(e.target);
        if(eventTargetJQuery.is(".js-time-box")){
            timeBoxClicked(e);
        }
        if(eventTargetJQuery.is(".js-note-rep")){
            noteRepClicked(e);
        }
    });

    $.getJSON("/get_main_page_data", glueMainPageData);
}

/*
    Integrates main page data into the page to be used and rendered.
    Pre-condition: data is object, not raw json string.
 */
function glueMainPageData(data){
    console.log(typeof data);
    life = data.Life;
    console.assert(life !== undefined, "Life is undefined.");
    resolutionUnit = data.ResolutionUnit;
    datifyLifeObject();
    console.log("life");
    console.log(life);
    updateLifeComponents();
}

function showRequest(formData, jqForm, options) {
    // formData is an array; here we use $.param to convert it to a string to display it
    // but the form plugin does this for you automatically when it submits the data
    var queryString = $.param(formData);

    // jqForm is a jQuery object encapsulating the form element.  To access the
    // DOM element for the form do this:
    // var formElement = jqForm[0];

    alert('About to submit: \n\n' + queryString);

    // here we could return false to prevent the form from being submitted;
    // returning anything other than false will allow the form submit to continue
    return true;
}

function timeBoxClicked(e){
    //console.log("time box click'd!");
    var timeBox = $(e.target);
    selectedTimeBox = timeBox;
    updateNotesDiv();
    updateNewNoteForm();

    var notesInTimeBox = getNotesInTimeBoxInterval(timeBox);
    if(notesInTimeBox.length === 0){
        clearNoteChangingForm();
    }else{
        //console.assert(notesInTimeBox !== undefined, "Undefined notes array.");
        //console.log("notes in time box:", notesInTimeBox);
        //console.assert(notesInTimeBox[0] !== undefined, "Undefined note.");
        populateNoteChangingForm(notesInTimeBox[0]);
    }
    /*
    console.log("time box click'd!");
    var timeBox = $(e.target);
    var noteBoxes = timeBox.find('div.js-note-box');
    var noteIds = [];
    //TODO: () => noteIds.push($(this).data.noteId) EI TOIMI, MUTTA MIKSI? MITEN THIS TOIMII?
    noteBoxes.each(function() {
        noteIds.push($(this).data('note-id'));
    });
    var allNoteReps = $('.js-note-rep');
    allNoteReps.each(function(){
        var self = $(this); // TODO: miten this toimii?
        var noteId = self.data('note-id');
        if(noteIds.includes(noteId)){
            self.show(400);
        }else{
            self.hide();
        }
    });
    var tbStart = timeBox.data('start');
    var tbEnd = timeBox.data('end');
    $('#new-note-start').attr('value', tbStart);
    $('#new-note-end').attr('value', tbEnd);*/
}

function noteRepClicked(e){
    //console.log("note-rep click'd!");
    var noteRep = $(e.target);
    console.assert(noteRep !== undefined, "noteRep undefined");
    var id = noteRep.data("note-id");
    console.log("note rep click'd of id", id);
    var note = getNoteById(id);
    console.assert(note !== undefined, "Note is undefined.");
    populateNoteChangingForm(note);
}

function populateNoteChangingForm(note){
    var start = note.Start.format(isoDateFormatString);
    var end = note.End.format(isoDateFormatString);
    var text = note.Text;
    var color = note.Color;
    var id = note.Id;
    console.assert([start, end, text, id].every(x => x !== undefined), [start, end, text, id]);
    //$('#note-changing-text-input').attr('value', text); // This doesn't work for some reason, replaced with the next line.
    $('#note-changing-text-input').val(text);
    $('#note-changing-color-input').val(color);
    $('#note-changing-start-input').attr('value', start);
    $('#note-changing-end-input').attr('value', end);
    $('#note-changing-id').attr('value', id);
}

function clearNoteChangingForm(){
    $('#note-changing-text-input').val(noNoteSelectedString);
    $('#note-changing-color-input').val(defaultColorHex);
    $('#note-changing-start-input').attr('value', "");
    $('#note-changing-end-input').attr('value', "");
    $('#note-changing-id').attr('value', "");
}

/*
    Converts date strings in life into Moments of moment.js.
 */
function datifyLifeObject(){
    life.Start = moment.utc(life.Start);
    life.End = moment.utc(life.End);
    life.Notes.forEach(function(element, index, array){
        array[index].Start = moment.utc(element.Start);
        console.assert(array[index].Start.hours() === 0, "Hours not 0.");
        array[index].End = moment.utc(element.End);
        console.assert(array[index].End.hours() === 0, "Hours not 0.");
    });
}

function updateLifeComponents(){
    updateLifeOptions();
    updateLifeCalendar();
    updateNotesDiv();
}

function updateLifeOptions(){
    $('#life-start-input').val(life.Start.format(isoDateFormatString));
    $('#life-end-input').val(life.End.format(isoDateFormatString));
    $('#resolution-unit-select').val(resolutionUnit);
}

function updateLifeCalendar(){
    //console.log("updating life calendar");
    var lifeCalendarElement = $('#life-calendar');
    var templateStorageDiv = $('#template-storage-div');
    lifeCalendarElement.empty();
    var timeBoxElement = templateStorageDiv.children('.js-time-box');
    var noteBoxElement = templateStorageDiv.children('.js-note-box');

    var timeBoxDOs = createTimeBoxes(); // timeBoxDataObjects
    timeBoxDOs.forEach(function(timeBoxDO){
        var newTimeBoxElement = timeBoxElement.clone();
        newTimeBoxElement.attr("data-start", timeBoxDO.Start.format(isoDateFormatString));
        newTimeBoxElement.attr("data-end", timeBoxDO.End.format(isoDateFormatString));
        var intervalElement = newTimeBoxElement.children('.js-past-future-coloring');
        intervalElement.text( lcUtil.intervalToPresentableString(timeBoxDO.Start, timeBoxDO.End, resolutionUnit) );
        timeBoxDO.NoteBoxes.forEach(function(noteBox){
            var newNoteBoxElement = noteBoxElement.clone();
            newNoteBoxElement.attr('data-note-id', noteBox.Note.Id);
            newNoteBoxElement.text(noteBox.Note.Text);
            newNoteBoxElement.appendTo(newTimeBoxElement);
        });
        newTimeBoxElement.appendTo(lifeCalendarElement);
    });
}

function updateNotesDiv(){
    var timeBox = selectedTimeBox;
    if(timeBox === null){
        return;
    }
    var contentsOfTimeBoxDiv = $('#contents-of-time-box-div');
    contentsOfTimeBoxDiv.empty();
    var intervalSpan = $('#selected-time-box-interval-span');
    var intervalString = selectedTimeBox.attr('data-start') + " to " + selectedTimeBox.attr('data-end');
    intervalSpan.text(intervalString);

    var notes = getNotesInTimeBoxInterval(timeBox);
    var noteRepElement = $('#template-storage-div .js-note-rep');
    notes.forEach(function(note){
        var newNoteRepElement = noteRepElement.clone();
        newNoteRepElement.attr('data-note-id', note.Id);
        newNoteRepElement.text(note.Text);
        newNoteRepElement.css('background-color', note.Color);
        contentsOfTimeBoxDiv.append(newNoteRepElement);
    });
}

function updateNewNoteForm(){
    //console.log("updating new note form");
    var timeBox = selectedTimeBox;
    if(timeBox === null){
        return;
    }
    var start = moment.utc( timeBox.attr('data-start') );
    var end = moment.utc( timeBox.attr('data-end') );
    start = start.format(isoDateFormatString);
    end = end.format(isoDateFormatString);
    $('#new-note-start').val(start);
    $('#new-note-end').val(end);
}

/*
    Returns array of notes or empty array.
 */
function getNotesInTimeBoxInterval(timeBox){
    var startDate = moment.utc(timeBox.attr("data-start"));
    var endDate = moment.utc(timeBox.attr("data-end"));
    var notes = getNotesByInterval(startDate, endDate);
    return notes;
}

function createTimeBoxes(){
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
        console.assert(t.hours() === 0, "Hours is not 0.");
        var tPlusResolutionUnit = lcUtil.addTimeUnit(t, resolutionUnit);
        console.assert(tPlusResolutionUnit.hours() === 0, "Hours is not 0.");
        var newTimeBox = createTimeBox(t, tPlusResolutionUnit, getNoteBoxesByInterval(t, tPlusResolutionUnit), counter);
        timeBoxes.push(newTimeBox);
        // Life end time is exclusive.
        if(tPlusResolutionUnit.isAfter(lifeEndDate) || tPlusResolutionUnit.isSame(lifeEndDate)){
            break;
        }
        counter += 1;
    }
    return timeBoxes;
}

function createTimeBox(startDate, endDate, noteBoxes, id){
    return {
        Start: startDate,
        End: endDate,
        NoteBoxes: noteBoxes,
        Id: id
    };
}

function createNoteBox(note, noteBoxId){
    return {
        Note: note,
        Id: noteBoxId // Not the same thing as Note.Id
    };
}

function getNoteBoxesByInterval(startDate, endDate){
    var notes = getNotesByInterval(startDate, endDate);
    console.assert(notes !== undefined);
    var noteBoxes = createNoteBoxes(notes);
    return noteBoxes;
}

function createNoteBoxes(notes){
    var noteBoxes = [];
    notes.forEach(function(note){
        var noteBox = createNoteBox(note, lcUtil.generateUniqueId());
        noteBoxes.push(noteBox);
    });
    return noteBoxes;
}

function getNotesByInterval(start, end){
    /*
    Pre-condition start < end (ENTÄ JOS ON SAMA?). life.start < life.end
     */
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
}

function getNoteById(id){
    var firstNoteFound = life.Notes.find(n => n.Id === id);
    console.assert(firstNoteFound !== undefined, "Note of id " + id + " is undefined.");
    return firstNoteFound;
}