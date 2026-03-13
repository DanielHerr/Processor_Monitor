"use strict"

if(self.document) {
	var canvas = document.querySelector("canvas")
} else {
	importScripts("/common/settings.js", "/common/theme.mjs", "/common/cpu.js", "changelog.js")
	var font = new FontFace("Inconsolata", "url('Inconsolata_ExtraCondensed_Regular_Numeric.ttf')", { stretch: "extra-condensed" })
	self.fonts.add(font)
	var canvas = new OffscreenCanvas(32, 32)
}

if(Theme.system && chrome.offscreen) {
	var offscreen_loading = chrome.offscreen.createDocument({
		url: "/background/offscreen.html",
		justification: "Determine system theme",
		reasons: [ chrome.offscreen.Reason.MATCH_MEDIA || chrome.offscreen.Reason.DOM_SCRAPING ]
}) }

if(chrome.browserAction) {
	chrome.action = chrome.browserAction
}

chrome.runtime.onInstalled.addListener(async function(details) {
	if(details.reason == "update") {
		let version = chrome.runtime.getManifest().version.split(".").slice(0, 2).join(".")
		if(changelog[version]) {
			chrome.notifications.create("update", {
				type: "list",
				title: "Processor Monitor " + version + " Update",
				iconUrl: "/icon.png",
				message: "",
				buttons: [ { title: "Settings" }, { title: "Changelog" } ],
				items: changelog[version],
			})
		}
		if(details.previousVersion.split(".")[0] < Number(12)) {
			let oldSettings = await chrome.storage.sync.get(["browserinterval", "browsertextcolor", "browserbackground"])
			let newSettings = {}
			if(oldSettings.browserinterval !== undefined) {
				newSettings.numeric_interval = oldSettings.browserinterval
			}
			if(oldSettings.browsertextcolor) {
				newSettings.medium_light_icon_text_color = oldSettings.browsertextcolor
				newSettings.medium_dark_icon_text_color = oldSettings.browsertextcolor
			}
			if(oldSettings.browserbackground) {
				newSettings.medium_light_icon_background = oldSettings.browserbackground
				newSettings.medium_dark_icon_background = oldSettings.browserbackground
				newSettings.light_icon_transparency = 0.5
				newSettings.dark_icon_transparency = 0.5
			}
			if(Object.keys(newSettings).length > 0) {
				chrome.storage.sync.set(newSettings)
			}
		}
	}
	chrome.runtime.setUninstallURL("https://forms.DanielHerr.software/Uninstalled/Processor_Monitor")
	if(! Theme.system) {
	  if(chrome.runtime.getManifest().manifest_version == 2) {
	    var contexts = [ "browser_action" ]
	  } else {
	    var contexts = [ "action" ]
	  }
		chrome.contextMenus.create({ id: "theme", title: "Theme", type: "normal", contexts }, function() {
			chrome.contextMenus.create({ id: "light", title: "Light", parentId: "theme", type: "radio", contexts })
			chrome.contextMenus.create({ id: "dark", title: "Dark", parentId: "theme", type: "radio", contexts })
}) } })

async function calc_icon_size() {
	if(navigator.userAgent.includes("OPR")) { // Opera
		var possible = [ 1, 1.25, 1.5, 2, 2.5 ]
	} else {
		var possible = [ 1, 2 ] // Chrome, Edge, Brave, etc.
	}
	let size = 16
	function determine_size(scale) {
		for(let factor of possible) {
			if(Math.fround(scale) <= Math.fround(factor + 0.2)) {
				return 16 * factor
		} }
		return 16 * possible[possible.length - 1]
	}
	let displays = await chrome.system.display.getInfo()
	if(displays.length == 1 && self.devicePixelRatio) {
		size = determine_size(devicePixelRatio)
	} else if(displays[0].modes && displays[0].modes[0]) {
		for(let display of displays) {
			size = Math.max(size, determine_size(display.modes[0].deviceScaleFactor))
		}
	} else if(displays.length == 1 && chrome.offscreen) {
		if(self.offscreen_loading) {
			await offscreen_loading
		}
		let dpr = await chrome.runtime.sendMessage("dpr")
		size = determine_size(dpr)
	} else {
		size = 16 * possible[possible.length - 1]
	}
	return size
}

var icon = canvas.getContext("2d", { willReadFrequently: true })

