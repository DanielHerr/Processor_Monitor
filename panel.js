
// This code is the intellectual property of Daniel Stephen Herr.

var panelinterval = 1000;
var shelfinterval = 1000;
var shelftextcolor = "#ffffff";
var shelfbackground = "#000000";
var shelfinfo = false;
var panelinfo = false;
var canvas = document.createElement("canvas");
canvas.width = 48;
canvas.height = 48;
var context = canvas.getContext("2d");
context.font = "40px Noto Sans";

function settings() {
  chrome.storage.sync.get({
    panelinterval: 1, paneltextcolor: "#000000", panelbackground: "#ffffff", panelsize: 20,
    shelfinterval: 1, shelftextcolor: "#ffffff", shelfbackground: "#000000"
  }, function(items) {
    panelinterval = items.panelinterval * 1000;
    shelfinterval = items.shelfinterval * 1000;
    document.body.style.backgroundColor = items.panelbackground;
    document.body.style.color = items.paneltextcolor;
    document.body.style.fontSize = items.panelsize + "px";
    shelftextcolor = items.shelftextcolor;
    shelfbackground = items.shelfbackground;
}) }

chrome.storage.onChanged.addListener(settings);
window.addEventListener("load", settings);

window.addEventListener("load", function shelf() {
  chrome.system.cpu.getInfo(function(info) {
    var totalusage = 0;
    for (var number = 0; number < info.numOfProcessors; number++) {
      var usage = info.processors[number].usage;
      if (shelfinfo != false) {
        var oldUsage = shelfinfo.processors[number].usage;
        var user = (oldUsage.user - usage.user) / (oldUsage.total - usage.total) * 100;
        var kernel = (oldUsage.kernel - usage.kernel) / (oldUsage.total - usage.total) * 100;
        totalusage = totalusage + user + kernel;
      } else {
        var user = usage.user / usage.total * 100;
        var kernel = usage.kernel / usage.total * 100;
        totalusage = totalusage + user + kernel;
    } }
    shelfinfo = info;
    var percent = Math.round(totalusage / info.numOfProcessors);
    document.title = "Usage: " + percent + "% Processors: " + info.numOfProcessors;
    context.clearRect(0, 0, 48, 48);
    context.fillStyle = shelfbackground;
    context.fillRect(0, 0, 48, 48);
    context.fillStyle = shelftextcolor;
    if (percent < 10) {
      context.font = "40px Noto Sans, Noto";
      context.fillText(percent.toString()[0], 0, 36);
      context.font = "24px Noto Sans, Noto";
      context.fillText("%", 24, 36);
    }
    else if (percent == 100) {
      context.font = "32px Noto Sans";
      context.fillText("1", -2, 37);
      context.fillText("0", 12, 37);
      context.fillText("0", 30, 37);
    } else {
      context.font = "40px Noto Sans, Noto";
      context.fillText(percent.toString()[0], 0, 36);
      context.fillText(percent.toString()[1], 24, 36);
    }
    if (document.querySelector("link")) {
      document.querySelector("link").remove();
    }
    var link = document.createElement("link");
    link.rel = "icon";
    link.href = canvas.toDataURL();
    document.head.appendChild(link);
  });
  setTimeout(shelf, shelfinterval);
});

window.addEventListener("load", function panel() {
  chrome.system.cpu.getInfo(function(info) {
    var totalusage = 0;
    for (var number = 0; number < info.numOfProcessors; number++) {
      var usage = info.processors[number].usage;
      if (panelinfo != false) {
        var oldUsage = panelinfo.processors[number].usage;
        var user = (oldUsage.user - usage.user) / (oldUsage.total - usage.total) * 100;
        var kernel = (oldUsage.kernel - usage.kernel) / (oldUsage.total - usage.total) * 100;
        totalusage = totalusage + user + kernel;
      } else {
        var user = usage.user / usage.total * 100;
        var kernel = usage.kernel / usage.total * 100;
        totalusage = totalusage + user + kernel;
    } }
    panelinfo = info;
    document.querySelector("div").textContent = Math.round(totalusage / info.numOfProcessors);
  });
  setTimeout(panel, panelinterval);
});