"use strict";

const pageTitle = "Manage lives";
const pageUrl = "/life_management";

const lifeIdsAndNames = new Map();

$(initializeLifeManagement());

function initializeLifeManagement(){
    console.log("life management initialized!");
    // This is so that form action can be used without changing the URL.
    history.replaceState(null, pageTitle, pageUrl);
    const lifeSelect = $('#life-select');

    lifeSelect.find("option").each(function(){
        const lifeName = $(this).text();
        const lifeId = $(this).val();
        lifeIdsAndNames.set(lifeId, lifeName);
    });

    const lifeChangingNameInput = $('#life-changing-name-input');
    lifeChangingNameInput.val(getFirstValueOfMap(lifeIdsAndNames));
    console.log("it is done");
    lifeSelect.change(function(){
        const selectedLifeId = lifeSelect.val();
        const selectedLifeName = lifeIdsAndNames.get(selectedLifeId);
        lifeChangingNameInput.val(selectedLifeName);
        $('#selected-life-id-input').val(selectedLifeId);
    });
}

/*
    Pre-condition: map has at least one value.
 */
function getFirstValueOfMap(map){
    return map.values().next().value;
}