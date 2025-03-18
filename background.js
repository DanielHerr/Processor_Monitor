"use strict"

var panel = 0;
var iconinterval = 1000;
var barinterval = 1000;
var clickbar = false;
var clickpanel = true;
var autoinject = false;
var textcolor = "#000000";
var background = "#ffffff";
var notified = false;
var high = 100;
var iconinfo = false;
var barinfo = false;
var canvas = (new OffscreenCanvas(19, 19)).getContext("2d", { willReadFrequently: true })

chrome.runtime.onInstalled.addListener(function({ reason }) {
 if(reason == "install") {
  chrome.tabs.create({ url: "options.html" })
 } else if(reason == "update") {
	let version = chrome.runtime.getManifest().version
  if(version == "11.0.5") {
   chrome.notifications.create({ type: "basic", iconUrl: "icon.png",
    title: "Processor Monitor 11.0.5 Update", message: "Fixed usage calculation with hyperthreading disabled"
   })
  } else if(version.startsWith("11.1")) {
		chrome.notifications.create({ type: "basic", iconUrl: "icon.png",
			title: "Processor Monitor 11.1 Update", message: "Migrated to Mv3. Future versions will remain supported on Mv2 via separate install."
		 })
	}
 }
 chrome.runtime.setUninstallURL("https://forms.danielherr.software/Uninstalled/Processor_Monitor")
})

function open() {
  chrome.windows.create({ url: "panel.html", type: "panel", width: 100, height: 100
  }, function(window) { if (window.type === "panel") {
    chrome.windows.update(window.id, { state: "minimized"});
    panel = window.id;
  } else {
    chrome.windows.remove(window.id);
} } ) }

function options() { chrome.storage.sync.get({
  browserinterval: 1, barinterval: 1, clickbar: false, clickpanel: true, high: 100,
  browsertextcolor: "#000000", browserbackground: "#ffffff", autopanel: false
}, function(items) {
    iconinterval = items.browserinterval * 1000;
    barinterval = items.barinterval * 1000;
    textcolor = items.browsertextcolor;
    background = items.browserbackground;
    clickbar = items.clickbar;
    clickpanel = items.clickpanel;
    high = items.high
    if (items.autopanel == true) {
      chrome.runtime.sendMessage("kbilomlpmhhhaimaigidhnjijhiajbam", { launch: true })
} } )}

options()
chrome.storage.onChanged.addListener(options);

chrome.notifications.onClicked.addListener(function() {
  chrome.tabs.create({ url: "options.html"});
})

chrome.notifications.onClosed.addListener(function() { notified = false });

