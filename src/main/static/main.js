"use strict";

var resolutionUnit = "Week"; // TODO: saatava serveriltä, ehkä samalla kertaa kuin life.
//$(initialize);
$(document).ready(initialize);

var life;
var lcOptionsForm;

var stringsAndMoments = {}; // { "2018-01-01": moment.utc("2018-01-01"), etc. }
//var selectedTimeBox = null; // TODO: Jos dataa laitetaan DOMiin, niin tämänkin voisi
var selectedTimeBoxes = null; // jQuery object
var visibleNotes = []; // Stores the Note objects of which are visible in the calendar.
var zoomLevel = defaultZoomLevel; // Integers. Negatives are for zooming out.

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
            var note = lifeService.getNoteById(noteId, life);
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
            zoomLevel = defaultZoomLevel;
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

/*
    TODO: performanssi
    TODO: toimiiko?
    TODO: ensimmäinen luuppi riittänee jos laittaa värityksen ja sen logiikan sinne. Tosin päivämäärät voidaan haluta varastoida myöhempää käyttöä varten.
 */
function updatePastFutureColoring(){
    var now = (new Date()).getTime();

    var tbByStartEndTimesResult = getTimeBoxesByStartAndEnd();
    var timeBoxEndTimes = tbByStartEndTimesResult.endTimes;
    var lifeEndMs = life.End.valueOf();
    var lifeStartMs = life.Start.valueOf();
    var uncertaintyStart = lifeService.computeLifetimeUncertaintyStart(lifeStartMs, lifeEndMs);

    //console.log("updatePastDuruterColoring: total boxes:", Object.getOwnPropertyNames(timeBoxStartTimes).length);
    //console.log("own property names:", Object.getOwnPropertyNames(timeBoxStartTimes));
    var previousKeyAsNumber = 0;
    //console.log("Keys:");
    //console.log(timeBoxEndTimes.keys());
    for(var key of timeBoxEndTimes.keys()){
        var keyAsNumber = Number(key);
        console.assert(previousKeyAsNumber < keyAsNumber, "Keys are not in ascending order.");
        let tb = timeBoxEndTimes.get(key);
        if( keyAsNumber > now ){
            tb.removeClass('past-colored');
            var uncertaintyValue = lifeService.uncertaintyFunction(lifeEndMs, uncertaintyStart, keyAsNumber);
            if(uncertaintyValue > 0){
                var uncertaintySpecificShadeOfGrey = Math.ceil( (1 - uncertaintyValue) * RGB_COMPNENT_POSSIBLE_VALUES_COUNT);
                //console.log("uncertaintySpecificShadeOfGrey:", uncertaintySpecificShadeOfGrey );
                //tb.css({backgroundColor: "blue"});
                tb.css({backgroundColor: `rgb(${uncertaintySpecificShadeOfGrey}, ${uncertaintySpecificShadeOfGrey}, ${uncertaintySpecificShadeOfGrey})`});
                //tb.css({backgroundColor: "rgb(100, 100, 100)"});
                //console.log("shold apply uncerainty color");
            }else{
                //console.log("should not apply uncertainty color");
                tb.addClass('future-colored');
            }
        }else if(keyAsNumber < now ){
            tb.addClass('past-colored');
            tb.removeClass('future-colored');
        }else{
            console.log("ITS THETSFA DSAMMSMFE!!!");
        }
        previousKeyAsNumber = keyAsNumber;
    }
}

/*
    Returns Maps where keys are millisecond timestamps as strings and values are time boxes,
    and keys are ordered chronologically. Returns the Maps like this: {"startTimes": startTimesMap, "endTimes": endTimesMap}
    TODO: Kai niiden ny tarvii olla stringejä jos käyteään mappia, mut katotaan.
 */
function getTimeBoxesByStartAndEnd(){
    var timeBoxStartTimes = new Map();
    var timeBoxEndTimes = new Map();
    $('#life-calendar .time-box').each(function(){
        let tb = $(this);
        var startMs = lcHelpers.dataAttrToEpoch(tb, 'data-start');
        var startMsString = startMs.toString();
        var endMs = lcHelpers.dataAttrToEpoch(tb, 'data-end');
        var endMsString = endMs.toString();
        timeBoxStartTimes.set(startMsString, tb);
        timeBoxEndTimes.set(endMsString, tb);
    });
    return {"startTimes": timeBoxStartTimes, "endTimes": timeBoxEndTimes};
}

function zoomLifeCalendar(){
    var newTimeBoxWidth = lcHelpers.getZoomedDimension(timeBoxDefaultWidth, zoomMultiplier, zoomLevel);
    var newTimeBoxHeight = lcHelpers.getZoomedDimension(timeBoxDefaultHeight, zoomMultiplier, zoomLevel);
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
    lifeService.datifyLifeObject(life);
    console.log("life");
    console.log(life);
    visibleNotes = life.Notes;
    //createMomentsFromDataAttrs(); // Done here in the beginning so only need to create Moments once (performance problems).
    updateLifeComponents();
    zoomLifeCalendar();
}

