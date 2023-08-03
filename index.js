const base_config = config

BrowserPonies.loadConfig(base_config)
BrowserPonies.start()

var ponies = ["Rainbow Dash", "Twilight Sparkle", "Starlight Glimmer", "Flutteryshy", "Trixie"]
for (var i = 0; i < ponies.length; i++) {
	BrowserPonies.spawn(ponies[i], 1)
}

