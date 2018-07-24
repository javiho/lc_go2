"use strict";

let resolutionUnit = "Week"; // TODO: saatava serveriltä, ehkä samalla kertaa kuin life.
//$(initialize);
$(document).ready(initialize);

let life;
let lcOptionsForm;

//let stringsAndMoments = {}; // { "2018-01-01": moment.utc("2018-01-01"), etc. } // TODO: tämmöistä voi käyttää jos tarvitsee
//var selectedTimeBox = null; // TODO: Jos dataa laitetaan DOMiin, niin tämänkin voisi
let selectedTimeBoxes = null; // jQuery object
let visibleNotes = []; // Stores the Note objects of which are visible in the calendar.
let zoomLevel = defaultZoomLevel; // Integers. Negatives are for zooming out.
let pastFutureColoringEnabled = true;

let lastClickedSaveDeleteSubmit = ""; // TODO: pitäisi keksiä parempi tapa?

function initialize(){
    console.log("initializing");
    lcOptionsForm = $('#lc-options-form');
    // is-valid ja is-invalid -luokat näyttävät feedbackin ja punaiset reunat!
    lcOptionsForm.submit(handleLcOptionsFormSubmit);

    $('#note-changing-submit-button').click(function(){
        lastClickedSaveDeleteSubmit = "save";
    });
    $('#note-deleting-submit-button').click(function(){
        lastClickedSaveDeleteSubmit = "delete";
    });
    // TODO: miten voi tehdä niin, että voi lähettää samasta formista sekä delete että change requestin eri napeilla?
    // TODO: TÄHÄN JÄÄTIIN
    $('#note-changing-form').submit(function(e){
        let httpMethod;
        let formActionUrl;
        if(lastClickedSaveDeleteSubmit === "save") {
            httpMethod = "POST";
            formActionUrl = "/change_note";
        }else if(lastClickedSaveDeleteSubmit === "delete"){
            httpMethod = "POST"; // TODO: DELETE? mutta delete aiheuttaa ongelmia palvelinpuolella!
            formActionUrl = "/delete_note";
        }else{
            console.assert(false, "Bug.");
        }
        console.log("Change/delete note: sending this:", $(this).serialize());
        $.ajax( formActionUrl,
            {
                data: $(this).serialize(),
                method: httpMethod,
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

    $('#resolution-unit-select').change(function(){
        $(this).closest("form").submit();
    });

    $(document).click(function(e){
        const eventTargetJQuery = $(e.target);
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
            let noteVisibilityItem = eventTargetJQuery.parent(); // It's parent has the data attribute needed.
            noteRepClicked(noteVisibilityItem);
        }
        if(eventTargetJQuery.is(".js-note-visibility-item-checkbox")){
            console.log("checkbx state changedd!");
            // Note: Changing the value of an input element using JavaScript, using .val() for example, won't fire the event.
            let checked = eventTargetJQuery[0].checked;
            let noteId = eventTargetJQuery.parent().attr('data-note-id');
            let note = lifeService.getNoteById(noteId, life);
            console.assert(note !== undefined, "Note of id " + noteId + " is undefined.");
            if(checked){
                if(!visibleNotes.includes(note)){
                    visibleNotes.push(note);
                }
            }else{
                if(visibleNotes.includes(note)){
                    let originalLength = visibleNotes.length;
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

        if(eventTargetJQuery.attr('id') === showTimeColoringButtonId){
            pastFutureColoringEnabled = !pastFutureColoringEnabled;
            if(!pastFutureColoringEnabled){
                clearUncertaintyGradientColoring();
            }else{
                updatePastFutureColoring();
            }
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

function handleLcOptionsFormSubmit(e){
    console.log("form inputs:");
    console.log(lcOptionsForm.children("input, select"));

    lcOptionsForm.children("input, select").each(function(){
        if($(this).hasClass(isInvalidClass)){
            $(this).removeClass(isInvalidClass);
            console.log("handleLcOptionsFormSubmit: was invalid, but not anymore");
        }
    });

    // Basic HTML browser provided validation
    lcOptionsForm.children("input, select").each(function(){
        const isValid = $(this)[0].checkValidity(); // onko html-validaation mukaan validi?
        if(!isValid){
            $(this).addClass(isInvalidClass);
        }
    });

    // Business logic based validation
    const startInput = $('#life-start-input');
    const endInput = $('#life-end-input');
    let startInputValue = moment.utc(startInput.val());
    let endInputValue = moment.utc(endInput.val());
    let isStartValid = startInputValue.isSameOrAfter(MIN_DATE) && startInputValue.isBefore(MAX_DATE);
    let isEndValid = endInputValue.isSameOrAfter(MIN_DATE) && endInputValue.isBefore(MAX_DATE);
    if(!isStartValid){
        startInput.addClass(isInvalidClass);
        startInput.next().text("Date out of range");
    }
    if(!isEndValid){
        endInput.addClass(isInvalidClass);
        endInput.next().text("Date out of range");
    }
    console.log("end input value:");
    console.log(endInputValue);
    if(!endInputValue.isAfter(startInputValue)){
        startInput.addClass(isInvalidClass);
        endInput.addClass(isInvalidClass);
        console.log("invalid classes add'd!");
        startInput.add(endInput).next().text("Erroneous chronology");
    }

    // Act according to valid or invalid input
    let isAnyInvalid = false;
    lcOptionsForm.children("input, select").each(function(){
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
}

/*
    TODO: performanssi
    TODO: toimiiko?
    TODO: ensimmäinen luuppi riittänee jos laittaa värityksen ja sen logiikan sinne. Tosin päivämäärät voidaan haluta varastoida myöhempää käyttöä varten.
 */
function updatePastFutureColoring(){
    const now = (new Date()).getTime();

    const tbByStartEndTimesResult = getTimeBoxesByStartAndEnd();
    const timeBoxEndTimes = tbByStartEndTimesResult.endTimes;
    const lifeEndMs = life.End.valueOf();
    const lifeStartMs = life.Start.valueOf();
    const uncertaintyStart = lifeService.computeLifetimeUncertaintyStart(lifeStartMs, lifeEndMs);

    let previousKeyAsNumber = 0;
    for(let key of timeBoxEndTimes.keys()){
        const keyAsNumber = Number(key);
        console.assert(previousKeyAsNumber < keyAsNumber, "Keys are not in ascending order.");
        const tb = timeBoxEndTimes.get(key);
        if( keyAsNumber > now ){
            tb.removeClass('past-colored');
            const uncertaintyValue = lifeService.uncertaintyFunction(lifeEndMs, uncertaintyStart, keyAsNumber);
            if(uncertaintyValue > 0){
                const uncertaintySpecificShadeOfGrey = Math.ceil( (1 - uncertaintyValue) * RGB_COMPONENT_POSSIBLE_VALUES_COUNT);
                tb.css({backgroundColor: `rgb(${uncertaintySpecificShadeOfGrey}, ${uncertaintySpecificShadeOfGrey}, ${uncertaintySpecificShadeOfGrey})`});
            }else{
                tb.addClass('future-colored');
            }
        }else if(keyAsNumber < now ){
            tb.addClass('past-colored');
            tb.removeClass('future-colored');
        }else{
            console.log("updatePastFutureColoring: keyAsNumber === now");
        }
        previousKeyAsNumber = keyAsNumber;
    }
}

function clearUncertaintyGradientColoring(){
    $('#life-calendar .time-box').each(function(){
        const tb = $(this);
        tb.css({backgroundColor: ""});
    });
}

/*
    Returns Maps where keys are millisecond timestamps as strings and values are time boxes,
    and keys are ordered chronologically. Returns the Maps like this: {"startTimes": startTimesMap, "endTimes": endTimesMap}
    TODO: Kai niiden ny tarvii olla stringejä jos käyteään mappia, mut katotaan.
 */
function getTimeBoxesByStartAndEnd(){
    const timeBoxStartTimes = new Map();
    const timeBoxEndTimes = new Map();
    $('#life-calendar .time-box').each(function(){
        const tb = $(this);
        const startMs = lcHelpers.dataAttrToEpoch(tb, 'data-start');
        const startMsString = startMs.toString();
        const endMs = lcHelpers.dataAttrToEpoch(tb, 'data-end');
        const endMsString = endMs.toString();
        timeBoxStartTimes.set(startMsString, tb);
        timeBoxEndTimes.set(endMsString, tb);
    });
    return {"startTimes": timeBoxStartTimes, "endTimes": timeBoxEndTimes};
}

function zoomLifeCalendar(){
    const newTimeBoxWidth = lcHelpers.getZoomedDimension(timeBoxDefaultWidth, zoomMultiplier, zoomLevel);
    const newTimeBoxHeight = lcHelpers.getZoomedDimension(timeBoxDefaultHeight, zoomMultiplier, zoomLevel);
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
    let fsTime = performance.now();
    const timeBox = $(e.target);

    const timeBoxIsSelected = selectedTimeBoxes !== undefined && selectedTimeBoxes !== null;
    if(!(multiSelectionOn && timeBoxIsSelected)){
        if(timeBoxIsSelected){
            selectedTimeBoxes.removeClass(selectedTimeBoxRangeClass);
        }
        selectedTimeBoxes = timeBox;
        selectedTimeBoxes.addClass(selectedTimeBoxRangeClass);
    }else{
        const startOfRange = moment.utc( selectedTimeBoxes.first().attr('data-start') );
        const endOfRange = moment.utc( timeBox.attr('data-end') );
        const timeBoxesInInterval = getTimeBoxesByInterval(startOfRange, endOfRange);
        $('#life-calendar .time-box').removeClass(selectedTimeBoxRangeClass);
        timeBoxesInInterval.forEach(tb => tb.addClass(selectedTimeBoxRangeClass));
        // I can't figure out how to make a jQuery object out of array of jQuery objects in an efficient way
        // (add function is slow), so do it by selecting from DOM based on class.
        selectedTimeBoxes = $(selectedTimeBoxRangeSelector);
    }

    updateNotesDiv();
    updateNewNoteForm();

    const notesInTimeBox = lifeService.getNotesInTimeBoxInterval(timeBox, life);
    if(notesInTimeBox.length === 0){
        clearNoteChangingForm();
    }else{
        populateNoteChangingForm(notesInTimeBox[0]);
        showNoteChangingFormDiv();
    }
    console.log("timeBoxClicked took", performance.now() - fsTime);
}

function noteRepClicked(jQuery){
    const noteRep = jQuery;
    console.assert(noteRep !== undefined, "noteRep undefined");
    const id = noteRep.data("note-id");
    console.log("note rep click'd of id", id);
    const note = lifeService.getNoteById(id, life);
    console.assert(note !== undefined, "Note is undefined.");
    populateNoteChangingForm(note);
    showNoteChangingFormDiv();
}

function showNoteChangingFormDiv(){
    $('#note-changing-form-div').removeClass("collapse");
    $('#note-changing-form-div').addClass("show");
}

function possiblyClearNoteChangingAndDeletionForm(){
    const noteChangingIdInput = $('#note-changing-id');
    const currentNoteId = noteChangingIdInput.val();
    console.log("possiblyClearNoteChangingAndDeletionForm: currentNoteId:", currentNoteId);
    if(currentNoteId !== undefined && currentNoteId !== ""){
        if(!lifeService.doesNoteExist(currentNoteId, life)){
            clearNoteChangingForm();
        }
    }
}

/*
    Also populates note deletion form
    TODO: nimi vaihdettava deletionin mukaan?
 */
function populateNoteChangingForm(note){
    const start = note.Start.format(isoDateFormatString);
    const end = note.End.format(isoDateFormatString);
    const text = note.Text;
    const color = note.Color;
    const id = note.Id;
    console.assert([start, end, text, id].every(x => x !== undefined), [start, end, text, id]);
    //$('#note-changing-text-input').attr('value', text); // This doesn't work for some reason, replaced with the next line.
    $('#note-changing-text-input').val(text);
    $('#note-changing-color-input').val(color);
    $('#note-changing-start-input').attr('value', start);
    $('#note-changing-end-input').attr('value', end);
    $('#note-changing-id').attr('value', id);

    $('#note-deleting-id').attr('value', id);
}

/*
    Also clears note deletion form
    TODO: nimi vaihdettava deletionin mukaan?
 */
function clearNoteChangingForm(){
    $('#note-changing-text-input').val(noNoteSelectedString);
    $('#note-changing-color-input').val(defaultColorHex);
    $('#note-changing-start-input').attr('value', "");
    $('#note-changing-end-input').attr('value', "");
    $('#note-changing-id').attr('value', "");

    $('#note-deleting-id').attr('value', "");
}

function updateLifeComponents(){
    updateLifeOptions();
    updateLifeCalendar();
    updateNotesDiv();
    possiblyClearNoteChangingAndDeletionForm();
    updateNoteVisibilitiesDiv();
}

function updateLifeOptions(){
    $('#life-start-input').val(life.Start.format(isoDateFormatString));
    $('#life-end-input').val(life.End.format(isoDateFormatString));
    $('#resolution-unit-select').val(resolutionUnit);
}

function updateLifeCalendar(){
    //console.log("updating life calendar");
    const lifeCalendarElement = $('#life-calendar');
    const templateStorageDiv = $('#template-storage-div');
    lifeCalendarElement.empty();
    const timeBoxElement = templateStorageDiv.children('.js-time-box');
    const noteBoxElement = templateStorageDiv.children('.js-note-box');

    const timeBoxDOs = lifeService.createTimeBoxes(life, resolutionUnit); // timeBoxDataObjects
    //var newTimeBoxElements = $([]);
    const newTimeBoxElements = [];
    //console.log("thissit", newTimeBoxElements);
    timeBoxDOs.forEach(function(timeBoxDO){
        const newTimeBoxElement = timeBoxElement.clone();
        newTimeBoxElement.attr("data-start", timeBoxDO.Start.format(isoDateFormatString));
        newTimeBoxElement.attr("data-end", timeBoxDO.End.format(isoDateFormatString));
        // TODO: intervalli timeboxissa poistettu
        //var intervalElement = newTimeBoxElement.children('.js-past-future-coloring');
        //intervalElement.text( lcUtil.intervalToPresentableString(timeBoxDO.Start, timeBoxDO.End, resolutionUnit) );
        timeBoxDO.NoteBoxes.forEach(function(noteBox){
            const newNoteBoxElement = noteBoxElement.clone();
            newNoteBoxElement.attr('data-note-id', noteBox.Note.Id);
            newNoteBoxElement.text(noteBox.Note.Text);
            const noteColor = noteBox.Note.Color;
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
    let fsTime = performance.now();
    /*var firstNewTimeBoxElement = newTimeBoxElements[0];
    newTimeBoxElements.forEach(function(ntbe){
        firstNewTimeBoxElement = firstNewTimeBoxElement.add(ntbe);
    });
    //console.log("updateLifeCalendar: adding to jQuery took", performance.now() - fsTime);
    lifeCalendarElement.append(firstNewTimeBoxElement);*/
    //lifeCalendarElement.append(newTimeBoxElements);
    const arrayAsJQuery = $(newTimeBoxElements).map(function(){
        return this.toArray();
    });
    console.log("updateLifeCalendar: mapping took:", performance.now() - fsTime);
    fsTime = performance.now();
    lifeCalendarElement.append(arrayAsJQuery);
    console.log("updateLifeCalendar: adding to DOM took", performance.now() - fsTime);
    //newTimeBoxElements.appendTo(lifeCalendarElement);
    if(pastFutureColoringEnabled){
        updatePastFutureColoring();
    }
}

function updateNotesDiv(){
    console.log("updateNotesDiv called");
    const timeBoxes = selectedTimeBoxes;
    if(timeBoxes === null){
        //console.log("updateNotesDiv: timeBoxes was null. returning");
        return;
    }
    console.assert(timeBoxes !== undefined, "Bug.");
    const contentsOfTimeBoxDiv = $('#contents-of-time-box-div');
    contentsOfTimeBoxDiv.empty();
    const intervalSpan = $('#selected-time-box-interval-span');
    const startDataAttribute = selectedTimeBoxes.first().attr('data-start');
    const endDataAttribute = selectedTimeBoxes.last().attr('data-end');

    const intervalStartString = startDataAttribute;
    const intervalEndString = endDataAttribute;
    const intervalString = intervalStartString + " to " + intervalEndString;
    intervalSpan.text(intervalString);

    const intervalAgeSpan = $('#selected-time-box-interval-age-span');
    const intervalStartMoment = moment.utc(startDataAttribute);
    const intervalEndMoment = moment.utc(endDataAttribute);
    const intervalStartAgeComponents = lcUtil.getAgeAsDateComponents(life.Start, intervalStartMoment);
    const intervalEndAgeComponents = lcUtil.getAgeAsDateComponents(life.Start, intervalEndMoment);
    const intervalAgeText = `${intervalStartAgeComponents.years}y ${intervalStartAgeComponents.months}m to ` +
            `${intervalEndAgeComponents.years}y ${intervalEndAgeComponents.months}m`;
    intervalAgeSpan.text(intervalAgeText);


    const notes = lifeService.getNotesInTimeBoxesInterval(timeBoxes, life);
    //console.log("updateNotesDiv: notes:", notes);
    const noteRepElement = $('#template-storage-div .js-note-rep');
    notes.forEach(function(note){
        const newNoteRepElement = noteRepElement.clone();
        newNoteRepElement.attr('data-note-id', note.Id);
        newNoteRepElement.text(note.Text);
        newNoteRepElement.css('background-color', note.Color);
        contentsOfTimeBoxDiv.append(newNoteRepElement);
    });
}

function updateNewNoteForm(){
    //console.log("updating new note form");
    const selectedTimeBoxes = $(selectedTimeBoxRangeSelector);
    const firstSelectedTB = selectedTimeBoxes.first();
    const lastSelectedTB = selectedTimeBoxes.last();
    const selectedRangeStartDate = moment.utc( firstSelectedTB.attr('data-start') );
    const selectedRangeEndDate = moment.utc( lastSelectedTB.attr('data-end') );
    const startString = selectedRangeStartDate.format(isoDateFormatString);
    const endString = selectedRangeEndDate.format(isoDateFormatString);
    $('#new-note-start').val(startString);
    $('#new-note-end').val(endString);
}

function updateNoteVisibilitiesDiv() {
    const originalJsNoteVisibilityItem = $('#template-storage-div .js-note-visibility-item');
    console.assert(originalJsNoteVisibilityItem.length === 1, "Problems in storage area.");
    const noteVisibilityItemContainer = $('#note-visibility-item-container');
    noteVisibilityItemContainer.empty();
    life.Notes.forEach(function(note){
        const newNoteVisibilityItem = originalJsNoteVisibilityItem.clone();
        const inputDomId = lcUtil.generateUniqueId();
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
    const allTimeBoxes = $('#life-calendar .time-box');
    console.assert(start.hour() === 0 && end.hour() === 0, "Hours not 0:", start, end);
    console.assert(allTimeBoxes.length > 0);
    //console.log("start and end:", start, end);
    const startMs = start.valueOf();
    const endMs = end.valueOf();
    //console.log("start and end: ", startMs, endMs);
    const timeBoxesInInterval = [];
    let intervalStartEncountered = false;
    let intervalEndEncountered = false;
    let counter = 0;
    allTimeBoxes.each(function(){
        // Can't break out of loop so return immediately if there is no reason to continue iteration.
        if(intervalEndEncountered){
            return;
        }
        const tb = $(this);
        // TODO: momenttien muodostamiseen kuluu aikaa, jos niitä tehdään paljon
        //var tbStart = dataAttrToMoment(tb, 'data-start');
        //var tbEnd = dataAttrToMoment(tb, 'data-end');
        const tbStartMs = lcHelpers.dataAttrToEpoch(tb, 'data-start');
        const tbEndMs = lcHelpers.dataAttrToEpoch(tb, 'data-end');
        //console.log("Time box: -----")
        //console.log("data-start:", tb.attr('data-start'));
        //console.log("data-end:", tb.attr('data-end'));
        //console.log(tbEnd, start, tbEnd.isAfter(start));
        //console.log("tb start and end:", tbStartMs, tbEndMs);
        const isInInterval = tbEndMs > startMs && tbStartMs < endMs;
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