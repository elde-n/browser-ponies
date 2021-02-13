for (const item in BrowserPoniesBaseConfig.ponies) {
    BrowserPoniesBaseConfig.ponies[item].baseurl = 'https://browser.pony.house/' + BrowserPoniesBaseConfig.ponies.ponies[item].baseurl;
}