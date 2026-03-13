"use strict"

// ─── Chrome API Mock ─────────────────────────────────────────────────

var chrome = self.chrome || {}
chrome.system = chrome.system || {}
chrome.system.cpu = chrome.system.cpu || {}
chrome.system.cpu.getInfo = function() {
	return Promise.resolve(chrome.system.cpu._mockData)
}
chrome.system.display = chrome.system.display || {}
chrome.system.display.getInfo = function() {
	return Promise.resolve(chrome.system.display._mockData)
}
chrome.offscreen = undefined
chrome.runtime = chrome.runtime || {}
chrome.runtime.sendMessage = function() { return Promise.resolve(1) }

// ─── Copied functions under test (from background.js / popup.js) ────
// Keep in sync with originals — see source references in comments.

// from background.js lines 47-69
async function calc_icon_size() {
	if(navigator.userAgent.includes("OPR")) { // Opera
		var possible = [ 1, 1.25, 1.5, 2, 2.5 ]
	} else {
		var possible = [ 1, 2 ] // Chrome, Edge, Brave, etc.
	}
	let size = 16
	function determine_size(scale) {
		for(let factor of possible) {
			if(Math.fround(scale) <= Math.fround(factor + 0.2)) {
				return 16 * factor
		} }
		return 16 * possible[possible.length - 1]
	}
	let displays = await chrome.system.display.getInfo()
	if(displays.length == 1 && self.devicePixelRatio) {
		size = determine_size(devicePixelRatio)
	} else if(displays[0].modes && displays[0].modes[0]) {
		for(let display of displays) {
			size = Math.max(size, determine_size(display.modes[0].deviceScaleFactor))
		}
	} else if(displays.length == 1 && chrome.offscreen) {
		if(self.offscreen_loading) {
			await offscreen_loading
		}
		let dpr = await chrome.runtime.sendMessage("dpr")
		size = determine_size(dpr)
	} else {
		size = 16 * possible[possible.length - 1]
	}
	return size
}

// from background.js lines 124-129
function aggregate_usage(utilizations, primary_measure) {
	if(primary_measure == "highest") {
		return Math.round(Math.max(...utilizations))
	} else {
		return Math.round(utilizations.reduce((sum, next) => sum + next) / utilizations.length)
	}
}


// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════


// ─── cpu() ───────────────────────────────────────────────────────────

QUnit.module("cpu()", function() {

	QUnit.test("normal usage — 4 cores", async function(assert) {
		let previous = [
			{ idle: 5742916, kernel: 297011, total: 7133041, user: 1093114 },
			{ idle: 5478297, kernel: 230246, total: 7059167, user: 1350624 },
			{ idle: 5536703, kernel: 233376, total: 7059984, user: 1289905 },
			{ idle: 5760634, kernel: 247969, total: 7390875, user: 1382272 }
		]
		chrome.system.cpu._mockData = {
			processors: [
				{ usage: { idle: 5750963, kernel: 297351, total: 7142697, user: 1094383 } },
				{ usage: { idle: 5486217, kernel: 230545, total: 7069087, user: 1352325 } },
				{ usage: { idle: 5544661, kernel: 233681, total: 7069897, user: 1291555 } },
				{ usage: { idle: 5768677, kernel: 248260, total: 7400813, user: 1383876 } }
			],
			temperatures: []
		}

		let result = await cpu(previous)

		assert.equal(result.utilizations.length, 4, "returns 4 core utilizations")
		for(let u of result.utilizations) {
			assert.ok(u >= 0 && u <= 100, "utilization " + u.toFixed(1) + "% in 0–100 range")
		}
		assert.equal(result.timings.length, 4, "returns 4 timing snapshots")

		// verify core 0 manually: total delta = 7142697-7133041 = 9656, idle delta = 5750963-5742916 = 8047
		// utilization = (9656-8047)/9656*100 ≈ 16.65%
		let expected = (9656 - 8047) / 9656 * 100
		assert.ok(Math.abs(result.utilizations[0] - expected) < 0.01, "core 0 utilization ≈ " + expected.toFixed(2) + "%")
	})

	QUnit.test("first call with no previous data", async function(assert) {
		chrome.system.cpu._mockData = {
			processors: [
				{ usage: { idle: 5000, kernel: 200, total: 6000, user: 800 } },
				{ usage: { idle: 4000, kernel: 300, total: 5500, user: 1200 } }
			],
			temperatures: [42]
		}

		let result = await cpu(null)

		assert.equal(result.utilizations.length, 2, "returns utilizations for both cores")
		for(let u of result.utilizations) {
			assert.ok(u >= 0 && u <= 100, "utilization " + u.toFixed(1) + "% in 0–100 range")
		}
		assert.deepEqual(result.temperatures, [42], "passes temperatures through")
	})

	QUnit.test("battery saver / disabled cores — zero timings", async function(assert) {
		let previous = [
			{ idle: 5752876, kernel: 297485, total: 7145272, user: 1094911 },
			{ idle: 0, kernel: 0, total: 0, user: 0 },
			{ idle: 0, kernel: 0, total: 0, user: 0 },
			{ idle: 5770552, kernel: 248367, total: 7403483, user: 1384564 }
		]
		chrome.system.cpu._mockData = {
			processors: [
				{ usage: { idle: 5753622, kernel: 297600, total: 7146755, user: 1095533 } },
				{ usage: { idle: 0, kernel: 0, total: 0, user: 0 } },
				{ usage: { idle: 0, kernel: 0, total: 0, user: 0 } },
				{ usage: { idle: 5771180, kernel: 248457, total: 7405027, user: 1385390 } }
			],
			temperatures: []
		}

		let result = await cpu(previous)

		assert.equal(result.utilizations.length, 2, "returns only 2 active core utilizations")
		// disabled cores (NaN) are filtered out
		for(let u of result.utilizations) {
			assert.ok(u >= 0 && u <= 100, "utilization " + u.toFixed(1) + "% in 0–100 range")
		}
	})
})