function infoicon() {
  chrome.system.cpu.getInfo(function(info) {
    var totalusage = 0;
    let corecount = 0
    for (var number = 0; number < info.numOfProcessors; number++) {
      var usage = info.processors[number].usage;
      if (iconinfo != false) {
        var oldUsage = iconinfo.processors[number].usage;
        var user = (oldUsage.user - usage.user) / (oldUsage.total - usage.total) * 100;
        var kernel = (oldUsage.kernel - usage.kernel) / (oldUsage.total - usage.total) * 100;
        if(Number.isNaN(user + kernel) == false) {
         totalusage = totalusage + user + kernel
         corecount++
        }
      } else {
        var user = usage.user / usage.total * 100;
        var kernel = usage.kernel / usage.total * 100;
        if(Number.isNaN(user + kernel) == false) {
         totalusage = totalusage + user + kernel
         corecount++
        }
    } }
    iconinfo = info;
    var percent = Math.round(totalusage / corecount);
    canvas.clearRect(0, 0, 19, 19);
    canvas.fillStyle = background;
    canvas.fillRect(0, 0, 19, 19);
    canvas.fillStyle = textcolor;
    if (percent < 10) {
      canvas.font = "20px Noto Sans, sans-serif";
      canvas.fillText(percent.toString()[0], -1, 16);
      canvas.font = "12px Noto Sans, sans-serif";
      canvas.fillText("%", 9, 14);
    }
    else if (percent == 100) {
      canvas.font = "16px Noto Sans, sans-serif";
      canvas.fillText("1", -3, 15);
      canvas.fillText("0", 3, 15);
      canvas.fillText("0", 11, 15);
    } else {
      canvas.font = "20px Noto Sans, sans-serif";
      canvas.fillText(percent.toString()[0], -1, 16);
      canvas.fillText(percent.toString()[1], 9, 16);
    }
    if (high < 100 && percent > high && notified === false) {
      chrome.notifications.create("highcpu", {
        type: "progress", title: "Processor Monitor", message: "Warning! Your CPU usage is high!", iconUrl: "icon.png", progress: percent
      }, function() { notified = true }
    ) }
    else if (high < 100 && percent > high && notified === true) {
      chrome.notifications.update("highcpu", { progress: percent }, function() { } );
    }
    else if (high < 100 && notified === true) { chrome.notifications.clear("highcpu",
      function() { notified = false }
    ) }
    chrome.action.setTitle({ title: "Usage: " + percent + " % " + "Processors: " + info.numOfProcessors });
    chrome.action.setIcon({ imageData: canvas.getImageData(0, 0, 19, 19)});
  });
  setTimeout(infoicon, iconinterval);
}
infoicon()

function infobar() {
	if(clickbar || autoinject) {
  chrome.system.cpu.getInfo(function(info) {
    chrome.tabs.query({ active: true }, function(tabs) {
    var totalusage = 0;
    for (var number = 0; number < info.numOfProcessors; number++) {
      var usage = info.processors[number].usage;
      if (barinfo != false) {
        var oldUsage = barinfo.processors[number].usage;
        var user = (oldUsage.user - usage.user) / (oldUsage.total - usage.total) * 100;
        var kernel = (oldUsage.kernel - usage.kernel) / (oldUsage.total - usage.total) * 100;
        totalusage = totalusage + user + kernel;
      } else {
        var user = usage.user / usage.total * 100;
        var kernel = usage.kernel / usage.total * 100;
        totalusage = totalusage + user + kernel;
    } }
    barinfo = info;
    var percent = Math.round(totalusage / info.numOfProcessors);
    for (var number in tabs) {
      chrome.tabs.sendMessage(tabs[number].id, { usage: percent });
  } }) })
	}
  setTimeout(infobar, barinterval);
}
infobar()

function inject() { if (autoinject === true) {
  chrome.tabs.query({}, function(tabs) {
    for (var number in tabs) {
      chrome.scripting.executeScript({ target: { tabId: tabs[number].id }, files: [ "inject.js" ]})
} }) }}

function permissions() {
 chrome.permissions.contains({
  origins: ["<all_urls>"] }, function(result) {
    if (result) { autoinject = true;
    chrome.tabs.onCreated.addListener(inject);
    chrome.tabs.onUpdated.addListener(inject);
    chrome.tabs.onReplaced.addListener(inject);
    }
    else { autoinject = false }
} )}

permissions()
chrome.permissions.onAdded.addListener(permissions)

chrome.action.onClicked.addListener(function(tab) {
  if (clickbar === true && autoinject === false) {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [ "inject.js" ]})
  }
  if (clickpanel == true) {
	  chrome.runtime.sendMessage("kbilomlpmhhhaimaigidhnjijhiajbam", { launch: true })
} });

chrome.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
  chrome.tabs.create({ url: "options.html"}, function() {
    sendResponse({ opened: true })
}) });

chrome.contextMenus.create({ id: "panel", title: "Install Floating Panel App", contexts: ["browser_action"] })

chrome.contextMenus.onClicked.addListener(function() {
  chrome.tabs.create({ url: "https://chrome.google.com/webstore/detail/kbilomlpmhhhaimaigidhnjijhiajbam"})
})