function timeBoxClicked(e, multiSelectionOn = false){
    console.log("time box click'd!");
    var fsTime = performance.now();
    var timeBox = $(e.target);

    var timeBoxIsSelected = selectedTimeBoxes !== undefined && selectedTimeBoxes !== null;
    if(!(multiSelectionOn && timeBoxIsSelected)){
        if(timeBoxIsSelected){
            selectedTimeBoxes.removeClass(selectedTimeBoxRangeClass);
        }
        selectedTimeBoxes = timeBox;
        selectedTimeBoxes.addClass(selectedTimeBoxRangeClass);
    }else{
        var startOfRange = moment.utc( selectedTimeBoxes.first().attr('data-start') );
        var endOfRange = moment.utc( timeBox.attr('data-end') );
        var timeBoxesInInterval = getTimeBoxesByInterval(startOfRange, endOfRange);
        $('#life-calendar .time-box').removeClass(selectedTimeBoxRangeClass);
        timeBoxesInInterval.forEach(tb => tb.addClass(selectedTimeBoxRangeClass));
        // I can't figure out how to make a jQuery object out of array of jQuery objects in an efficient way
        // (add function is slow), so do it by selecting from DOM based on class.
        selectedTimeBoxes = $(selectedTimeBoxRangeSelector);
    }

    updateNotesDiv();
    updateNewNoteForm();

    var notesInTimeBox = lifeService.getNotesInTimeBoxInterval(timeBox, life);
    if(notesInTimeBox.length === 0){
        clearNoteChangingForm();
    }else{
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
    var note = lifeService.getNoteById(id, life);
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

    var timeBoxDOs = lifeService.createTimeBoxes(life, resolutionUnit); // timeBoxDataObjects
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
    updatePastFutureColoring();
}

function updateNotesDiv(){
    var timeBoxes = selectedTimeBoxes;
    if(timeBoxes === null){
        return;
    }
    console.assert(timeBoxes !== undefined, "Bug.");
    var contentsOfTimeBoxDiv = $('#contents-of-time-box-div');
    contentsOfTimeBoxDiv.empty();
    var intervalSpan = $('#selected-time-box-interval-span');
    var startDataAttribute = selectedTimeBoxes.first().attr('data-start');
    var endDataAttribute = selectedTimeBoxes.last().attr('data-end');

    var intervalStartString = startDataAttribute;
    var intervalEndString = endDataAttribute;
    var intervalString = intervalStartString + " to " + intervalEndString;
    intervalSpan.text(intervalString);

    var intervalAgeSpan = $('#selected-time-box-interval-age-span');
    var intervalStartMoment = moment.utc(startDataAttribute);
    var intervalEndMoment = moment.utc(endDataAttribute);
    var intervalStartAgeComponents = getAgeAsDateComponents(life.Start, intervalStartMoment);
    var intervalEndAgeComponents = getAgeAsDateComponents(life.Start, intervalEndMoment);
    //console.log("life start:", life.Start, "intervalStartMoment:", intervalStartMoment, "diff:", intervalStartMoment.diff(life.Start));
    //console.log("life start:", life.Start, "intervalEndMoment:", intervalEndMoment, "diff:", intervalEndMoment.diff(life.Start));
    //var intervalStartAge = moment.duration( intervalStartMoment.diff(life.Start) );
    //var intervalEndAge = moment.duration( intervalEndMoment.diff(life.Start) );
    //var intervalAgeText = intervalStartAge.as("days") + " to " + intervalEndAge.as("days");
    var intervalAgeText = `${intervalStartAgeComponents.years}y ${intervalStartAgeComponents.months}m to ` +
            `${intervalEndAgeComponents.years}y ${intervalEndAgeComponents.months}m`;
    intervalAgeSpan.text(intervalAgeText);


    var notes = lifeService.getNotesInTimeBoxesInterval(timeBoxes, life);
    var noteRepElement = $('#template-storage-div .js-note-rep');
    notes.forEach(function(note){
        var newNoteRepElement = noteRepElement.clone();
        newNoteRepElement.attr('data-note-id', note.Id);
        newNoteRepElement.text(note.Text);
        newNoteRepElement.css('background-color', note.Color);
        contentsOfTimeBoxDiv.append(newNoteRepElement);
    });
}

/*
    Pre-condition: birth and currentMoment are Moments.
    Returns age with years, and extra months, and extra days. Returns a following kind of object:
    {years: Number, months: Number, days: Number}. Eg. when birth is 1.1.2000 and current moment is 1.1.2001,
    years is 1 and others are 0.
 */
function getAgeAsDateComponents(birth, currentMoment){
    var years = currentMoment.year() - birth.year();
    var months = currentMoment.month() - birth.month();
    var days = currentMoment.days() - birth.days();
    return {years: years, months: months, days: days};
}

function updateNewNoteForm(){
    //console.log("updating new note form");
    var selectedTimeBoxes = $(selectedTimeBoxRangeSelector);
    var firstSelectedTB = selectedTimeBoxes.first();
    var lastSelectedTB = selectedTimeBoxes.last();
    var selectedRangeStartDate = moment.utc( firstSelectedTB.attr('data-start') );
    var selectedRangeEndDate = moment.utc( lastSelectedTB.attr('data-end') );
    var startString = selectedRangeStartDate.format(isoDateFormatString);
    var endString = selectedRangeEndDate.format(isoDateFormatString);
    $('#new-note-start').val(startString);
    $('#new-note-end').val(endString);
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
    Returns timeBoxes in the DOM of which date-data is in the interval [start, end[. Returns an array.
    Pre-conditions: start and end are Moments. Timeboxes are sorted in increasing order in terms of time
    when selected with $('.time-box')

    TODO: Entä jos intervalli on pienempi kuin time boxin aikaväli?
 */
function getTimeBoxesByInterval(start, end){
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
        var tbStartMs = lcHelpers.dataAttrToEpoch(tb, 'data-start');
        var tbEndMs = lcHelpers.dataAttrToEpoch(tb, 'data-end');
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
    console.log("getTimeBoxesByInterval: cycled thorugh", counter, "elements. Total elements:", allTimeBoxes.length);
    //console.log("getTimeBoxesByInterval: there was ", timeBoxesInInterval.length, " time boxes in interval.");
    return timeBoxesInInterval;
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