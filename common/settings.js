"use strict"

var Settings = {
	default_synced: { // syncs if setting enabled
		numeric_interval: 2,
		graphical_interval: 1,
		primary_measure: "average" || "highest",
		medium_light_icon_text_color: "#000000",
		medium_light_icon_background: "#ffffff",
		light_icon_transparency: 0,
		medium_dark_icon_text_color: "#ffffff",
		medium_dark_icon_background: "#000000",
		dark_icon_transparency: 0,
		update_notifications: true,
	},
	default_local: { // never syncs
		sync_settings: true,
		theme: "light" || "dark",
	},
	assigned: new Set(), // changed or initialized
	changed: new Set(),
}
Settings.initialized = new Promise(function(resolve) {
	function resolver(result) {
		resolve(result)
		Settings.assigned.delete(resolver)
	}
	Settings.assigned.add(resolver)
})
Object.assign(Settings, Settings.default_local, Settings.default_synced)

chrome.storage.local.get(Settings.default_local).then(async function(local) {
	let storage = chrome.storage.local
	if(local.sync_settings) {
		storage = chrome.storage.sync
	}
	let synced = await storage.get(Settings.default_synced)
	let combined = Object.assign(local, synced)
	Object.assign(Settings, combined)
	let last
	for(let callback of Settings.assigned) {
		try {
			callback(combined)
		} catch(error) {
			if(self.reportError) {
				reportError(error)
			} else {
				last = error
			}
		}
	}
	if(last) {
		throw(last)
	}
})

// sync storage changes when modified on other devices
// disregard sync storage changes if using local settings
chrome.storage.onChanged.addListener(function(changes, bucket) {
	if(bucket == "local" || (bucket == "sync" && Settings.sync_settings)) {
		let current = {}
		for(let [ key, change ] of Object.entries(changes)) {
			if("newValue" in change && key in Settings) {
				current[key] = change.newValue
			}
			else if(key in Settings.default_synced) {
				current[key] = Settings.default_synced[key]
			} else if(key in Settings.default_local) {
				current[key] = Settings.default_local[key]
			}
		}
		Object.assign(Settings, current)
		let last
		for(let callback of Settings.changed) {
			try {
				callback(changes)
			} catch(error) {
				if(self.reportError) {
					reportError(error)
				} else {
					last = error
				}
			}
		}
		for(let callback of Settings.assigned) {
			try {
				callback(current)
			} catch(error) {
				if(self.reportError) {
					reportError(error)
				} else {
					last = error
				}
			}
		}
		if(last) {
			throw(last)
		}
	}
})