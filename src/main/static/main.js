"use strict";

let resolutionUnit = "Week"; // TODO: saatava serveriltä, ehkä samalla kertaa kuin life.
//$(initialize);
$(document).ready(initialize);

let life;
let lcOptionsForm;
let lifeCalendar;
let dragSelect;

//let stringsAndMoments = {}; // { "2018-01-01": moment.utc("2018-01-01"), etc. } // TODO: tämmöistä voi käyttää jos tarvitsee
let selectedTimeBoxes = null; // jQuery object
let visibleNotes = []; // Stores the Note objects of which are visible in the calendar.
let zoomLevel = defaultZoomLevel; // Integers. Negatives are for zooming out.
let pastFutureColoringEnabled = true;

let lastClickedSaveDeleteSubmit = ""; // TODO: pitäisi keksiä parempi tapa?
let rangeSelectingInProgress = false;
let rangeSelectingInitialTimeBox = null; // TODO: pitäisi keksiä parempi tapa?
let dragSelectStartElement = null; // TODO: pitäisi keksiä parempi tapa?
let multiselectKeyPressed = false;

function initialize(){
    console.log("initializing");

    // Disable text selection in time boxes.
    window.addEventListener('selectstart', function(e){
        if($(e.target).hasClass('js-time-box')){
            e.preventDefault();
        }
    });
    lcOptionsForm = $('#lc-options-form');
    lifeCalendar = $('#life-calendar');
    // is-valid ja is-invalid -luokat näyttävät feedbackin ja punaiset reunat!
    lcOptionsForm.submit(handleLcOptionsFormSubmit);

    $('#note-changing-submit-button').click(function(){
        lastClickedSaveDeleteSubmit = "save";
    });
    $('#note-deleting-submit-button').click(function(){
        lastClickedSaveDeleteSubmit = "delete";
    });
    // TODO: miten voi tehdä niin, että voi lähettää samasta formista sekä delete että change requestin eri napeilla?
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

    $('#find-tb-input').change(function(){
        const self = $(this);
        const value = self.val();
        const valueAsMoment = moment.utc(value);
        console.log("valueAsMoment", valueAsMoment.format());
        const nextDay = valueAsMoment.clone().add(1, 'days');
        const timeBoxesAtSelectedDate = getTimeBoxesByInterval(valueAsMoment, nextDay);
        if(timeBoxesAtSelectedDate.length === 0) {
            console.log("no time boxes in selected date");
            self.addClass("is-invalid");
            return;
        }
        self.removeClass("is-invalid");
        console.assert(timeBoxesAtSelectedDate.length <= 1, "Bug: time box count:" + timeBoxesAtSelectedDate.length);
        const timeBoxAtSelectedDate = timeBoxesAtSelectedDate[0];
        selectTimeBoxes(timeBoxAtSelectedDate, true);
    });

    lcHelpers.addCollapseIconBehavior( $('#notes-control-panel'), $('#toggle-side-bar-button') );
    lcHelpers.addCollapseIconBehavior( $('#note-changing-form-div'), $('#show-note-changing-div-button') );
    lcHelpers.addCollapseIconBehavior( $('#new-note-form-div'), $('#show-new-note-form-div-button') );

    $(document).keydown(function(event){
        if(event.which = multiSelectKeyCode){
            multiselectKeyPressed = true;
        }
    });
    $(document).keyup(function(event){
        if(event.which = multiSelectKeyCode){
            multiselectKeyPressed = false;
        }
    });

    $(document).click(function(e){
        const eventTargetJQuery = $(e.target);
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
            console.assert(noteId !== dataEmptyValue && noteId !== undefined, "Invalid note id:", noteId, "event target:", eventTargetJQuery);
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
            zoomLevel += 1;
            zoomLifeCalendar()
        }
        if(eventTargetJQuery.attr('id') === zoomOutButtonId){
            zoomLevel -= 1;
            zoomLifeCalendar();
        }
        if(eventTargetJQuery.attr('id') === restoreDefaultZoomButtonId){
            zoomLevel = defaultZoomLevel;
            zoomLifeCalendar();
        }

        if(eventTargetJQuery.attr('id') === showTimeColoringButtonId){
            pastFutureColoringEnabled = !pastFutureColoringEnabled;
            if(!pastFutureColoringEnabled){
                clearUncertaintyGradientColoring();
                clearPastFutureColornig();
            }else{
                updatePastFutureColoring();
            }
        }

        if(eventTargetJQuery.is(".js-time-box")){
            // TODO: drag select muutokset hajottivat shift-monivalinnan
            /* This happens only if shift is being pressed while clicking. */
            if(e.shiftKey){
                timeBoxClicked(e, true);
            }else{
                if(rangeSelectingInProgress){
                    timeBoxClicked(e, true);
                }else{
                    timeBoxClicked(e);
                }
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
    const startInputValue = moment.utc(startInput.val());
    const endInputValue = moment.utc(endInput.val());
    const endInputValueExcl = endInputValue.add(1, 'days');
    const isStartValid = startInputValue.isSameOrAfter(MIN_DATE) && startInputValue.isBefore(MAX_DATE);
    const isEndValid = endInputValueExcl.isSameOrAfter(MIN_DATE) && endInputValueExcl.isBefore(MAX_DATE);
    if(!isStartValid){
        startInput.addClass(isInvalidClass);
        startInput.next().text("Date out of range");
    }
    if(!isEndValid){
        endInput.addClass(isInvalidClass);
        endInput.next().text("Date out of range");
    }
    console.log("end input value excl:");
    console.log(endInputValueExcl);
    // The following happens also if endInputValueExcl is invalid date, like 30.2.
    if(!endInputValueExcl.isAfter(startInputValue)){
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
        // TODO: millä logiikalla $(this) on lcOptionsForm? Näyttää olevan, mutta miksi?
        $.ajax($(this).attr("data-action"),
            {
                data: $(this).serialize(), // TODO: tähän jäätiin: pitäisikö antaa excl vai incl serverille?
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
    TODO: ensimmäinen luuppi riittänee jos laittaa värityksen ja sen logiikan sinne. Tosin päivämäärät voidaan haluta varastoida myöhempää käyttöä varten.
 */
function updatePastFutureColoring(){
    const now = (new Date()).getTime();

    const tbByStartEndTimesResult = getTimeBoxesByStartAndEnd();
    const timeBoxEndTimes = tbByStartEndTimesResult.endTimes;
    const lifeEndMs = life.End.valueOf();
    const lifeStartMs = life.Start.valueOf();
    const uncertaintyStart = lifeService.computeLifetimeUncertaintyStart(lifeStartMs, lifeEndMs);

    let previousKeyAsNumber = Number.MIN_SAFE_INTEGER;
    for(let key of timeBoxEndTimes.keys()){
        const keyAsNumber = Number(key);
        console.assert(previousKeyAsNumber <= keyAsNumber, "Keys are not in ascending order:", previousKeyAsNumber, keyAsNumber);
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
    Clears past-colored and future-colored classes, but not the uncertainty gradient.
*/
function clearPastFutureColornig(){
    $('#life-calendar .time-box').each(function(){
        $(this).removeClass('past-colored');
        $(this).removeClass('future-colored');
    });
}

/*
    Returns Maps where keys are millisecond timestamps as strings and values are time boxes,
    and keys are ordered chronologically. Returns the Maps like this: {"startTimes": startTimesMap, "endTimes": endTimesMap}
 */
function getTimeBoxesByStartAndEnd(){
    const timeBoxStartTimes = new Map();
    const timeBoxEndTimes = new Map();
    $('#life-calendar .time-box').each(function(){
        const tb = $(this);
        const startMs = lcHelpers.dataAttrToEpoch(tb, 'data-start');
        timeBoxStartTimes.set(startMs, tb);
        const endMs = lcHelpers.dataAttrToEpoch(tb, 'data-end');
        timeBoxEndTimes.set(endMs, tb);

    });
    let previousSt = Number.MIN_SAFE_INTEGER;
    for(let st of timeBoxStartTimes.keys()){

        console.assert(st >= previousSt, "Start times not ordered:", previousSt, st, typeof previousSt, typeof st);
        previousSt = st;
    }
    let previousEt = Number.MIN_SAFE_INTEGER;
    for(let et of timeBoxEndTimes.keys()){
        console.assert(et >= previousEt, "End times not ordered.");
        previousEt = et;
    }
    const timeBoxStartTimeStrings = new Map(); // Keys will be strings, values will be same as before
    const timeBoxEndTimeStrings = new Map();
    for(let [key, value] of timeBoxStartTimes){
        timeBoxStartTimeStrings.set(key.toString(), value);
    }
    for(let [key, value] of timeBoxEndTimes){
        timeBoxEndTimeStrings.set(key.toString(), value);
    }
    return {"startTimes": timeBoxStartTimeStrings, "endTimes": timeBoxEndTimeStrings};
}

function zoomLifeCalendar(){
    const newTimeBoxWidth = lcHelpers.getZoomedDimension(timeBoxDefaultWidth, zoomMultiplier, zoomLevel);
    const newTimeBoxHeight = lcHelpers.getZoomedDimension(timeBoxDefaultHeight, zoomMultiplier, zoomLevel);
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
function glueMainPageData(data) {
    console.log(typeof data);
    life = data.Life;
    console.assert(life !== undefined, "Life is undefined.");
    resolutionUnit = data.ResolutionUnit;
    if(life.Notes == null){
        life.Notes = [];
    }
    lifeService.datifyLifeObject(life);
    console.log("life");
    console.log(life);
    visibleNotes = life.Notes;
    //createMomentsFromDataAttrs(); // Done here in the beginning so only need to create Moments once (performance problems).
    updateLifeComponents();
    zoomLifeCalendar();
    refreshDragSelectObject();
}

function refreshDragSelectObject(){
    // TODO: nämä dragselectit jää hillumaan jonnekin - pitäisi jotenkin tuhota vanha kun uusi tehdään?
    const selectables = document.getElementsByClassName('js-time-box');
    console.assert(selectables.length > 0, "This is probably not supposed to happen.");
    dragSelect = new DragSelect({
        //selectables: selectables, //Selectables is not used for performance reasons.
        area: document.getElementById('life-calendar'),
        onDragStart: function(elements){
            const cursorCursorPosition = dragSelect.getCurrentCursorPosition();
            const currentGlobalCursorPosition = lcHelpers.posInElementToGlobalPos(cursorCursorPosition, lifeCalendar);
            const tbAtPosition = findTimeBoxNearSelectionCursorPosition(currentGlobalCursorPosition);
            dragSelectStartElement = tbAtPosition;
        },
        callback: function(elements){
            if(multiselectKeyPressed){
                console.log("Multiselect key pressed, so ignore drag select.");
                return;
            }
            const elementsJQuery = $(elements);
            const currentCursorPosition = dragSelect.getCurrentCursorPosition();
            const currentGlobalCursorPosition = lcHelpers.posInElementToGlobalPos(currentCursorPosition, lifeCalendar);
            const somethingSelected = true; // TODO: voiko olla toisin
            if(somethingSelected){
                const selectionStartTb = dragSelectStartElement;
                const selectionEndTb = findTimeBoxNearSelectionCursorPosition(currentGlobalCursorPosition);
                const bothSelectedTbs = $([selectionStartTb, selectionEndTb]);
                const earliestTb = getEarliestTimeBox(bothSelectedTbs);
                const earliestTbStartTime = moment.utc(earliestTb.attr('data-start'));
                const latestTb = getLatestTimeBox(bothSelectedTbs);
                const latestTbStartTime = moment.utc(latestTb.attr('data-end'));
                const tbsInInterval = getTimeBoxesByInterval(earliestTbStartTime, latestTbStartTime);
                const tbsInIntervalJQuery = lcHelpers.arrayToJQuery(tbsInInterval);
                selectTimeBoxes(tbsInIntervalJQuery, true);
            }else{
                clearTimeBoxSelection();
            }
        },
        customStyles: true
    });
}

function clearTimeBoxSelection(){
    $('#life-calendar .js-time-box').removeClass(selectedTimeBoxRangeClass);
    selectedTimeBoxes = null;
}

/*
    Pre-condition: timeBoxes is a jQuery object.
 */
function selectTimeBoxes(timeBoxes, clearPreviousSelection=false){
    if(clearPreviousSelection){
        clearTimeBoxSelection();
    }
    timeBoxes.addClass(selectedTimeBoxRangeClass);
    selectedTimeBoxes = $(selectedTimeBoxRangeSelector);

    updateNotesDiv();
    updateNewNoteForm();

    const notesInTimeBoxes = lifeService.getNotesInTimeBoxesInterval(timeBoxes, life);
    if(notesInTimeBoxes.length === 0){
        clearNoteChangingForm();
    }else{
        populateNoteChangingForm(notesInTimeBoxes[0]);
        showNoteChangingFormDiv();
    }
}

/*
    Pre-condition: date data attribute values are in ISO format yyyy-mm-dd. timeBoxes.length > 0;
    TODO: pitäisi olla jossakin Map time boxeista ja niiden ajoista että voisi käyttää sitä.
 */
function getEarliestTimeBox(timeBoxes){
    console.assert(timeBoxes.length > 0);
    let earliestTime = '9999-12-31';
    let earliestTb = null;
    timeBoxes.each(function(){
        const tb = $(this);
        const tbStartTime = tb.attr('data-start');
        console.assert(tbStartTime !== undefined && tbStartTime !== dataEmptyValue && tbStartTime !== "");
        if(tbStartTime < earliestTime){
            earliestTime = tbStartTime;
            earliestTb = tb;
        }
    });
    return earliestTb;
}

/*
    Pre-condition: date data attribute values are in ISO format yyyy-mm-dd. timeBoxes.length > 0;
    TODO: pitäisi olla jossakin Map time boxeista ja niiden ajoista että voisi käyttää sitä.
 */
function getLatestTimeBox(timeBoxes){
    console.assert(timeBoxes.length > 0);
    let latestTime = '0000-01-01';
    let latestTb = null;
    timeBoxes.each(function(){
        const tb = $(this);
        const tbEndTime = tb.attr('data-end');
        console.assert(tbEndTime !== undefined && tbEndTime !== dataEmptyValue && tbEndTime !== "");
        if(tbEndTime > latestTime){
            latestTime = tbEndTime;
            latestTb = tb;
        }
    });
    return latestTb;
}

function timeBoxClicked(e, multiSelectionOn = false){
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
        // TODO: katso tarkoitusta varten tehty funktio toisessa tiedostossa
        selectedTimeBoxes = $(selectedTimeBoxRangeSelector);

        // range selection is completed
        rangeSelectingInProgress = false;
        console.log("removed class", startRangeSelectionTimeBoxClass);
        if(rangeSelectingInitialTimeBox !== null) {
            rangeSelectingInitialTimeBox.removeClass(startRangeSelectionTimeBoxClass);
        }
        rangeSelectingInitialTimeBox = null;
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
    $('#note-changing-form-div').collapse("show");
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
    const inclEndDateString = lcHelpers.toInclusiveMoment(note.End).format(isoDateFormatString);
    const text = note.Text;
    const color = note.Color;
    const id = note.Id;
    console.assert([start, inclEndDateString, text, id].every(x => x !== undefined), [start, inclEndDateString, text, id]);
    //$('#note-changing-text-input').attr('value', text); // This doesn't work for some reason, replaced with the next line.
    $('#note-changing-text-input').val(text);
    $('#note-changing-color-input').val(color);
    $('#note-changing-start-input').attr('value', start);
    $('#note-changing-end-input').attr('value', inclEndDateString);
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
    const lifeEndClone = life.End.clone();
    const lifeEndIncl = lifeEndClone.add(-1, 'days');
    $('#life-end-input').val(lifeEndIncl.format(isoDateFormatString));
    $('#resolution-unit-select').val(resolutionUnit);
}

function updateLifeCalendar(){
    const lifeCalendarElement = $('#life-calendar');
    const templateStorageDiv = $('#template-storage-div');
    lifeCalendarElement.empty();
    const timeBoxElement = templateStorageDiv.children('.js-time-box');
    const noteBoxElement = templateStorageDiv.children('.js-note-box');

    const timeBoxDOs = lifeService.createTimeBoxes(life, resolutionUnit); // timeBoxDataObjects
    const newTimeBoxElements = [];
    //console.log("thissit", newTimeBoxElements);
    timeBoxDOs.forEach(function(timeBoxDO){
        const newTimeBoxElement = timeBoxElement.clone();
        newTimeBoxElement.attr("data-start", timeBoxDO.Start.format(isoDateFormatString));
        newTimeBoxElement.attr("data-end", timeBoxDO.End.format(isoDateFormatString));
        // TODO: intervalli timeboxissa poistettu
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
        newTimeBoxElements.push(newTimeBoxElement);
    });
    console.log("about to append ", newTimeBoxElements.length);
    let fsTime = performance.now();
    const arrayAsJQuery = $(newTimeBoxElements).map(function(){
        return this.toArray();
    });
    console.log("updateLifeCalendar: mapping took:", performance.now() - fsTime);
    fsTime = performance.now();
    lifeCalendarElement.append(arrayAsJQuery);
    console.log("updateLifeCalendar: adding to DOM took", performance.now() - fsTime);
    if(pastFutureColoringEnabled){
        updatePastFutureColoring();
    }
}

function updateNotesDiv(){
    console.log("updateNotesDiv called");
    const timeBoxes = selectedTimeBoxes;
    if(timeBoxes === null){
        return;
    }
    let isAnyTimeBoxSelected = true;
    if(timeBoxes.length === 0){
        console.log("0 selected time boxes. just saying...");
        isAnyTimeBoxSelected = false;
    }
    console.assert(timeBoxes !== undefined, "Bug.");
    const contentsOfTimeBoxDiv = $('#contents-of-time-box-div');
    contentsOfTimeBoxDiv.empty();

    const intervalSpan = $('#selected-time-box-interval-span');
    const startDataAttribute = selectedTimeBoxes.first().attr('data-start');
    const endDataAttribute = selectedTimeBoxes.last().attr('data-end');
    if(isAnyTimeBoxSelected) {
        const intervalStartString = startDataAttribute;
        const intervalEndString = endDataAttribute;

        // Reduce one day from the date string
        const intervalEndAsMoment = moment.utc(intervalEndString, isoDateFormatString);
        const inclIntervalEndString = lcHelpers.toInclusiveMoment(intervalEndAsMoment).format(isoDateFormatString);

        const intervalString = intervalStartString + " to " + inclIntervalEndString;
        intervalSpan.text("Interval " + intervalString + ". ");
    }else{
        intervalSpan.text(noIntervalSelectedString);
    }

    const intervalAgeSpan = $('#selected-time-box-interval-age-span');
    if(isAnyTimeBoxSelected) {
        const intervalStartMoment = moment.utc(startDataAttribute);
        const intervalEndMoment = moment.utc(endDataAttribute);
        const inclIntervalEndMoment = lcHelpers.toInclusiveMoment(intervalEndMoment);
        const intervalStartAgeComponents = lcUtil.getAgeAsDateComponents(life.Start, intervalStartMoment);
        const intervalEndAgeComponents = lcUtil.getAgeAsDateComponents(life.Start, inclIntervalEndMoment);
        const intervalAgeText = `${intervalStartAgeComponents.years}y ${intervalStartAgeComponents.months}m to ` +
            `${intervalEndAgeComponents.years}y ${intervalEndAgeComponents.months}m`;
        intervalAgeSpan.text("Age: " + intervalAgeText + ".");
    }else{
        intervalAgeSpan.text("");
    }

    const notes = lifeService.getNotesInTimeBoxesInterval(timeBoxes, life);
    console.log("updateNotesDiv: notes:", notes);
    if(notes.length === 0){
        contentsOfTimeBoxDiv.text(noNotesInIntervalString);
    }else {
        const noteRepElement = $('#template-storage-div .js-note-rep');
        notes.forEach(function (note) {
            const newNoteRepElement = noteRepElement.clone();
            newNoteRepElement.attr('data-note-id', note.Id);
            newNoteRepElement.text(note.Text);
            newNoteRepElement.css('background-color', note.Color);
            contentsOfTimeBoxDiv.append(newNoteRepElement);
        });
    }
}

function updateNewNoteForm(){
    const selectedTimeBoxes = $(selectedTimeBoxRangeSelector);
    const firstSelectedTB = selectedTimeBoxes.first();
    const lastSelectedTB = selectedTimeBoxes.last();
    const selectedRangeStartDate = moment.utc( firstSelectedTB.attr('data-start') );
    const selectedRangeEndDate = moment.utc( lastSelectedTB.attr('data-end') );
    const startString = selectedRangeStartDate.format(isoDateFormatString);
    const inclSelectedRangeEndDate = lcHelpers.toInclusiveMoment(selectedRangeEndDate);
    const endString = inclSelectedRangeEndDate.format(isoDateFormatString);
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
        //newNoteVisibilityItem.find('label').attr('for', inputDomId); If this if uncommented, clicking label checks the checkbox.

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
 */
function getTimeBoxesByInterval(start, end){
    console.log("getTimeBoxesByInteval called");
    console.log("start:", start, "end:", end);
    const allTimeBoxes = $('#life-calendar .time-box');
    console.assert(start.hour() === 0 && end.hour() === 0, "Hours not 0:", start, end);
    console.assert(allTimeBoxes.length > 0);
    const startMs = start.valueOf();
    const endMs = end.valueOf();
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
        const tbStartMs = lcHelpers.dataAttrToEpoch(tb, 'data-start');
        const tbEndMs = lcHelpers.dataAttrToEpoch(tb, 'data-end');
        const isInInterval = tbEndMs > startMs && tbStartMs < endMs;
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
    return timeBoxesInInterval;
}

/*
    TODO: Ei käytössä
 */
function setContrastingTimeBoxBorderColors(){
    $('#life-calendar .time-box').each(function(){
        const color = $(this).css("background-color");
        const asNumbers = lcHelpers.rgbStringToNumbers(color);
        console.assert(asNumbers.length === 3);
        const contrastingColorNumbers = lcHelpers.makeContrastingGrayColor(asNumbers);
        const borderColorCssValue = lcHelpers.rgbArrayToString(contrastingColorNumbers)
        $(this).css( {borderColor: borderColorCssValue} );
    });
}

/*
    Parameter: selectionEndPosition is relative to document.
 */
function findTimeBoxNearSelectionCursorPosition(cursorPosition){
    const limit = 1000;
    const stepPixels = 5; // TODO: voisi riippue tb:iden koosta.
    let exploredPosition = cursorPosition;
    for(let i = 0; i < limit; i++){
        const explorationResult = getTimeBoxAtPoint(exploredPosition);
        if(explorationResult.found){
            return explorationResult.timeBox;
        }
        exploredPosition = {
            x: exploredPosition.x - stepPixels,
            y: exploredPosition.y
        };
    }
    console.assert(false, "Was not able to find time box");
}

/*
    Pre-condition: coordinates has x and y. There is 0 or 1 time boxes at position.
    Parameter: coordinates are relative to document.
    Return value: {timeBox: [time box], found: Boolean}
 */
function getTimeBoxAtPoint(coordinates){
    const elements = document.elementsFromPoint(coordinates.x, coordinates.y);
    const timeBoxes = elements.filter(function(element){
        const isTimeBox = element.classList.contains('js-time-box');
        return element.classList.contains('js-time-box');
    });
    const found = timeBoxes.length > 0;
    const timeBox = found ? timeBoxes[0] : null;
    return { timeBox: timeBox, found: found };
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