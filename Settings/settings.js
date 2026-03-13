"use strict"

// todo throttle to chrome.storage.sync.MAX_WRITE_OPERATIONS_PER_MINUTE / 2

self.apply_setting = function(key, value) {
	if(typeof(value) == "boolean") {
		if(settingsform[key].checked != value) {
		 settingsform[key].checked = value
		}
	} else {
		if(settingsform[key].value != value) {
		 settingsform[key].value = value
} } }

document.body.style.cursor = "wait"
chrome.storage.local.get(Settings.default_local).then(async function(settings) {
	if(settings.sync_settings) {
		Object.assign(settings, await chrome.storage.sync.get(Settings.default_synced))
	} else {
		Object.assign(settings, await chrome.storage.local.get(Settings.default_synced))
	}
	for(let [ key, value ] of Object.entries(settings)) {
		apply_setting(key, value)
	}
	for(let group of settingsform.getElementsByTagName("fieldset")) {
	  group.disabled = false
	}
	document.body.style.cursor = "auto"
}).catch(function(error) {
	display_error(error.message)
	console.error(error)
})

if(! Theme.system) {
	settingsform.theme[0].disabled = false
	settingsform.theme[1].disabled = false
	settingsform.theme[0].hidden = false
	settingsform.theme[1].hidden = false
}

// may have mixed settings present in sync and local
// if sync is now enabled
	// if modified setting is in sync, copy to form
	// if modified setting is in local/form but default in sync, copy to sync
// if sync is now disabled
	// if modified setting is in local, copy to form
	// if modified setting is in sync/form but default in local, copy to local
self.transfer_settings = async function(previous, next) {
	let synced = Object.keys(Settings.default_synced)
	let previousmodified = previous.get(synced)
	let nextmodified = await next.get(synced)
	for(let [ key, value ] of Object.entries(nextmodified)) {
		apply_setting(key, value)
	}
	let differencemodified = {}
	previousmodified = await previousmodified
	for(let [ key, value ] of Object.entries(previousmodified)) {
		if(key in nextmodified == false) {
			differencemodified[key] = value
	} }
	await next.set(differencemodified)
}
self.store_setting = async function(key, value) {
	if(key in Settings.default_local || settingsform.sync_settings.checked == false) {
		if(key == "sync_settings") {
			if(value) {
    await transfer_settings(chrome.storage.local, chrome.storage.sync)
			} else {
    await transfer_settings(chrome.storage.sync, chrome.storage.local)
		} }
		await chrome.storage.local.set({ [ key ]: value })
	} else {
		await chrome.storage.sync.set({ [ key ]: value })
} }
settingsform.addEventListener("input", async function({ target }) {
	if(target.type != "range") {
		document.body.style.cursor = "progress"
		try {
			if(target.type == "checkbox") {
				await store_setting(target.name, target.checked)
			} else if(target.type != "number" || target.reportValidity()) {
				await store_setting(target.name, target.value)
			}
		} catch(error) {
			display_error(error.message)
			console.error(error)
		}
		document.body.style.cursor = "auto"
	}
})
// todo refactor to common function
settingsform.addEventListener("change", async function({ target }) {
	if(target.type == "range") {
		document.body.style.cursor = "progress"
		try {
			await store_setting(target.name, target.value)
		} catch(error) {
			display_error(error.message)
			console.error(error)
		}
		document.body.style.cursor = "auto"
	}
})

// theme can also be changed from context menu
// sync storage can also be changed from other devices
// local storage can also be change from other settings tabs
chrome.storage.onChanged.addListener(function(changes, bucket) {
 if(bucket == "local" || (bucket == "sync" && settingsform.sync_settings.checked)) {
		for(let [ key, values ] of Object.entries(changes)) {
			if("newValue" in values) {
 			apply_setting(key, values.newValue)
} } } })

settingsform.addEventListener("reset", async function(event) {
	if(confirm("Reset Processor Monitor Settings to Defaults?")) {
		document.body.style.cursor = "wait"
		for(let group of settingsform.getElementsByTagName("fieldset")) {
			group.disabled = true
		}
		try {
			if(settingsform.sync_settings.checked) {
				await chrome.storage.sync.clear()
			} else {
				await chrome.storage.local.clear()
				// form reset processed during await
				await chrome.storage.local.set({ sync_settings: false })
			}
		} catch(error) {
			display_error(error.message)
			console.error(error)
		}
		document.body.style.cursor = "auto"
		for(let group of settingsform.getElementsByTagName("fieldset")) {
			group.disabled = false
		}
 } else {
  event.preventDefault()
} })

function display_error(error) {
	error_message.textContent = error
	error_dialog.showModal()
}
self.addEventListener("error", function({ message }) {
	display_error(message)
})
self.addEventListener("unhandledrejection", function({ reason }) {
	display_error(String(reason))
})

// todo disable notification settings if permission revoked