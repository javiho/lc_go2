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

    const selectedLifeIdInput = $('#selected-life-id-input');
    const lifeChangingNameInput = $('#life-changing-name-input');
    const goToLifeFormSelectedIdInput = $('#go-to-life-form-selected-id-input');
    const firstLife = getFirstKeyValuePairOfMap(lifeIdsAndNames);
    selectedLifeIdInput.val(firstLife.key);
    lifeChangingNameInput.val(firstLife.value);
    goToLifeFormSelectedIdInput.val(firstLife.key);

    lifeSelect.change(function(){
        const selectedLifeId = lifeSelect.val();
        const selectedLifeName = lifeIdsAndNames.get(selectedLifeId);
        lifeChangingNameInput.val(selectedLifeName);
        selectedLifeIdInput.val(selectedLifeId);
        goToLifeFormSelectedIdInput.val(selectedLifeId);
    });

    $('#go-to-life-button').click(function(){
        const selectedLifeId = lifeSelect.val();
        // TODO: navigointi
    });
}

/*
    Pre-condition: map has at least one value.
 */
function getFirstKeyValuePairOfMap(map){
    let keyValuePair;
    for(let [key, value] of map.entries()){
        keyValuePair = {key: key, value: value};
        break;
    }
    return keyValuePair;
    //return map.values().next().value;
}