// ─── calc_icon_size() ────────────────────────────────────────────────

QUnit.module("calc_icon_size()", function(hooks) {
	let originalDPR
	let originalUA

	hooks.beforeEach(function() {
		originalUA = navigator.userAgent
		Object.defineProperty(navigator, "userAgent", { value: "Chrome", configurable: true })
		originalDPR = self.devicePixelRatio
	})
	hooks.afterEach(function() {
		Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true })
		Object.defineProperty(self, "devicePixelRatio", { value: originalDPR, configurable: true })
	})

	QUnit.test("single display, high DPI (devicePixelRatio > 1.2)", async function(assert) {
		Object.defineProperty(self, "devicePixelRatio", { value: 2, configurable: true })
		chrome.system.display._mockData = [{ id: "1" }]

		let size = await calc_icon_size()
		assert.equal(size, 32, "returns 32 for high DPI")
	})

	QUnit.test("single display, low DPI (devicePixelRatio <= 1.2)", async function(assert) {
		Object.defineProperty(self, "devicePixelRatio", { value: 1, configurable: true })
		chrome.system.display._mockData = [{ id: "1" }]

		let size = await calc_icon_size()
		assert.equal(size, 16, "returns 16 for low DPI")
	})

	QUnit.test("multi-display, all low scale factor", async function(assert) {
		// remove devicePixelRatio to hit the modes branch
		Object.defineProperty(self, "devicePixelRatio", { value: undefined, configurable: true })
		chrome.system.display._mockData = [
			{ modes: [{ deviceScaleFactor: 1 }] },
			{ modes: [{ deviceScaleFactor: 1 }] }
		]

		let size = await calc_icon_size()
		assert.equal(size, 16, "returns 16 when all scale factors <= 1.2")
	})

	QUnit.test("multi-display, one high scale factor", async function(assert) {
		Object.defineProperty(self, "devicePixelRatio", { value: undefined, configurable: true })
		chrome.system.display._mockData = [
			{ modes: [{ deviceScaleFactor: 1 }] },
			{ modes: [{ deviceScaleFactor: 2 }] }
		]

		let size = await calc_icon_size()
		assert.equal(size, 32, "returns 32 when any scale factor > 1.2")
	})

	QUnit.test("Chrome OS v145 display data", async function(assert) {
		Object.defineProperty(self, "devicePixelRatio", { value: undefined, configurable: true })
		chrome.system.display._mockData = [{"activeState":"active","bounds":{"height":800,"left":0,"top":0,"width":1200},"displayZoomFactor":1,"dpiX":117.23,"dpiY":117.23,"id":"21692109949126656","isEnabled":true,"isInternal":true,"isPrimary":true,"modes":[{"deviceScaleFactor":2,"height":800,"heightInNativePixels":1600,"isNative":true,"isSelected":true,"refreshRate":59.98,"width":1200,"widthInNativePixels":2400}],"name":"Built-in display"}]

		let size = await calc_icon_size()
		assert.equal(size, 32, "Chrome OS v145 high-DPI display → 32")
	})

	QUnit.test("Chrome OS v76 display data", async function(assert) {
		Object.defineProperty(self, "devicePixelRatio", { value: undefined, configurable: true })
		chrome.system.display._mockData = [{"bounds":{"height":768,"left":0,"top":0,"width":1366},"displayZoomFactor":1,"dpiX":111.92,"dpiY":111.92,"id":"3850489720471552","isEnabled":true,"isInternal":true,"isPrimary":true,"modes":[{"deviceScaleFactor":1,"height":768,"heightInNativePixels":768,"isNative":true,"isSelected":true,"refreshRate":60.00,"width":1366,"widthInNativePixels":1366}],"name":"Internal Display"}]

		let size = await calc_icon_size()
		assert.equal(size, 16, "Chrome OS v76 1x display → 16")
	})

	// Opera tests
	QUnit.test("Opera single display, scale 1", async function(assert) {
		Object.defineProperty(navigator, "userAgent", { value: "OPR", configurable: true })
		Object.defineProperty(self, "devicePixelRatio", { value: 1, configurable: true })
		chrome.system.display._mockData = [{ id: "1" }]

		let size = await calc_icon_size()
		assert.equal(size, 16, "Opera scale 1 → 16")
	})

	QUnit.test("Opera single display, scale 1.3", async function(assert) {
		Object.defineProperty(navigator, "userAgent", { value: "OPR", configurable: true })
		Object.defineProperty(self, "devicePixelRatio", { value: 1.3, configurable: true })
		chrome.system.display._mockData = [{ id: "1" }]

		let size = await calc_icon_size()
		assert.equal(size, 20, "Opera scale 1.3 → 20")
	})

	QUnit.test("Opera single display, scale 1.6", async function(assert) {
		Object.defineProperty(navigator, "userAgent", { value: "OPR", configurable: true })
		Object.defineProperty(self, "devicePixelRatio", { value: 1.6, configurable: true })
		chrome.system.display._mockData = [{ id: "1" }]

		let size = await calc_icon_size()
		assert.equal(size, 24, "Opera scale 1.6 → 24")
	})

	QUnit.test("Opera single display, scale 2", async function(assert) {
		Object.defineProperty(navigator, "userAgent", { value: "OPR", configurable: true })
		Object.defineProperty(self, "devicePixelRatio", { value: 2, configurable: true })
		chrome.system.display._mockData = [{ id: "1" }]

		let size = await calc_icon_size()
		assert.equal(size, 32, "Opera scale 2 → 32")
	})

	QUnit.test("Opera single display, scale 2.5", async function(assert) {
		Object.defineProperty(navigator, "userAgent", { value: "OPR", configurable: true })
		Object.defineProperty(self, "devicePixelRatio", { value: 2.5, configurable: true })
		chrome.system.display._mockData = [{ id: "1" }]

		let size = await calc_icon_size()
		assert.equal(size, 40, "Opera scale 2.5 → 40")
	})

	QUnit.test("Opera single display, scale 3", async function(assert) {
		Object.defineProperty(navigator, "userAgent", { value: "OPR", configurable: true })
		Object.defineProperty(self, "devicePixelRatio", { value: 3, configurable: true })
		chrome.system.display._mockData = [{ id: "1" }]

		let size = await calc_icon_size()
		assert.equal(size, 40, "Opera scale 3 → 40 (max)")
	})

	QUnit.test("Opera multi-display, mixed scale factors", async function(assert) {
		Object.defineProperty(navigator, "userAgent", { value: "OPR", configurable: true })
		Object.defineProperty(self, "devicePixelRatio", { value: undefined, configurable: true })
		chrome.system.display._mockData = [
			{ modes: [{ deviceScaleFactor: 1.3 }] },
			{ modes: [{ deviceScaleFactor: 2 }] }
		]

		let size = await calc_icon_size()
		assert.equal(size, 32, "Opera multi-display max scale 2 → 32")
	})
})


