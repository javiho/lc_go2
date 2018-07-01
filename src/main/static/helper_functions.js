var lcHelpers = {};
(function(context){

    context.getZoomedDimension = function(dimensionLength, zoomMultiplier, zoomLevel){
        // If zoomLevel == 0, multiply by 1,
        // if zoomLevel > 0, multiplier increases in increasing steps,
        // if zoomLevel < 0, multiplier decreases in decreasing steps.
        var newLength = Math.pow(zoomMultiplier, zoomLevel) * dimensionLength;
        return newLength;
    };

    /*
        Pre-condition: jQuery has a valid date string as dateAttr.
     */
    context.dataAttrToEpoch = function(jQuery, dateAttr){
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
    Pre-condition: jQuery must have a valid date string as a value of dataAttr attribute.
    */
    context.dataAttrToMoment = function(jQuery, dateAttr){
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
    };

})(lcHelpers);