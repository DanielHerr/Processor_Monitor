if(! Theme.system) {
	Settings.assigned.add(function(assigned) {
		if(assigned.theme) {
			document.documentElement.className = assigned.theme
} }) }