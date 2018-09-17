jQuery("body").ready(function() {

    init();
    updateConfig();
    initScriptUrl();
    jQuery("#embedcode, #iframe").click(function() { this.select(); });

    jQuery("#btpx_1").click(function() { increaseNumberField.call($('iframe-width')); });
    jQuery("#btpx_2").click(function() { decreaseNumberField.call($('iframe-width')); });

    jQuery("#btpx_3").click(function() { increaseNumberField.call($('iframe-height')); });
    jQuery("#btpx_4").click(function() { decreaseNumberField.call($('iframe-height')); });

    jQuery("#btpx_5").click(function() { increaseNumberField.call($('speed')); });
    jQuery("#btpx_6").click(function() { decreaseNumberField.call($('speed')); });

    jQuery("#btpx_7").click(function() { increaseNumberField.call($('speak')); });
    jQuery("#btpx_8").click(function() { decreaseNumberField.call($('speak')); });

    jQuery("#btpx_9").click(function() { increaseNumberField.call($('volume')); });
    jQuery("#btpx_10").click(function() { decreaseNumberField.call($('volume')); });

    jQuery("#btpx_11").click(function() { increaseNumberField.call($('fps')); });
    jQuery("#btpx_12").click(function() { decreaseNumberField.call($('fps')); });

    jQuery("#btpx_13").click(function() { increaseNumberField.call($('fade')); });
    jQuery("#btpx_14").click(function() { decreaseNumberField.call($('fade')); });


    jQuery("#addcat").click(function() { showCategorySelect(); });
    jQuery("#removeallcateg").click(function() { removeAllCategories(); });
    jQuery("#setallzero").click(function() { setAllZero(); });
    jQuery("#inistojs").click(function() { inisToJS(); });





    jQuery("#paddock").change(function() { updateConfig(); });
    jQuery("#grass").change(function() { updateConfig(); });

    jQuery("#iframe-width").change(function() { numberFieldChanged.call(this, event); });
    jQuery("#iframe-height").change(function() { numberFieldChanged.call(this, event); });

    jQuery("#enableaudio").change(function() { updateConfig(); });
    jQuery("#showfps").change(function() { updateConfig(); });
    jQuery("#progressbar").change(function() { updateConfig(); });
    jQuery("#dontspeak").change(function() { updateDontSpeak(this.checked); });
    jQuery("#speed").change(function() { numberFieldChanged.call(this, event); });
    jQuery("#speak").change(function() { numberFieldChanged.call(this, event); });
    jQuery("#volume").change(function() { numberFieldChanged.call(this, event); });
    jQuery("#fps").change(function() { numberFieldChanged.call(this, event); });
    jQuery("#fade").change(function() { numberFieldChanged.call(this, event); });

    jQuery("#fileloadponies").change(function() { loadPonyFiles(this.files); });
    jQuery("#fileloadinteractions").change(function() { loadInteractionFiles(this.files); });




    jQuery("#dropzoneponies")
        .on("drop", function() { dropPony.call(this, event); })
        .on("dragover", function() { dragoverPony.call(this, event); })
        .on("dragenter", function() { dragoverPony.call(this, event); })
        .on("dragleave", function() { dragleaveDropzone.call(this, event); })
        .on("mousemove", function() { mousemoveDropzone.call(this, event); });


    jQuery("#dropzoneinteractions")
        .on("drop", function() { dropInteractions.call(this, event); })
        .on("dragover", function() { dragoverInteractions.call(this, event); })
        .on("dragenter", function() { dragoverInteractions.call(this, event); })
        .on("dragleave", function() { dragleaveDropzone.call(this, event); })
        .on("mousemove", function() { mousemoveDropzone.call(this, event); });

    jQuery("#bt_start").click(function() {
        BrowserPonies.start();
        void(0);
    });
    jQuery("#bt_stop").click(function() {
        BrowserPonies.stop();
        void(0);
    });
    jQuery("#bt_pause").click(function() {
        BrowserPonies.pause();
        void(0);
    });
    jQuery("#bt_resume").click(function() {
        BrowserPonies.resume();
        void(0);
    });
    jQuery("#bt_toggle").click(function() {
        BrowserPonies.togglePoniesToBackground();
        void(0);
    });
    jQuery("#bt_removeall").click(function() {
        BrowserPonies.unspawnAll();
        BrowserPonies.stop();
        void(0);
    });
    jQuery('[data-toggle="tooltip"]').tooltip();

    /*jQuery("body").append(
    jQuery("<div>", { id: "scrollup", class: "glyphicon glyphicon-arrow-up" }).click(function() {

        jQuery("html, body").animate({ scrollTop: 0 }, "slow");

    }).affix({ offset: { top: 575 } })
    );*/

    jQuery("[absUrl='true']").each(function() {
        jQuery(this).text(absUrl(jQuery(this).text())).removeAttr("absUrl");
    }).livequery(function() {
        jQuery(this).text(absUrl(jQuery(this).text())).removeAttr("absUrl");
    });

});