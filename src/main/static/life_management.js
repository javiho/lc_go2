"use strict";

const lifeIdsAndNames = new Map();

$(initializeLifeManagement());

function initializeLifeManagement(){
    console.log("life management initialized!");
    const lifeSelect = $('#life-select');

    lifeSelect.find("option").each(function(){
        const lifeName = $(this).text();
        const lifeId = $(this).val();
        lifeIdsAndNames.set(lifeId, lifeName);
    });

    const lifeChangingNameInput = $('#life-changing-name-input');
    lifeSelect.change(function(){
        const selectedLifeId = lifeSelect.val();
        const selectedLifeName = lifeIdsAndNames.get(selectedLifeId);
        lifeChangingNameInput.val(selectedLifeName)
        $('#selected-life-id-input').val(selectedLifeId);
    });
}