import * as esbuild from 'esbuild'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// Get current file's directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Bundle the code
esbuild
	.build({
		entryPoints: ['src/bookmarklet.ts'],
		bundle: true,
		outfile: 'dist/bookmarklet.js',
		platform: 'browser',
		format: 'iife', // Important: Use IIFE format for bookmarklet
		minify: true,
		target: ['es2015'],
		tsconfig: 'tsconfig.json',
	})
	.then(() => {
		console.log('⚡ Bookmarklet bundled successfully!')

		// Read the bundled file
		const bundledCode = fs.readFileSync('dist/bookmarklet.js', 'utf8')

		// Create bookmarklet version (URL-encoded)
		const bookmarkletCode = `javascript:(function(){${encodeURIComponent(
			bundledCode
		)}})();`

		// Write to files
		fs.writeFileSync('dist/bookmarklet-url.js', bookmarkletCode)

		// Create an HTML file with the bookmarklet for easy testing
		const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>SacIT Event Extractor Bookmarklet</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .bookmarklet { display: inline-block; padding: 10px 15px; background: #2196F3; color: white;
                  text-decoration: none; border-radius: 4px; margin: 20px 0; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
    .instructions { line-height: 1.6; }
  </style>
</head>
<body>
  <h1>SacIT Event Extractor Bookmarklet</h1>

  <p>Drag this link to your bookmarks bar:</p>

  <a href="${bookmarkletCode}" class="bookmarklet">SacIT Extract Event</a>

  <div class="instructions">
    <h2>How to use:</h2>
    <ol>
      <li>Drag the above bookmarklet to your bookmarks bar</li>
      <li>Navigate to an event page (Meetup, Eventbrite, etc.)</li>
      <li>Click the bookmarklet to extract event data</li>
      <li>The extracted data will appear in a popup</li>
    </ol>
  </div>

  <h2>Development Info</h2>
  <p>Build timestamp: ${new Date().toISOString()}</p>

  <h3>Bookmarklet code:</h3>
  <pre><code>${bookmarkletCode.substring(0, 100)}...</code></pre>
</body>
</html>`

		fs.writeFileSync('dist/bookmarklet.html', htmlContent)

		console.log('✅ Bookmarklet HTML created at dist/bookmarklet.html')
	})
	.catch((err) => {
		console.error('❌ Build failed:', err)
		process.exit(1)
	})
