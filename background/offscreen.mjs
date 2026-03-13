var theme = matchMedia("(prefers-color-scheme: dark)")

chrome.runtime.onMessage.addListener(function(message, sender, respond) {
	if(message == "theme") {
		respond(theme.matches ? "dark" : "light")
	} else if(message == "dpr") {
		respond(devicePixelRatio)
} })