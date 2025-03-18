"use strict"

if (document.querySelector("#processormonitor")) {
  document.querySelector("#processormonitor").remove();
}

document.querySelector("body").insertAdjacentHTML("beforeend", "<div id='processormonitor'>processor monitor</div>");
var bar = document.querySelector("#processormonitor");
bar.style.zIndex = "4646";
bar.style.position = "fixed";
bar.style.left = (window.innerWidth - 100) + "px";
bar.style.top = (window.innerHeight - 40) + "px";
bar.style.cursor = "move";
bar.style.webkitUserSelect = "none";

chrome.runtime.onMessage.addListener(function(request) {
  bar.textContent = request.usage + "%";
});

chrome.storage.sync.get({
  bartextcolor: "#000000", barbackground: "#ffffff", barsize: 20
}, function(items) {
  bar.style.backgroundColor = items.barbackground;
  bar.style.color = items.bartextcolor;
  bar.style.fontSize = items.barsize + "px";
});

window.addEventListener("resize", function() {
  bar.style.left = (window.innerWidth - 100) + "px";
  bar.style.top = (window.innerHeight - 40) + "px";
});

bar.onmousedown = function() {
  document.onmousemove = function(event) {
    bar.style.left = (event.pageX - (bar.clientWidth / 2)) + "px";
    bar.style.top = (event.pageY - (bar.clientHeight / 2)) + "px";
  }
  document.onmouseup = function() {
    document.onmousemove = null;
    document.onmouseup = null;
} }