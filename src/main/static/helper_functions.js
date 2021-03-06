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

    context.rgbStringToNumbers = function(rgbString){
        // TODO: elegantimpi tapa voisi olla
        console.assert(rgbString !== undefined && rgbString !== "");
        //console.log("rgbString:", rgbString);
        const re = /,|\s|\(|\)/;
        const splits = rgbString.split(re);
        const numberStrings = [splits[1], splits[3], splits[5]];
        const numbers = numberStrings.map(s => parseInt(s));
        return numbers;
    };

    /*
        Pre-condition: rgbArray is array of the three RGB numbers. All of them must be the same.
     */
    context.makeContrastingGrayColor = function(rgbArray){
        console.log("rgbArray:", rgbArray);
        console.assert(rgbArray[0] === rgbArray[1] && rgbArray[1] === rgbArray[2], "Not a grayscale color.");
        const colorComponent = rgbArray[0];
        const middlePoint = 255 / 2;
        const contrastingColorComponent = colorComponent < middlePoint ? 255 : 0;
        const contrastingColor = [contrastingColorComponent, contrastingColorComponent, contrastingColorComponent];
        return contrastingColor;
    };

    /*
        Pre-condition: rgbArray is array of the three RGB numbers.
     */
    context.rgbArrayToString = function(rgbArray){
        return `rgb(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]})`;
    };

    /*
        Pre-condition: elements is a jQuery object.
     */
    context.flashElements = function(elements){
        elements.fadeOut(100);
    }

    context.playCoolBorderAnimation = function(element){
        /*element.animate({
            borderRightWidth: 3,
            borderBottomWidth: 3
        }, 1000, function(){
            element.animate({
                borderRightWidth: 2,
                borderBottomWidth: 2
            }, 1000, function(){
                console.log("completed adminautio!");
                // Clear the changes to inline styles that this animation made.
                element.css({
                    borderRightWidth: "",
                    borderBottomWidth: ""
                });
            });

        });*/
        element.animate({
            borderWidth: 3,
        }, 500, function(){
            element.animate({
                borderWidth: 2,
            }, 500, function(){
                // Clear the changes to inline styles that this animation made.
                element.css({
                    borderWidth: ""
                });
            });

        });
    };

    /*
        Pre-condition: jQueryObjectArray.length > 0. jQueryObjectArray is an array of jQuery objects.
        TODO: eikö tosiaan muka ole mitään tehokkaampaa tapaa tehdä tätä? Tämä lienee aika hidas.
     */
    context.arrayToJQuery = function(jQueryObjectArray) {
        console.assert(jQueryObjectArray.length > 0);
        /*let mergedJQuery = jQueryObjectArray[0];
        if(jQueryObjectArray.length === 1){
            return mergedJQuery;
        }
        for(let i = 1; i < jQueryObjectArray.length; i++){
            mergedJQuery = mergedJQuery.add(jQueryObjectArray[i]);
        }
        return mergedJQuery;*/

        // Adding one by one into a cumulative JQuery object would be first solution to come to mind, but it's slow.
        const arrayOfRegularElements = jQueryObjectArray.map(function (jq) {
            return jq[0];
        });
        const mergedJQuery = $(arrayOfRegularElements);
        return mergedJQuery;
    };

    /*
        Pre-condition: coordinates has numeric x and y properties. Element is a jQuery object.
        Parameter: coordinates relative to element itself.
        Return value: coordinates relative to document.
    */
    context.posInElementToGlobalPos = function(coordinates, element){
        const localX = coordinates.x;
        const localY = coordinates.y;
        const elementTopRelativeToViewport = element[0].getBoundingClientRect().top;
        const elementLeftRelativeToViewport = element[0].getBoundingClientRect().left;
        const newX = localX + elementLeftRelativeToViewport;
        const newY = localY + elementTopRelativeToViewport;
        return {x: newX, y: newY};
    };

    /*
        Pre-condition: moment is a Moment.
        Return value: a different Moment object which is a day less than moment.
     */
    context.toInclusiveMoment = function(moment){
        return moment.clone().add(-1, 'days');
    };

    /*
        Pre-condition: moment is a Moment.
        Return value: a different Moment object which is a day more than moment.
     */
    context.toExclusiveMoment = function(moment){
        return moment.clone().add(1, 'days');
    }


    /*
        Pre-condition: dateString is like 'YYYY-MM-DD'.
        Return value: date string of same format but with one day less.
     */
    context.dateStringToInclusiveDateString = function(dateString){
        const moment = moment.utc(dateString, isoDateFormatString);
        const inclMoment = lcHelpers.toInclusiveMoment(moment);
        return inclMoment.format(isoDateFormatString);
    }

})(lcHelpers);