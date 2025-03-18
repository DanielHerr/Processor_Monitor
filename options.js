"use strict"

var app = false;

chrome.runtime.sendMessage("kbilomlpmhhhaimaigidhnjijhiajbam", { installed: true }, function(response) {
  if (response) { app = true }
  else { app = false }
})

chrome.storage.sync.get({
  clickpanel: true, clickbar: false, autopanel: false, high: 100,
  paneltextcolor: "#000000", panelbackground: "#ffffff", browsertextcolor: "#000000", browserbackground: "#ffffff",
  bartextcolor: "#000000", barbackground: "#ffffff",
  browserinterval: 1, shelfinterval: 1, panelinterval: 1, barinterval: 1, panelsize: 20, barsize: 20
}, function(items) {
  document.querySelector("#clickpanel").checked = items.clickpanel;
  document.querySelector("#clickbar").checked = items.clickbar;
  document.querySelector("#autopanel").checked = items.autopanel;
  document.querySelector("#browsertextcolor").value = items.browsertextcolor;
  document.querySelector("#browserbackground").value = items.browserbackground;
  document.querySelector("#paneltextcolor").value = items.paneltextcolor;
  document.querySelector("#panelbackground").value = items.panelbackground;
  document.querySelector("#bartextcolor").value = items.bartextcolor;
  document.querySelector("#barbackground").value = items.barbackground;
  document.querySelector("#browserinterval").value = items.browserinterval;
  document.querySelector("#panelinterval").value = items.panelinterval;
  document.querySelector("#barinterval").value = items.barinterval;
  document.querySelector("#panelsize").value = items.panelsize;
  document.querySelector("#barsize").value = items.barsize;
  document.querySelector("#notify").value = items.high;
});

chrome.system.cpu.getInfo(function(info) {
  document.querySelector("#processors").innerText = info.numOfProcessors;
});

chrome.permissions.contains({ origins: ["<all_urls>"] }, function(result) {
  if (result) { document.querySelector("#autobar").checked = true; }
});

document.querySelector("form").addEventListener("reset", function(event) {
  event.preventDefault();
  var reset = confirm("Are you sure you want to reset all options?");
  if (reset == true) {
    chrome.storage.sync.clear(function() { chrome.tabs.reload()});
} });

document.querySelector("#permissions").addEventListener("click", function(){
  if (document.querySelector("#autobar").checked === true) {
  chrome.permissions.request({ origins: ["<all_urls>"]}, function(granted) {
    if (granted) {}
    else { document.querySelector("#autobar").checked = false }
  }) }
  else { chrome.permissions.remove({ origins: ["<all_urls>"]}) }
});

document.querySelector("form").addEventListener("submit", function(event) {
  event.preventDefault();
  chrome.storage.sync.set({
    clickpanel: document.querySelector("#clickpanel").checked,
    clickbar: document.querySelector("#clickbar").checked,
    autopanel: document.querySelector("#autopanel").checked,
    browsertextcolor: document.querySelector("#browsertextcolor").value,
    browserbackground: document.querySelector("#browserbackground").value,
    paneltextcolor: document.querySelector("#paneltextcolor").value,
    panelbackground: document.querySelector("#panelbackground").value,
    bartextcolor: document.querySelector("#bartextcolor").value,
    barbackground: document.querySelector("#barbackground").value,
    browserinterval: document.querySelector("#browserinterval").value,
    panelinterval: document.querySelector("#panelinterval").value,
    barinterval: document.querySelector("#barinterval").value,
    panelsize: document.querySelector("#panelsize").value,
    barsize: document.querySelector("#barsize").value,
    high: document.querySelector("#notify").value
  }, function() {
    document.querySelector("input[type='submit']").value = "Saved sucessfully";
    setTimeout(function() { document.querySelector("input[type='submit']").value = "Save" }, 2000);
  } );
  if (app === true) {
    chrome.runtime.sendMessage("kbilomlpmhhhaimaigidhnjijhiajbam", { options: true,
      textcolor: document.querySelector("#paneltextcolor").value,
      background: document.querySelector("#panelbackground").value,
      interval: document.querySelector("#panelinterval").value,
      size: document.querySelector("#panelsize").value
}) } });