"use strict";

const lcHelpers = {};
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
        const dateString = jQuery.attr(dateAttr);
        //console.log(jQuery)
        console.assert(dateString !== undefined, dateAttr, "of", jQuery, "was not found.");
        if(dateString === dataEmptyValue){
            console.log(jQuery);
            console.assert(false, "dataEmptyValue in data attribute.");
        }
        console.assert(dateString !== dataEmptyValue);
        const asEpoch = lcUtil.ISODateStringToEpoch(dateString);
        //console.assert(asMoment.hours() === 0, "Hours not 0:", asMoment);
        return asEpoch;
    }

    /*
    Pre-condition: jQuery must have a valid date string as a value of dataAttr attribute.
    */
    context.dataAttrToMoment = function(jQuery, dateAttr){
        const dateString = jQuery.attr(dateAttr);
        //console.log(jQuery)
        console.assert(dateString !== undefined);
        if(dateString === dataEmptyValue){
            console.log(jQuery);
        }
        console.assert(dateString !== dataEmptyValue);
        const asMoment = moment.utc(dateString);
        console.assert(asMoment.hours() === 0, "Hours not 0:", asMoment);
        return asMoment;
    };


    /*
        Pre-condition: parameters are jQuery objects. collapseButton contains icon as img element.
     */
    context.addCollapseIconBehavior = function(collapsingElement, collapseButton){
        const topIconSource = "/static/open-iconic/svg/chevron-top.svg";
        const bottomIconSource = "/static/open-iconic/svg/chevron-bottom.svg";
        const icon = collapseButton.find('img');
        console.assert(icon.length === 1);
        collapsingElement.on('shown.bs.collapse', function(e){
            icon.attr('src', topIconSource);
            e.stopPropagation(); // Without this the parent element of collapsingElement has it's event handler called too.
        });
        collapsingElement.on('hidden.bs.collapse', function(e){
            icon.attr('src', bottomIconSource);
            e.stopPropagation(); // Without this the parent element of collapsingElement has it's event handler called too.
        });
    };

})(lcHelpers);