"use strict";

var resolutionUnit = "Week"; // TODO: saatava serveriltä, ehkä samalla kertaa kuin life.
//$(initialize);
$(document).ready(initialize);

var life;
var lcOptionsForm;

var stringsAndMoments = {}; // { "2018-01-01": moment.utc("2018-01-01"), etc. }
var selectedTimeBox = null; // TODO: Jos dataa laitetaan DOMiin, niin tämänkin voisi
var visibleNotes = []; // Stores the Note objects of which are visible in the calendar.
var zoomLevel = 0; // Integers. Negatives are for zooming out.

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
            zoomLevel += 1;
            //var multiplierFunction = function(index, value){
            //    return parseFloat(value) * zoomMultiplier;
            //};
            zoomLifeCalendar()
        }
        if(eventTargetJQuery.attr('id') === zoomOutButtonId){
            //var dividerFunction = function(index, value){
            //    return parseFloat(value) * (1 / zoomMultiplier);
            //};
            zoomLevel -= 1;
            zoomLifeCalendar();
        }
        if(eventTargetJQuery.attr('id') === restoreDefaultZoomButtonId){
            zoomLevel = 0;
            zoomLifeCalendar();
            //$('.time-box').css('min-width', timeBoxDefaultWidth).css('max-width', timeBoxDefaultWidth);
            //$('.time-box').css('min-height', timeBoxDefaultHeight).css('max-height', timeBoxDefaultHeight);
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

function getZoomedDimension(dimensionLength){
    // If zoomLevel == 0, multiply by 1,
    // if zoomLevel > 0, multiplier increases in increasing steps,
    // if zoomLevel < 0, multiplier decreases in decreasing steps.
    var newLength = Math.pow(zoomMultiplier, zoomLevel) * dimensionLength;
    return newLength;
}

function zoomLifeCalendar(){
    var newTimeBoxWidth = getZoomedDimension(timeBoxDefaultWidth);
    var newTimeBoxHeight = getZoomedDimension(timeBoxDefaultHeight);
    // TODO: näköjään hieman nopeampaa ilman funktiokutsuja, joten vosi laskea arvot etukäteen
    // TODO: myöskin jokainen property ilmeisesti lasketaan ja piirretään erikseen?
    $('.time-box').css({
        minWidth: newTimeBoxWidth,
        maxWidth: newTimeBoxWidth,
        minHeight: newTimeBoxHeight,
        maxHeight: newTimeBoxHeight
    });
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
    //createMomentsFromDataAttrs(); // Done here in the beginning so only need to create Moments once (performance problems).
    updateLifeComponents();
}

function timeBoxClicked(e, multiSelectionOn = false){
    console.log("time box click'd!");
    var fsTime = performance.now();
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
    console.log("timeBoxClicked took", performance.now() - fsTime);
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
    //var newTimeBoxElements = $([]);
    var newTimeBoxElements = [];
    //console.log("thissit", newTimeBoxElements);
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
        //newTimeBoxElement.appendTo(lifeCalendarElement); // TODO: Tämä vienee jonkin verran aikaa?
        //newTimeBoxElements = newTimeBoxElements.add(newTimeBoxElement);
        newTimeBoxElements.push(newTimeBoxElement);
        //newTimeBoxElements = $.merge(newTimeBoxElements, [newTimeBoxElement]);
        //console.log("add'd!");
    });
    console.log("about to append ", newTimeBoxElements.length);
    var fsTime = performance.now();
    /*var firstNewTimeBoxElement = newTimeBoxElements[0];
    newTimeBoxElements.forEach(function(ntbe){
        firstNewTimeBoxElement = firstNewTimeBoxElement.add(ntbe);
    });
    //console.log("updateLifeCalendar: adding to jQuery took", performance.now() - fsTime);
    lifeCalendarElement.append(firstNewTimeBoxElement);*/
    //lifeCalendarElement.append(newTimeBoxElements);
    var arrayAsJQuery = $(newTimeBoxElements).map(function(){
        return this.toArray();
    });
    console.log("updateLifeCalendar: mapping took:", performance.now() - fsTime);
    fsTime = performance.now();
    lifeCalendarElement.append(arrayAsJQuery);
    console.log("updateLifeCalendar: adding to DOM took", performance.now() - fsTime);
    //newTimeBoxElements.appendTo(lifeCalendarElement);
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
    var areMultipleTBsSelected = $(selectedTimeBoxRangeSelector).length > 0;
    var timeBox = selectedTimeBox;
    var isSingleTimeBoxSelected = timeBox === null;
    if(!isSingleTimeBoxSelected && !areMultipleTBsSelected){
        return;
    }
    if(isSingleTimeBoxSelected){
        var start = moment.utc( timeBox.attr('data-start') );
        var end = moment.utc( timeBox.attr('data-end') );
        start = start.format(isoDateFormatString);
        end = end.format(isoDateFormatString);
        $('#new-note-start').val(start);
        $('#new-note-end').val(end);
    }else{
        console.assert(areMultipleTBsSelected === true);
        var firstTimeBox = $(selectedTimeBoxRangeSelector).first(); // TODO: toivottavasti ovat oikeassa järjestyksessä, tarkista dokumentaatiosta
        var lastTimeBox = $(selectedTimeBoxRangeSelector).last();

        var start = moment.utc( firstTimeBox.attr('data-start') );
        var end = moment.utc( lastTimeBox.attr('data-end') );
        start = start.format(isoDateFormatString);
        end = end.format(isoDateFormatString);
        $('#new-note-start').val(start);
        $('#new-note-end').val(end);
    }
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
        console.assert(counter < 1000 * 100, "This is probably because of a bug.");
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
    // TODO: rangen valinnass atai värjäyksessä on bugi: värjää väärät boksit!
 */