function resize_icon(size) {
	icon_cache.clear()
	canvas.width = size
	canvas.height = size
	icon.textAlign = "center"
	let sizes = { 16: 23, 20: 30, 24: 36, 32: 49, 40: 62 }
	if(sizes[size]) {
		icon.font = sizes[size] + "px Inconsolata"
	} else {
		icon.font = canvas.width * 1.5625 + "px Inconsolata"
} }

var icon_cache = new Map()
var previous_usage = -1
var previous_theme = "light"

async function render_icon(usage = previous_usage, theme = previous_theme) {
	let cached = icon_cache.get(usage)
	if(cached) {
		chrome.action.setIcon({ imageData: cached })
	} else {
		icon.clearRect(0, 0, canvas.width, canvas.height)

		if(Settings[ theme + "_icon_transparency" ] > 0) {
			icon.globalAlpha = Settings[ theme + "_icon_transparency" ]
			icon.fillStyle = Settings[ "medium_" + theme + "_icon_background" ]
			icon.fillRect(0, 0, canvas.width, canvas.height)
			icon.globalAlpha = 1
		}
		icon.fillStyle = Settings[ "medium_" + theme + "_icon_text_color" ]
		let usage_string = String(usage).replace("0", "O")
		let y = canvas.height - 1
		if(usage_string.length > 1) {
			icon.fillText(usage_string[0], canvas.width / 4, y)
			usage_string = usage_string[1]
		}
		icon.fillText(usage_string, canvas.width - (canvas.width / 4), y)

		let imageData = icon.getImageData(0, 0, canvas.width, canvas.height)
		chrome.action.setIcon({ imageData })
		icon_cache.set(usage, imageData)
	}
}

async function refresh_usage(previous) {
	let theme = Theme.mode
	let { utilizations, timings } = await cpu(previous)
	let usage
	if(Settings.primary_measure == "highest") {
		usage = Math.round(Math.max(...utilizations))
	} else {
		usage = Math.round(utilizations.reduce((sum, next) => sum + next) / utilizations.length)
	}
	theme = await theme
	if(theme != previous_theme) {
		icon_cache.clear()
	}
	if(usage != previous_usage || theme != previous_theme) {
		render_icon(usage, theme)
		previous_usage = usage
		previous_theme = theme
	}
	setTimeout(refresh_usage, Settings.numeric_interval * 1000, timings)
}

async function start() {
	if(self.document) {
		var font_loading = document.fonts.load("25px Inconsolata")
	} else {
		var font_loading = font.load()
	}
	let size = await calc_icon_size()
	await Settings.initialized
	await font_loading
	resize_icon(size)
	if(self.offscreen_loading) {
		await offscreen_loading
		offscreen_loading = null
	}
	return refresh_usage()
}
start()

Settings.assigned.add(function(assigned) {
	if(Theme.system == false && assigned.theme) {
		chrome.contextMenus.update(assigned.theme, { checked: true })
	}
})

chrome.system.display.onDisplayChanged.addListener(async function() {
	let size = await calc_icon_size()
	if(size != canvas.width) {
		resize_icon(size)
		render_icon()
} })

Settings.changed.add(function(changes) {
	// todo only if icon style change
	icon_cache.clear()
	render_icon()
})

chrome.contextMenus.onClicked.addListener(function(info) {
	if(info.checked != info.wasChecked) {
		chrome.storage.local.set({ theme: info.menuItemId })
} })

chrome.notifications.onClicked.addListener(function(notification) {
	var urls = {
		"update": "/Changelog/Changelog.html",
		"error": "https://danielherr.software/Support"
	}
	chrome.tabs.create({ url: urls[notification] })
	chrome.notifications.clear(notification)
})
chrome.notifications.onButtonClicked.addListener(function(notification, button) {
	var urls = {
		"update": [ "/Settings/Settings.html", "/Changelog/Changelog.html" ],
		"error": [ "https://danielherr.software/Support" ]
	}
	chrome.tabs.create({ url: urls[notification][button] })
	chrome.notifications.clear(notification)
})

function notify_error(error) {
	chrome.notifications.create("error", {
		type: "basic",
		iconUrl: "/icon.png",
		title: "Processor Monitor Error",
		message: error,
		buttons: [{ title: "Get Support" }]
}) }
self.addEventListener("error", function({ message }) {
	notify_error(message)
})
self.addEventListener("unhandledrejection", function({ reason }) {
	notify_error(String(reason))
})

chrome.runtime.onStartup.addListener(function() {}) // fix extension not loading on startup