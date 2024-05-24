
// This code is the intellectual property of Daniel Stephen Herr.

var panel = 0;
var iconinterval = 1000;
var barinterval = 1000;
var clickbar = true;
var clickicon = true;
var clickpanel = true;
var autoinject = false;
var textcolor = "#000000";
var background = "#ffffff";
//var notosans = false;
var notified = false;
var high = 100;
var iconinfo = false;
var barinfo = false;
var canvas = document.createElement("canvas").getContext("2d");

chrome.runtime.onInstalled.addListener(function({ reason }) {
 if(reason == "install") {
  chrome.tabs.create({ url: "options.html" })
 } else if(reason == "update") {
  if(chrome.runtime.getManifest().version == "11.0.5") {
   chrome.notifications.create({ type: "basic", iconUrl: "icon.png",
    title: "Processor Monitor 11.0.5 Update", message: "Fixed usage calculation with hyperthreading disabled"
   })
  }
 }
/*  if(details.reason == "install") {
    chrome.fontSettings.getFontList(function(results) {
      for (number = 0; number < results.length; number++) {
        if (results[number].displayName == "Noto Sans") { notosans = true }
      }
      if (notosans === false) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = "blob";
        xhr.open("GET", "https://googledrive.com/host/0B9_ds1FPyRuZNUpaOFhfeXhjNXc/NotoSans.ttf");
        xhr.onload = function() {
          window.webkitRequestFileSystem(window.PERSISTENT, 410 * 1024, function(fileSystem) {
            fileSystem.root.getFile("noto.ttf", { create: true }, function(fileEntry) {
              fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function() {
                  document.head.insertAdjacentHTML("beforeend", "<style> @font-face { font-family: Noto; src: url(" + fileEntry.toURL() + "); } </style>");
                };
                fileWriter.write(xhr.response);
        }) }) }) };
        xhr.send();
} }) }*/
});

/*window.addEventListener("load", function() {
  chrome.fontSettings.getFontList(function(results) {
    for (var number = 0; number < results.length; number++) {
      if (results[number].displayName == "Noto Sans") { notosans = true }
    }
    if (notosans === false) {
      window.webkitResolveLocalFileSystemURL("filesystem:chrome-extension://ihfhbddglfpbodgoalhmljdneofejjnd/persistent/noto.ttf", function(fileEntry) {
        document.head.insertAdjacentHTML("beforeend", "<style> @font-face { font-family: Noto; src: url(" + fileEntry.toURL() + "); } </style>");
}) } }) });*/

chrome.windows.onRemoved.addListener(function(windowId) {
  if (windowId == panel) { panel = 0 }
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
  browserinterval: 1, barinterval: 1, clickbar: true, clickicon: true, clickpanel: true, high: 100,
  browsertextcolor: "#000000", browserbackground: "#ffffff", autoicon: false, autopanel: false
}, function(items) {
    iconinterval = items.browserinterval * 1000;
    barinterval = items.barinterval * 1000;
    textcolor = items.browsertextcolor;
    background = items.browserbackground;
    clickbar = items.clickbar;
    clickicon = items.clickicon;
    clickpanel = items.clickpanel;
    high = items.high
    if (items.autoicon == true && panel == 0) { open()}
    if (items.autopanel == true) {
      chrome.runtime.sendMessage("kbilomlpmhhhaimaigidhnjijhiajbam", { launch: true })
} } )}

window.addEventListener("load", options);
chrome.storage.onChanged.addListener(options);

chrome.notifications.onClicked.addListener(function() {
  chrome.tabs.create({ url: "options.html"});
});

chrome.notifications.onClosed.addListener(function() { notified = false });

window.addEventListener("load", function infoicon() {
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
    chrome.browserAction.setTitle({ title: "Usage: " + percent + " % " + "Processors: " + info.numOfProcessors });
    chrome.browserAction.setIcon({ imageData: canvas.getImageData(0, 0, 19, 19)});
  });
  setTimeout(infoicon, iconinterval);
});

window.addEventListener("load", function infobar() {
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
  } }) });
  setTimeout(infobar, barinterval);
});

function inject() { if (autoinject === true) {
  chrome.tabs.query({}, function(tabs) {
    for (var number in tabs) {
      chrome.tabs.executeScript(tabs[number].id, { file: "inject.js"});
} }) }}

function permissions() {
 chrome.permissions.contains({
  /*permissions: ["tabs"],*/ origins: ["<all_urls>"] }, function(result) {
    if (result) { autoinject = true;
    chrome.tabs.onCreated.addListener(inject);
    chrome.tabs.onUpdated.addListener(inject);
    chrome.tabs.onReplaced.addListener(inject);
    }
    else { autoinject = false }
} )}

window.addEventListener("load", permissions);
chrome.permissions.onAdded.addListener(permissions);

chrome.browserAction.onClicked.addListener(function() {
  if (clickbar === true && autoinject === false) {
    chrome.tabs.executeScript({ file: "inject.js"});
  }
  if (clickicon === true) { open()}
  if (clickpanel == true) {
	  chrome.runtime.sendMessage("kbilomlpmhhhaimaigidhnjijhiajbam", { launch: true })
} });

chrome.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
  chrome.tabs.create({ url: "options.html"}, function() {
    sendResponse({ opened: true })
}) });

chrome.contextMenus.create({ id: "shelf", title: "Enable Bottom Shelf Icon", contexts: ["browser_action"], onclick: function() {
  chrome.tabs.create({ url: "chrome://flags/#enable-panels"})
}});
chrome.contextMenus.create({ id: "panel", title: "Install Floating Panel App", contexts: ["browser_action"], onclick: function() {
  chrome.tabs.create({ url: "https://chrome.google.com/webstore/detail/kbilomlpmhhhaimaigidhnjijhiajbam"})
}});