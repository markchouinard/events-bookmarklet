import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const environment = process.env.NODE_ENV || 'development'

// Get environment-specific API URL
let baseUrl
switch (environment) {
	case 'production':
		baseUrl = process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}`
			: 'https://events-bookmarklet.vercel.app'
		break
	case 'staging':
		baseUrl = 'https://stage.sacitcentral.com'
		break
	default:
		baseUrl = 'http://localhost:3000'
}

console.log(`Creating loader for ${environment} environment: ${baseUrl}`)

// Create the minimal loader bookmarklet
const loaderCode = `
(function() {
	// Prevent multiple loads
	if (window.sacitExtractorLoading) return;
	window.sacitExtractorLoading = true;

	// Show loading indicator
	var loading = document.createElement('div');
	loading.id = 'sacit-loader';
	loading.innerHTML = '🔄 Loading SacIT Extractor...';
	loading.style.cssText = 'position:fixed;top:20px;right:20px;background:#2196F3;color:white;padding:10px 15px;border-radius:4px;z-index:10000;font-family:Arial,sans-serif;font-size:14px;';
	document.body.appendChild(loading);

	// Load the full script
	var script = document.createElement('script');
	script.src = '${baseUrl}/bookmarklet-full.js?v=' + Date.now();
	script.onload = function() {
		loading.remove();
		if (window.sacitExtractor) {
			window.sacitExtractor.run();
		} else {
			alert('Failed to load SacIT Extractor');
		}
		window.sacitExtractorLoading = false;
	};
	script.onerror = function() {
		loading.innerHTML = '❌ Failed to load';
		setTimeout(() => loading.remove(), 3000);
		window.sacitExtractorLoading = false;
	};
	document.head.appendChild(script);
})();
`.trim()

// Create the bookmarklet URL
const bookmarkletUrl = `javascript:${encodeURIComponent(loaderCode)}`

console.log(`Loader bookmarklet size: ${bookmarkletUrl.length} characters`)

// Write the loader bookmarklet
fs.writeFileSync('dist/bookmarklet-loader.js', bookmarkletUrl)

// Create HTML with the loader
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>SacIT Event Extractor - ${environment.toUpperCase()} (Loader Version)</title>
  <style>
	body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
	.bookmarklet { display: inline-block; padding: 12px 20px; background: #2196F3; color: white;
				  text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
	.size-info { background: #e8f5e8; padding: 10px; border-radius: 4px; margin: 15px 0; }
	pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🚀 SacIT Event Extractor - ${environment.toUpperCase()}</h1>

  <div class="size-info">
	<strong>✅ Optimized Loader Version</strong><br>
	Bookmarklet size: <strong>${
		bookmarkletUrl.length
	} characters</strong> (was ~26,000)<br>
	Compatible with all browsers!
  </div>

  <p><strong>Drag this link to your bookmarks bar:</strong></p>

  <a href="${bookmarkletUrl}" class="bookmarklet">📌 SacIT Extract Event (${environment.toUpperCase()})</a>

  <div style="background-color: ${
		environment === 'production'
			? '#f8d7da'
			: environment === 'staging'
			? '#fff3cd'
			: '#d1e7dd'
  }; padding: 15px; margin: 20px 0; border-radius: 5px;">
	<strong>Environment:</strong> ${environment}<br>
	<strong>Loads from:</strong> ${baseUrl}/bookmarklet-full.js
  </div>

  <div>
	<h2>How it works:</h2>
	<ol>
	  <li>Tiny loader bookmarklet (~${
			Math.round(bookmarkletUrl.length / 100) * 100
		} chars)</li>
	  <li>Dynamically loads full functionality from server</li>
	  <li>Runs complete event extraction</li>
	  <li>Compatible with all browser bookmark limits</li>
	</ol>
  </div>

  <details style="margin-top: 30px;">
	<summary>Technical Details</summary>
	<h3>Loader Code:</h3>
	<pre>${loaderCode}</pre>
  </details>
</body>
</html>`

fs.writeFileSync('dist/bookmarklet-loader.html', htmlContent)

console.log('✅ Loader bookmarklet created!')
console.log('✅ Size:', bookmarkletUrl.length, 'characters (previous: ~26,000)')
console.log('✅ Files created:')
console.log('   - dist/bookmarklet-loader.js')
console.log('   - dist/bookmarklet-loader.html')
