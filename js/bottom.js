jQuery("body").append(
    jQuery("<div>", { id: "scrollup", class: "glyphicon glyphicon-arrow-up" }).click(function() {

        jQuery("html, body").animate({ scrollTop: 0 }, "slow");

    }).affix({ offset: { top: 575 } })
);


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

jQuery("#bookmarks, #bookmarklet").click(function() {
    void(0);
});
