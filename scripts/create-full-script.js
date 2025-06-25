import fs from 'fs'

// Read the current bundled bookmarklet
const fullScript = fs.readFileSync('dist/bookmarklet.js', 'utf8')

// Wrap it in a global function
const wrappedScript = `
// SacIT Event Extractor - Full Version
window.sacitExtractor = {
	run: function() {
		try {
			${fullScript}
		} catch (error) {
			console.error('[SacIT] Error running extractor:', error);
			alert('SacIT Extractor Error: ' + error.message);
		}
	}
};

console.log('[SacIT] Full extractor loaded and ready');
`

// Write the full script
fs.writeFileSync('dist/bookmarklet-full.js', wrappedScript)

console.log('✅ Full bookmarklet script created at dist/bookmarklet-full.js')
console.log('✅ Size:', wrappedScript.length, 'characters')
