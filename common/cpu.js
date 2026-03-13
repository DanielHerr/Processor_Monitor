"use strict"

async function cpu(previous) {
	previous = previous || []
	return chrome.system.cpu.getInfo().then(function(data) {
		let timings = data.processors.map(core => core.usage)
		let utilizations = timings.map(function(timing, core) {
			let periodtotal = timing.total - (previous[core] && previous[core].total || 0)
			let periodidle = timing.idle - (previous[core] && previous[core].idle || 0)
			return (periodtotal - periodidle) / periodtotal * 100
		}).filter(u => !isNaN(u))
		return { temperatures: data.temperatures, utilizations, timings }
	})
}

function simplify_model_name(model) {
	return model.replace(/\(TM\)/g, "").replace(/\(R\)/g, "").replace(/(?:CPU )?@ [\d.]+GHz/g, "").replace(/\d+-Core Processor/g, "").trim()
}