"use strict"

async function refresh_meters(previous) {
	let { utilizations, timings } = await cpu(previous)
	highusagemeter.value = Math.max(...utilizations)
	averageusagemeter.value = utilizations.reduce((sum, next) => sum + next) / utilizations.length
	for(let index = utilizations.length; index < coresusage.children.length; index++) {
		coresusage.children[index].hidden = true
	}
	for(let index in utilizations) {
		coresusage.children[index].children[0].value = Math.round(utilizations[index])
	}
	setTimeout(refresh_meters, Settings.graphical_interval * 1000, timings)
}

async function refresh_text(previous) {
	let { temperatures, utilizations, timings } = await cpu(previous)
	if(temperatures.length) {
		temperature.innerHTML = Math.max(...temperatures) + "&deg;C"
	}
	highusagetext.value = Math.round(Math.max(...utilizations)) + " %"
	averageusagetext.value = Math.round(utilizations.reduce((sum, next) => sum + next) / utilizations.length) + " %"
	for(let index in utilizations) {
		coresusage.children[index].children[1].value = Math.round(utilizations[index])
	}
	setTimeout(refresh_text, Settings.numeric_interval * 1000, timings)
}

chrome.system.cpu.getInfo().then(function({ modelName, numOfProcessors, temperatures }) {

	corecount.value = numOfProcessors
	cpumodel.value = simplify_model_name(modelName)
	
	if(temperatures.length == 0) {
		temperature.parentElement.hidden = true
	}
	let firstcore = coresusage.querySelector("meter")
	for(let c = 1; c < numOfProcessors; c++) {
		let group = document.createElement("li")
		group.appendChild(firstcore.cloneNode())
		group.appendChild(document.createElement("output"))
		coresusage.appendChild(group)
	}
	refresh_meters()
	refresh_text()
})

Settings.assigned.add(function(assigned) {
	if("graphical_interval" in assigned) {
		document.body.style.setProperty("--interval", assigned.graphical_interval + "s")
	}
})