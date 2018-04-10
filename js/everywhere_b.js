jQuery("#start").click(function() {
    startPonies();
    void(0);
});

jQuery("#stop").click(function() {
    stopPonies();
    void(0);
});

jQuery("#settings").click(function() {
    toggleSettings();
    void(0);
});

jQuery("#url").click(function() {
    this.select();
});


jQuery("#speedi").click(function() {
    increaseNumberField.call($('speed'));
});

jQuery("#speedd").click(function() {
    decreaseNumberField.call($('speed'));
});

jQuery("#speaki").click(function() {
    increaseNumberField.call($('speak'));
});

jQuery("#speakd").click(function() {
    decreaseNumberField.call($('speak'));
});

jQuery("#volumei").click(function() {
    increaseNumberField.call($('volume'));
});

jQuery("#volumed").click(function() {
    decreaseNumberField.call($('volume'));
});

jQuery("#fpsi").click(function() {
    increaseNumberField.call($('fps'));
});

jQuery("#fpsd").click(function() {
    decreaseNumberField.call($('fps'));
});

jQuery("#fadei").click(function() {
    increaseNumberField.call($('fade'));
});

jQuery("#faded").click(function() {
    decreaseNumberField.call($('fade'));
});

jQuery("#addcat").click(function() {
    showCategorySelect();
});

jQuery("#removeall").click(function() {
    removeAllCategories();
});

jQuery("#setallzero").click(function() {
    setAllZero();
});

jQuery("#enableaudio, #showfps, #progressbar").change(function() {
    updateConfig();
});

jQuery("#dontspeak").change(function() {
    updateDontSpeak(this.checked);
});

jQuery("#speed, #speak, #volume, #fps, #fade").change(function() {
    numberFieldChanged.call(this, event);
});

jQuery("#editurl").submit(function(event) {
    location.hash = $('url').value;
    hideSettings();
    return false;
});

jQuery('[data-toggle="tooltip"]').tooltip();