/*function getTimeBoxesByInteval2(start, end){
    console.log("getTimeBoxesByInteval called");
    var allTimeBoxes = $('#life-calendar .time-box');
    console.assert(start.hour() === 0 && end.hour() === 0, "Hours not 0:", start, end);
    console.assert(allTimeBoxes.length > 0);
    //console.log("start and end:", start, end);
    var startMs = start.valueOf();
    var endMs = end.valueOf();
    var timeBoxesInInterval = [];
    allTimeBoxes.each(function(){
        //console.log("looping");
        var tb = $(this);
        // TODO: momenttien muodostamiseen kuluu aikaa, jos niitä tehdään paljon
        //var tbStart = dataAttrToMoment(tb, 'data-start');
        //var tbEnd = dataAttrToMoment(tb, 'data-end');
        var tbStartMs = dataAttrToEpoch(tb, 'data-start');
        var tbEndMs = dataAttrToEpoch(tb, 'data-end');
        //console.log("data-start:", tb.attr('data-start'));
        //console.log(tbEnd, start, tbEnd.isAfter(start));
        var isInInterval = tbEndMs > startMs && tbStartMs < endMs;
        if(isInInterval){
            timeBoxesInInterval.push(tb);
        }
    });
    //console.log("getTimeBoxesByInterval: there was ", timeBoxesInInterval.length, " time boxes in interval.");
    return timeBoxesInInterval;
}*/

/*
    Returns timeBoxes in the DOM of which date-data is in the interval [start, end[.
    Pre-conditions: start and end are Moments. Timeboxes are sorted in increasing order in terms of time
    when selected with $('.time-box')
    // TODO: rangen valinnass atai värjäyksessä on bugi: värjää väärät boksit!
 */
function getTimeBoxesByInteval(start, end){
    //console.log("getTimeBoxesByInteval called");
    //console.log("start:", start, "end:", end);
    var allTimeBoxes = $('#life-calendar .time-box');
    console.assert(start.hour() === 0 && end.hour() === 0, "Hours not 0:", start, end);
    console.assert(allTimeBoxes.length > 0);
    //console.log("start and end:", start, end);
    var startMs = start.valueOf();
    var endMs = end.valueOf();
    //console.log("start and end: ", startMs, endMs);
    var timeBoxesInInterval = [];
    var intervalStartEncountered = false;
    var intervalEndEncountered = false;
    var counter = 0;
    allTimeBoxes.each(function(){
        // Can't break out of loop so return immediately if there is no reason to continue iteration.
        if(intervalEndEncountered){
            return;
        }
        var tb = $(this);
        // TODO: momenttien muodostamiseen kuluu aikaa, jos niitä tehdään paljon
        //var tbStart = dataAttrToMoment(tb, 'data-start');
        //var tbEnd = dataAttrToMoment(tb, 'data-end');
        var tbStartMs = dataAttrToEpoch(tb, 'data-start');
        var tbEndMs = dataAttrToEpoch(tb, 'data-end');
        //console.log("Time box: -----")
        //console.log("data-start:", tb.attr('data-start'));
        //console.log("data-end:", tb.attr('data-end'));
        //console.log(tbEnd, start, tbEnd.isAfter(start));
        //console.log("tb start and end:", tbStartMs, tbEndMs);
        var isInInterval = tbEndMs > startMs && tbStartMs < endMs;
        //console.log("is in interval:", tbEndMs, ">", startMs, "=", tbEndMs > startMs,
        //    "&", tbStartMs, "<", tbEndMs, "=", tbStartMs < endMs,
        //    "->", isInInterval);
        if(isInInterval){
            timeBoxesInInterval.push(tb);
        }
        counter += 1;
        if(!intervalStartEncountered){
            intervalStartEncountered = isInInterval;
        }else{
            if(!intervalEndEncountered){
                if(!isInInterval){
                    intervalEndEncountered = true;
                    return;
                }
            }
        }
        if(intervalEndEncountered){
            console.assert(false, "Bug.");
        }
    });
    console.log("getTimeBoxesByInteval: cycled thorugh", counter, "elements. Total elements:", allTimeBoxes.length);
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

function dataAttrToEpoch(jQuery, dateAttr){
    var dateString = jQuery.attr(dateAttr);
    //console.log(jQuery)
    console.assert(dateString !== undefined);
    if(dateString === dataEmptyValue){
        console.log(jQuery);
        console.assert(false, "dataEmptyValue in data attribute.");
    }
    console.assert(dateString !== dataEmptyValue);
    var asEpoch = lcUtil.ISODateStringToEpoch(dateString);
    //console.assert(asMoment.hours() === 0, "Hours not 0:", asMoment);
    return asEpoch;
}

/*
function createMomentsFromDataAttrs(){
    stringsAndMoments = {};
    var counter = 0;
    $('.time-box').each(function(){
        var self = $(this);
        var startDate = self.attr('data-start');
        console.assert(startDate !== dataEmptyValue);
        if(!stringsAndMoments.hasOwnProperty(startDate)){
            var asMoment = moment.utc(startDate);
            stringsAndMoments[startDate] = asMoment;
            console.assert(asMoment.hours() === 0, "Hours not 0:", asMoment);
            counter += 1;
        }
        var endDate = self.attr('data-end');
        console.assert(endDate !== dataEmptyValue);
        if(!stringsAndMoments.hasOwnProperty(endDate)){
            var asMoment = moment.utc(endDate);
            stringsAndMoments[endDate] = asMoment;
            console.assert(asMoment.hours() === 0, "Hours not 0:", asMoment);
            counter += 1;
        }
    });
    console.log("added", counter, "moments to stringsAndMoments.");
}
*/