// ─── CPU model simplification ────────────────────────────────────────

QUnit.module("simplify_model_name()", function() {

	QUnit.test("Intel Celeron", function(assert) {
		assert.equal(
			simplify_model_name("Intel(R) Celeron(R) 2955U @ 1.40GHz"),
			"Intel Celeron 2955U"
		)
	})

	QUnit.test("Intel Core with CPU @ freq", function(assert) {
		assert.equal(
			simplify_model_name("Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz"),
			"Intel Core i7-10700K"
		)
	})

	QUnit.test("AMD Ryzen with Core Processor", function(assert) {
		assert.equal(
			simplify_model_name("AMD Ryzen 7 5800X 8-Core Processor"),
			"AMD Ryzen 7 5800X"
		)
	})

	QUnit.test("simple model name — no replacements needed", function(assert) {
		assert.equal(
			simplify_model_name("ARM Cortex-A72"),
			"ARM Cortex-A72"
		)
	})

	QUnit.test("all markers combined", function(assert) {
		assert.equal(
			simplify_model_name("Foo(TM) Bar(R) CPU @ 2.50GHz 4-Core Processor"),
			"Foo Bar"
		)
	})
})


// ─── Usage aggregation ───────────────────────────────────────────────

QUnit.module("aggregate_usage()", function() {

	QUnit.test("highest — picks max and rounds", function(assert) {
		assert.equal(aggregate_usage([16.65, 20.12, 18.30, 38.72], "highest"), 39)
	})

	QUnit.test("highest — single core", function(assert) {
		assert.equal(aggregate_usage([55.5], "highest"), 56)
	})

	QUnit.test("average — computes mean and rounds", function(assert) {
		// (16.65 + 20.12 + 18.30 + 38.72) / 4 = 23.4475 → 23
		assert.equal(aggregate_usage([16.65, 20.12, 18.30, 38.72], "average"), 23)
	})

	QUnit.test("average — single core", function(assert) {
		assert.equal(aggregate_usage([73.3], "average"), 73)
	})

	QUnit.test("all zeros", function(assert) {
		assert.equal(aggregate_usage([0, 0, 0, 0], "highest"), 0)
		assert.equal(aggregate_usage([0, 0, 0, 0], "average"), 0)
	})

	QUnit.test("all 100%", function(assert) {
		assert.equal(aggregate_usage([100, 100], "highest"), 100)
		assert.equal(aggregate_usage([100, 100], "average"), 100)
	})
})