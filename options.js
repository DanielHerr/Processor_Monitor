
// This code is the intellectual property of Daniel Stephen Herr.

var app = false;

chrome.runtime.sendMessage("kbilomlpmhhhaimaigidhnjijhiajbam", { installed: true }, function(response) {
  if (response) { app = true }
  else { app = false }
})

chrome.storage.sync.get({
  clickpanel: true, clickbar: true, clickicon: true, autopanel: false, autoicon: false, high: 100,
  paneltextcolor: "#000000", panelbackground: "#ffffff", browsertextcolor: "#000000", browserbackground: "#dddddd",
  shelftextcolor: "#ffffff", shelfbackground: "#000000", bartextcolor: "#000000", barbackground: "#ffffff",
  browserinterval: 1, shelfinterval: 1, panelinterval: 1, barinterval: 1, panelsize: 20, barsize: 20
}, function(items) {
  document.querySelector("#clickpanel").checked = items.clickpanel;
  document.querySelector("#clickbar").checked = items.clickbar;
  document.querySelector("#clickicon").checked = items.clickicon;
  document.querySelector("#autopanel").checked = items.autopanel;
  document.querySelector("#autoicon").checked = items.autoicon;
  document.querySelector("#browsertextcolor").value = items.browsertextcolor;
  document.querySelector("#browserbackground").value = items.browserbackground;
  document.querySelector("#shelftextcolor").value = items.shelftextcolor;
  document.querySelector("#shelfbackground").value = items.shelfbackground;
  document.querySelector("#paneltextcolor").value = items.paneltextcolor;
  document.querySelector("#panelbackground").value = items.panelbackground;
  document.querySelector("#bartextcolor").value = items.bartextcolor;
  document.querySelector("#barbackground").value = items.barbackground;
  document.querySelector("#browserinterval").value = items.browserinterval;
  document.querySelector("#shelfinterval").value = items.shelfinterval;
  document.querySelector("#panelinterval").value = items.panelinterval;
  document.querySelector("#barinterval").value = items.barinterval;
  document.querySelector("#panelsize").value = items.panelsize;
  document.querySelector("#barsize").value = items.barsize;
  document.querySelector("#notify").value = items.high;
});

chrome.runtime.getPlatformInfo(function(info) {
  if (info.os != "cros") {
    var elements = document.querySelectorAll(".cros");
    for (var number in elements) {
      elements[number].style.display = "none";
} } });

chrome.system.cpu.getInfo(function(info) {
  document.querySelector("#processors").innerText = info.numOfProcessors;
});

chrome.permissions.contains({ origins: ["<all_urls>"] }, function(result) {
  if (result) { document.querySelector("#autobar").checked = true; }
});

document.querySelector("#flags").addEventListener("click", function(){
  chrome.tabs.create({ url: "chrome://flags/#enable-panels"})
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
    clickicon: document.querySelector("#clickicon").checked,
    autopanel: document.querySelector("#autopanel").checked,
    autoicon: document.querySelector("#autoicon").checked,
    browsertextcolor: document.querySelector("#browsertextcolor").value,
    browserbackground: document.querySelector("#browserbackground").value,
    shelftextcolor: document.querySelector("#shelftextcolor").value,
    shelfbackground: document.querySelector("#shelfbackground").value,
    paneltextcolor: document.querySelector("#paneltextcolor").value,
    panelbackground: document.querySelector("#panelbackground").value,
    bartextcolor: document.querySelector("#bartextcolor").value,
    barbackground: document.querySelector("#barbackground").value,
    browserinterval: document.querySelector("#browserinterval").value,
    shelfinterval: document.querySelector("#shelfinterval").value,
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