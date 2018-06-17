"use strict";

var resolutionUnit = "Week"; // TODO: saatava serveriltä, ehkä samalla kertaa kuin life.
//$(initialize);
$(document).ready(initialize);

const zoomInButtonId = 'zoom-in-button';
const zoomOutButtonId = 'zoom-out-button';
const restoreDefaultZoomButtonId = 'restore-default-zoom-button';
const selectedTimeBoxClass = 'selected-time-box';
//const zoomStep = 10; //px
const zoomMultiplier = 1.2;
const timeBoxDefaultWidth = 49;
const timeBoxDefaultHeight = 49;


var life;
var lcOptionsForm;

var selectedTimeBox = null; // TODO: Jos dataa laitetaan DOMiin, niin tämänkin voisi
var visibleNotes = []; // Stores the Note objects of which are visible in the calendar.

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
        //console.log("eventTarget:", eventTargetJQuery);
        if(eventTargetJQuery.is(".js-note-rep")){
            noteRepClicked($(e.target));
        }
        /*if(eventTargetJQuery.is(".js-note-visibility-item")){
            // TODO: täytyy selkeyttää note-repin määritelmää - nyt kahta erilaista itemiä eri
            // näkymissä pidetään note-repinä, ja se on ok
            noteRepClicked($(e.target));
        }*/
        if(eventTargetJQuery.is(".js-note-visibility-item-label")){
            var noteVisibilityItem = eventTargetJQuery.parent(); // It's parent has the data attribute needed.
            noteRepClicked(noteVisibilityItem);
        }
        if(eventTargetJQuery.is(".js-note-visibility-item-checkbox")){
            console.log("checkbx state changedd!");
            // Note: Changing the value of an input element using JavaScript, using .val() for example, won't fire the event.
            var checked = eventTargetJQuery[0].checked;
            var noteId = eventTargetJQuery.parent().attr('data-note-id');
            var note = getNoteById(noteId);
            console.assert(note !== undefined, "Note of id " + noteId + " is undefined.");
            if(checked){
                if(!visibleNotes.includes(note)){
                    visibleNotes.push(note);
                }
            }else{
                if(visibleNotes.includes(note)){
                    var originalLength = visibleNotes.length;
                    visibleNotes = lcUtil.arrayWithoutElement(note, visibleNotes);
                    console.assert(visibleNotes.length < originalLength, "Bug.");
                }
            }
            updateLifeCalendar();
        }
        if(eventTargetJQuery.attr('id') === zoomInButtonId){
            //var minWidth = $(this).css('min-width');
            //var maxWidth = $(this).css('max-width');
            //$('.time-box').css('min-width', '+=' + zoomStep).css('max-width', '+=' + zoomStep);
            //$('.time-box').css('min-height', '+=' + zoomStep).css('max-height', '+=' + zoomStep);
            var multiplierFunction = function(index, value){
                return parseFloat(value) * zoomMultiplier;
            };
            $('.time-box').css({
                minWidth: multiplierFunction,
                maxWidth: multiplierFunction,
                minHeight: multiplierFunction,
                maxHeight: multiplierFunction
            });
        }
        if(eventTargetJQuery.attr('id') === zoomOutButtonId){
            var dividerFunction = function(index, value){
                return parseFloat(value) * (1 / zoomMultiplier);
            };
            $('.time-box').css({
                minWidth: dividerFunction,
                maxWidth: dividerFunction,
                minHeight: dividerFunction,
                maxHeight: dividerFunction
            });
        }
        if(eventTargetJQuery.attr('id') === restoreDefaultZoomButtonId){
            $('.time-box').css('min-width', timeBoxDefaultWidth).css('max-width', timeBoxDefaultWidth);
            $('.time-box').css('min-height', timeBoxDefaultHeight).css('max-height', timeBoxDefaultHeight);
        }

        if(eventTargetJQuery.is(".js-time-box")){
            /* This happens only if shift is being pressed while clicking. */
            if(e.shiftKey){
                timeBoxClicked(e, true);
            }else{
                timeBoxClicked(e);
            }
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
    visibleNotes = life.Notes;
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

function timeBoxClicked(e, multiSelectionOn = false){
    //console.log("time box click'd!");
    var timeBox = $(e.target);

    var timeBoxIsSelected = selectedTimeBox !== undefined && selectedTimeBox !== null;
    if(!(multiSelectionOn && timeBoxIsSelected)){
        if(timeBoxIsSelected){
            selectedTimeBox.removeClass(selectedTimeBoxClass);
        }
        selectedTimeBox = timeBox;
        selectedTimeBox.addClass(selectedTimeBoxClass);
    }else{
        var startOfRange = moment.utc( selectedTimeBox.attr('data-start') );
        var endOfRange = moment.utc( timeBox.attr('data-end') );
        var timeBoxesInInterval = getTimeBoxesByInteval(startOfRange, endOfRange);
        $('#life-calendar .time-box').removeClass('selected-time-box-range');
        timeBoxesInInterval.forEach(tb => tb.addClass('selected-time-box-range'));
    }

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
}

function noteRepClicked(jQuery){
    //console.log("note-rep click'd!");
    var noteRep = jQuery;
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
    updateNoteVisibilitiesDiv();
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
        // TODO: intervalli timeboxissa poistettu
        //var intervalElement = newTimeBoxElement.children('.js-past-future-coloring');
        //intervalElement.text( lcUtil.intervalToPresentableString(timeBoxDO.Start, timeBoxDO.End, resolutionUnit) );
        timeBoxDO.NoteBoxes.forEach(function(noteBox){
            var newNoteBoxElement = noteBoxElement.clone();
            newNoteBoxElement.attr('data-note-id', noteBox.Note.Id);
            newNoteBoxElement.text(noteBox.Note.Text);
            var noteColor = noteBox.Note.Color;
            newNoteBoxElement.css("background-color", noteColor);
            newNoteBoxElement.appendTo(newTimeBoxElement);

            if(!visibleNotes.includes(noteBox.Note)){
                newNoteBoxElement.hide();
            }
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

function updateNoteVisibilitiesDiv() {
    var originalJsNoteVisibilityItem = $('#template-storage-div .js-note-visibility-item');
    console.assert(originalJsNoteVisibilityItem.length === 1, "Problems in storage area.");
    var noteVisibilityItemContainer = $('#note-visibility-item-container');
    noteVisibilityItemContainer.empty();
    life.Notes.forEach(function(note){
        var newNoteVisibilityItem = originalJsNoteVisibilityItem.clone();
        var inputDomId = lcUtil.generateUniqueId();
        newNoteVisibilityItem.find('input').attr('id', inputDomId);
        newNoteVisibilityItem.find('label').attr('for', inputDomId);

        newNoteVisibilityItem.attr('data-note-id', note.Id);
        newNoteVisibilityItem.find('input').val(note.Id); // tämä lähetetään submitatessa (jos submitataan): name=value
        newNoteVisibilityItem.find('label').text(note.Text);
        newNoteVisibilityItem.css('background-color', note.Color);
        noteVisibilityItemContainer.append(newNoteVisibilityItem);

        if(visibleNotes.includes(note)){
            newNoteVisibilityItem.find('input').attr('checked', 'checked');
        }
    });
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

/*
    Returns timeBoxes in the DOM of which date-data is in the interval [start, end[.
    Pre-conditions: start and end are Moments.
 */
function getTimeBoxesByInteval(start, end){
    var allTimeBoxes = $('#life-calendar .time-box');
    console.assert(start.hour() === 0 && end.hour() === 0, "Hours not 0:", start, end);
    console.assert(allTimeBoxes.length > 0);
    //console.log("start and end:", start, end);
    var timeBoxesInInterval = [];
    allTimeBoxes.each(function(){
        //console.log("looping");
        var tb = $(this);
        var tbStart = dataAttrToMoment(tb, 'data-start');
        var tbEnd = dataAttrToMoment(tb, 'data-end');
        //console.log("data-start:", tb.attr('data-start'));
        //console.log(tbEnd, start, tbEnd.isAfter(start));
        var isInInterval = tbEnd.isAfter(start) && tbStart.isBefore(end);
        if(isInInterval){
            timeBoxesInInterval.push(tb);
        }
    });
    //console.log("getTimeBoxesByInterval: there was ", timeBoxesInInterval.length, " time boxes in interval.");
    return timeBoxesInInterval;
}

/*
    Pre-condition: jQuery must have a valid date string as a value of dataAttr attribute.
 */
function dataAttrToMoment(jQuery, dateAttr){
    var dateString = jQuery.attr(dateAttr);
    //console.log(jQuery)
    console.assert(dateString !== undefined);
    if(dateString === dataEmptyValue){
        console.log(jQuery);
    }
    console.assert(dateString !== dataEmptyValue);
    var asMoment = moment.utc(dateString);
    console.assert(asMoment.hours() === 0, "Hours not 0:", asMoment);
    return asMoment;
}