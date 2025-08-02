import * as esbuild from 'esbuild'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// Get current file's directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const environment = process.env.NODE_ENV || 'development'

// Get environment-specific API URL
let apiUrl
switch (environment) {
	case 'production':
		apiUrl = 'https://events-bookmarklet.vercel.app/api/extract-event'
		break
	default:
		apiUrl = 'http://localhost:3000/api/extract-event'
}

console.log(
	`Building bookmarklet for ${environment} environment pointing to ${apiUrl}`
)

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
		sourcemap: true, // Source map generation must be turned on
	})
	.then(() => {
		console.log('⚡ Bookmarklet bundled successfully!')

		// Read the bundled file
		let bundledCode = fs.readFileSync('dist/bookmarklet.js', 'utf8')

		// DEBUG: Log what we're looking for
		console.log('🔍 Environment:', environment)
		console.log('🔍 API URL:', apiUrl)
		console.log(
			'🔍 Contains placeholder:',
			bundledCode.includes('__API_URL_PLACEHOLDER__')
		)
		console.log('🔍 Bundled code length:', bundledCode.length)

		// Replace API URL placeholder with actual environment URL
		const beforeReplace = bundledCode.includes('__API_URL_PLACEHOLDER__')
		bundledCode = bundledCode.replace(/__API_URL_PLACEHOLDER__/g, apiUrl)
		const afterReplace = bundledCode.includes('__API_URL_PLACEHOLDER__')

		console.log('🔍 Before replacement had placeholder:', beforeReplace)
		console.log('🔍 After replacement has placeholder:', afterReplace)
		console.log('🔍 Replacement worked:', beforeReplace && !afterReplace)

		// Replace environment placeholder
		bundledCode = bundledCode.replace(
			'__ENVIRONMENT_PLACEHOLDER__',
			environment
		)

		fs.writeFileSync('dist/bookmarklet.js', bundledCode)

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
  <title>SacIT Event Extractor (${environment.toUpperCase()})</title>
  <style>
	body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
	.bookmarklet { display: inline-block; padding: 10px 15px; background: #2196F3; color: white;
				  text-decoration: none; border-radius: 4px; margin: 20px 0; }
	pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
	.instructions { line-height: 1.6; }
  </style>
</head>
<body>
  <h1>SacIT Event Extractor - ${environment.toUpperCase()} Environment</h1>

  <p>Drag this link to your bookmarks bar:</p>

  <a href="${bookmarkletCode}" class="bookmarklet">📌 SacIT Extract Event (${environment.toUpperCase()})</a>

  <div class="environment-notice" style="background-color: ${
		environment === 'production'
			? '#f8d7da'
			: environment === 'staging'
			? '#fff3cd'
			: '#d1e7dd'
  }; padding: 10px; margin: 15px 0; border-radius: 5px;">
	<strong>NOTICE:</strong> This bookmarklet will send data to the <strong>${environment}</strong> environment.
	<div>API Endpoint: ${apiUrl}</div>
  </div>

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

		// Copy index.html from public to dist
		const publicIndexPath = path.join(__dirname, '..', 'public', 'index.html')
		const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html')
		
		if (fs.existsSync(publicIndexPath)) {
			fs.copyFileSync(publicIndexPath, distIndexPath)
			console.log('✅ Index page copied from public/ to dist/')
		} else {
			console.log('⚠️  No index.html found in public/ directory')
		}

		console.log('✅ Bookmarklet HTML created at dist/bookmarklet.html')
	})
	.catch((err) => {
		console.error('❌ Build failed:', err)
		process.exit(1)
	})
