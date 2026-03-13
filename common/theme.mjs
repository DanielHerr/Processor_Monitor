"use strict"

self.Theme = {
	system: false,
	mode: "light" || "dark"
}

// dark/light theme system mode shipped on Chrome OS 104, Linux Chrome 114, prefers-color-scheme shipped on Chrome 76
let linux = navigator.userAgent.includes("Linux")
let cros = navigator.userAgent.includes("CrOS")
if(linux || cros) {
	if(navigator.userAgentData) { // Chromium 90
		let version = navigator.userAgentData.brands.find(entry => entry.brand == "Chromium").version
		Theme.system = (linux && version >= 114) || (cros && version >= 104)
	}
} else if(self.matchMedia) {
	Theme.system = matchMedia("(prefers-color-scheme: light), (prefers-color-scheme: dark)").matches
} else {
	Theme.system = true // Mv3 Windows or Mac
}

if(Theme.system && self.matchMedia) {
	Object.defineProperty(Theme, "mode", {
		get: () => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
	})
} else if(Theme.system && chrome.offscreen) {
	Object.defineProperty(Theme, "mode", {
		get: async() => chrome.runtime.sendMessage("theme")
	})
} else {
	Object.defineProperty(Theme, "mode", {
		get: () => Settings.theme
}) }