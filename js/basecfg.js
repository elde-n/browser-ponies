if (typeof(BrowserPoniesConfig) !== "undefined" && BrowserPoniesConfig.onbasecfg) {
    (function() {
        if (typeof(BrowserPoniesConfig.onbasecfg) === "function") {
            BrowserPoniesConfig.onbasecfg();
        } else {
            for (var i = 0, n = BrowserPoniesConfig.onbasecfg.length; i < n; ++i) {
                BrowserPoniesConfig.onbasecfg[i]();
            }
        }
    })();
}