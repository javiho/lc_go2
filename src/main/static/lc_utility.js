"use strict";

const isoDateFormatString = "YYYY-MM-DD";
const noNoteSelectedString = "(No note selected)";
const noIntervalSelectedString = "(No interval selected)";
const noNotesInIntervalString = "(No notes in selected interval)";
const defaultColorHex = '#AAAAAA';
const topIconSource = "/static/open-iconic/svg/chevron-top.svg";
const bottomIconSource = "/static/open-iconic/svg/chevron-bottom.svg";
const dataEmptyValue = '(empty)';
const selectedTimeBoxRangeSelector = '.selected-time-box-range';
const selectedTimeBoxRangeClass = 'selected-time-box-range';
//const momentJsDateFormatToken = "YYYY-MM-DD";
const zoomInButtonId = 'zoom-in-button';
const zoomOutButtonId = 'zoom-out-button';
const restoreDefaultZoomButtonId = 'restore-default-zoom-button';
const showTimeColoringButtonId = "show-time-coloring-button";
//const showNoteChangingDivButton = "show-note-changing-div-button";
const selectedTimeBoxClass = 'selected-time-box';
//const dragstartTimeBoxClass = 'dragstart-time-box';
const startRangeSelectionTimeBoxClass = 'start-range-selection-time-box';
const dragendTimeBoxClass = 'dragend-time-box';
//const zoomStep = 10; //px
const zoomMultiplier = 1.2;
const defaultZoomLevel = -8;
const timeBoxDefaultWidth = 49;
const timeBoxDefaultHeight = 49;
const isInvalidClass = "is-invalid";
const multiSelectKeyCode = 16; // Shift key

const timeUnits = {
    Day: "Day",
    Week: "Week",
    Month: "Month",
    Year: "Year"
};
const MAX_DATE = moment.utc("2200-01-01");
const MIN_DATE = moment.utc("1910-01-01");

const RGB_COMPONENT_POSSIBLE_VALUES_COUNT = 256;

// TODO: miksi on sekä tämä tiedosto että helpperit???

const lcUtil = {};
(function(context){

    /*
    Gets the date part of ISO datetime string.
    */
    context.shortenISODateString = function(longDateString){
        return longDateString.split("T")[0];
    };

    /*
        Pre-condition: shortDateString is valid ISO date string.
        Returns milliseconds based on shortDateString.
     */
    context.ISODateStringToEpoch = function(shortDateString){
        const componentStrings = shortDateString.split("-");
        const y = Number(componentStrings[0]);
        const m = Number(componentStrings[1]) - 1; // In js months are 0 indexed although years and days are not lol.
        const d = Number(componentStrings[2]);
        const date = Date.UTC(y, m, d, 0, 0, 0);
        //console.log("ISODateStringToEpoch date: ", date);
        return date;
    };

    context.generateUniqueId = function(){
        const timePart = new Date().getTime().toString(36); // TODO: Miksi juuri 36?
        const randomPart = Math.random().toString(36).substring(2); // The two first chars are '0' and '.'.
        return "rid-" + timePart + "-" + randomPart;
    };

    /*
    Date is a date in a interval it's included in. The interval is specified by timeUnit, eg. a month.
    Returns the first date of that interval.
    */
    context.getFirstDateOfTimeUnit = function(date, timeUnit){
        const dateClone = date.clone();
        let firstDate;
        if(timeUnit === timeUnits.Month){
            firstDate = dateClone.startOf("month");
        }else if(timeUnit === timeUnits.Year){
            firstDate = dateClone.startOf("year");
        }else if(timeUnit === timeUnits.Week){
            firstDate = dateClone.startOf("isoWeek");
        }else if(timeUnit === timeUnits.Day){
            firstDate = dateClone.startOf("day");
        }else{
            console.assert(false, "Time unit doesn't exist");
            return;
        }
        //console.log("firstDate: ", firstDate.format());
        console.assert(firstDate.hours() === 0, "Hours is not 0.");
        return firstDate;
    };

    context.addTimeUnit = function(baseMoment, timeUnitToAdd){
        const momentClone = baseMoment.clone();
        if(timeUnitToAdd === timeUnits.Day){
            return momentClone.add(1, "days");
        }
        if(timeUnitToAdd === timeUnits.Month){
            return momentClone.add(1, "months");
        }
        if(timeUnitToAdd === timeUnits.Year){
            return momentClone.add(1, "years");
        }
        if(timeUnitToAdd === timeUnits.Week){
            return momentClone.add(1, "weeks");
        }
        console.assert(false, "Time unit doesn't exist.");
    };

    context.intervalToPresentableString = function(d1, exclusiveD2, resolutionUnit){
        return d1.format(isoDateFormatString) + " - " + exclusiveD2.format(isoDateFormatString);
        /*
        Precondition: if resolutionUnit == Day, d1 == d2.
        (date1, date2, Day) -> 01.01.2018
        (date1, date2, Week) -> Week 1 of 2018 (vuodenvaihteessa ks. https://golang.org/pkg/time/#Time.ISOWeek)
        (date1, date2, Month) -> 1/2018
        year no mikäköhän
         */
        /* TODO
        d2 := exclusiveD2.AddDate(0, 0, -1) // Now d1 and d2 should be in same resolutionUnit.
        if resolutionUnit == Day{
            if d1 != d2{
                log.Panic("resolutionUnit == Day, d1 != d2")
            }
            return d1.Format(yyMMddLayout)
        }else if resolutionUnit == Week{
            year, week := d1.ISOWeek()
            _, week2 := d2.ISOWeek()
            if week != week2{
                log.Panic("dates in different week")
            }
            return strconv.Itoa(year) + "W" + strconv.Itoa(week)
        }else if resolutionUnit == Month{
            year, month, _ := d1.Date()
            _, month2, _ := d2.Date()
            if month != month2{
                log.Panic("dates in different month")
            }
            return strconv.Itoa(int(month)) + "/" + strconv.Itoa(year)
        }else if resolutionUnit == Year{
            year, _, _ := d1.Date()
            year2, _, _ := d2.Date()
            if year != year2{
                log.Panic("dates in different year")
            }
            return strconv.Itoa(year)
        }
        log.Panic("bug")
        return ""
        */
    };

    /*
        Pre-condition: removed and array are not undefined.
        Returns an array without the removed element, or elements if there are several same elements.
     */
    context.arrayWithoutElement = function(removed, array){
        console.assert(removed !== undefined);
        console.assert(array !== undefined);
        return array.filter(element => element !== removed);
    };

    /*
        Pre-condition: birth and currentMoment are Moments.
        Returns age with years, and extra months, and extra days. Returns a following kind of object:
        {years: Number, months: Number, days: Number}. Eg. when birth is 1.1.2000 and current moment is 1.1.2001,
        years is 1 and others are 0.
    */
    context.getAgeAsDateComponents = function(birth, currentMoment){
        const years = currentMoment.year() - birth.year();
        const months = currentMoment.month() - birth.month();
        const days = currentMoment.days() - birth.days();
        return {years: years, months: months, days: days};
    }

})(lcUtil);