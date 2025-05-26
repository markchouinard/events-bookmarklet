import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read the minified bookmarklet
const minifiedCode = fs.readFileSync(
	path.join(__dirname, '../dist/bookmarklet.min.js'),
	'utf8'
)

// Wrap it in a bookmarklet format
const bookmarklet = `javascript:(function(){${minifiedCode}})();`

// Output to console (for easy copying)
console.log('\n--- COPY THIS BOOKMARKLET ---\n')
console.log(bookmarklet)
console.log('\n----------------------------\n')

// Also save to a file for reference
fs.writeFileSync(
	path.join(__dirname, '../dist/bookmarklet-ready.js'),
	bookmarklet,
	'utf8'
)

console.log('Bookmarklet saved to dist/bookmarklet-ready.js')
