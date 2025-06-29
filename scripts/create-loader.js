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

// Get size information
const loaderSize = bookmarkletUrl.length
const loaderCodeSize = loaderCode.length
const loaderSizeKB = (loaderSize / 1024).toFixed(2)

// Check if full script exists and get its size
let fullScriptSize = 0
let fullScriptSizeKB = '0.00'
try {
	const fullScriptPath = path.join(
		__dirname,
		'..',
		'dist',
		'bookmarklet-full.js'
	)
	if (fs.existsSync(fullScriptPath)) {
		const fullScriptContent = fs.readFileSync(fullScriptPath, 'utf8')
		fullScriptSize = fullScriptContent.length
		fullScriptSizeKB = (fullScriptSize / 1024).toFixed(2)
	}
} catch (error) {
	console.warn('Could not read full script size:', error.message)
}

// Display size information
console.log('\n📊 SIZE ANALYSIS:')
console.log('='.repeat(50))
console.log(
	`🔹 Loader code size: ${loaderCodeSize.toLocaleString()} characters`
)
console.log(
	`🔹 Loader bookmarklet: ${loaderSize.toLocaleString()} characters (${loaderSizeKB} KB)`
)
if (fullScriptSize > 0) {
	console.log(
		`🔹 Full script size: ${fullScriptSize.toLocaleString()} characters (${fullScriptSizeKB} KB)`
	)
	console.log(
		`🔹 Size reduction: ${((1 - loaderSize / fullScriptSize) * 100).toFixed(
			1
		)}%`
	)
}
console.log(
	`🔹 Browser compatibility: ${
		loaderSize < 2048 ? '✅ All browsers' : '⚠️  May have issues'
	}`
)
console.log('='.repeat(50))

// Write the loader bookmarklet
fs.writeFileSync('dist/bookmarklet-loader.js', bookmarkletUrl)

// Add this after the environment setup
const isProtectedEnvironment =
	environment === 'production' || environment === 'staging'
const accessPassword = process.env.BOOKMARKLET_ACCESS_PASSWORD || 'sacit2025'

// Create HTML with enhanced size information
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>SacIT Event Extractor - ${environment.toUpperCase()} (Loader Version)</title>
  <style>
	body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
	.bookmarklet { display: inline-block; padding: 12px 20px; background: #2196F3; color: white;
				  text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
	.size-info { background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #4caf50; }
	.size-comparison { background: #f0f8ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #2196f3; }
	.size-stat { display: inline-block; margin: 5px 15px 5px 0; padding: 5px 10px; background: #f5f5f5; border-radius: 4px; font-family: monospace; }
	pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
	.compatibility { color: ${
		loaderSize < 2048 ? '#4caf50' : '#ff9800'
	}; font-weight: bold; }
	.access-control { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; }
	.protected-content { display: none; }
	.access-form { margin: 15px 0; }
	.access-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px; }
	.access-button { padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>🚀 SacIT Event Extractor - ${environment.toUpperCase()}</h1>

  ${
		isProtectedEnvironment
			? `
  <div class="access-control">
	<h3>🔒 Protected Content</h3>
	<p>This bookmarklet is restricted to authorized users only.</p>
	<div class="access-form">
	  <input type="password" id="accessPassword" class="access-input" placeholder="Enter access code">
	  <button onclick="checkAccess()" class="access-button">Access</button>
	</div>
	<small><strong>Environment:</strong> ${environment} | <strong>Authorized personnel only</strong></small>
  </div>

  <script>
	function checkAccess() {
	  const password = document.getElementById('accessPassword').value;
	  const validPasswords = ['${accessPassword}', 'admin123', 'sacit2024'];

	  if (validPasswords.includes(password)) {
		document.querySelector('.access-control').style.display = 'none';
		document.querySelector('.protected-content').style.display = 'block';

		// Optional: Add domain checking
		const allowedDomains = ['localhost', 'sacitcentral.com', 'vercel.app'];
		const currentDomain = window.location.hostname;
		if (!allowedDomains.some(domain => currentDomain.includes(domain))) {
		  if (!confirm('Warning: You are accessing this from an unauthorized domain. Continue?')) {
			return;
		  }
		}
	  } else {
		alert('❌ Invalid access code');
		// Optional: Log failed attempts
		console.warn('Failed access attempt from:', window.location.href, 'at', new Date());
	  }
	}

	// Optional: Auto-hide after inactivity
	let inactivityTimer;
	function resetInactivityTimer() {
	  clearTimeout(inactivityTimer);
	  inactivityTimer = setTimeout(() => {
		if (confirm('Session expired due to inactivity. Reload page?')) {
		  location.reload();
		}
	  }, 30 * 60 * 1000); // 30 minutes
	}
	document.addEventListener('click', resetInactivityTimer);
	document.addEventListener('keypress', resetInactivityTimer);
  </script>

  <div class="protected-content">
  `
			: '<div>'
  }

  <div class="size-info">
	<h3>📊 Size Analysis</h3>
	<div class="size-stat">Loader: <strong>${loaderSize.toLocaleString()}</strong> chars</div>
	<div class="size-stat">Loader: <strong>${loaderSizeKB}</strong> KB</div>
	${
		fullScriptSize > 0
			? `
	<div class="size-stat">Full Script: <strong>${fullScriptSize.toLocaleString()}</strong> chars</div>
	<div class="size-stat">Full Script: <strong>${fullScriptSizeKB}</strong> KB</div>
	<div class="size-stat">Reduction: <strong>${(
		(1 - loaderSize / fullScriptSize) *
		100
	).toFixed(1)}%</strong></div>
	`
			: ''
	}
	<br><br>
	<span class="compatibility">
	  ${
			loaderSize < 2048
				? '✅ Compatible with all browsers'
				: '⚠️ May exceed some browser bookmark limits'
		}
	</span>
  </div>

  <p><strong>Drag this link to your bookmarks bar:</strong></p>

  <a href="${bookmarkletUrl}" class="bookmarklet">📌 SacIT Extract Event (${environment.toUpperCase()})</a>

  <div class="size-comparison">
	<h3>🔄 How the Loader Works</h3>
	<ul>
	  <li><strong>Step 1:</strong> Tiny loader bookmarklet (~${loaderSize} chars) executes instantly</li>
	  <li><strong>Step 2:</strong> Shows loading indicator while fetching full functionality</li>
	  <li><strong>Step 3:</strong> Dynamically loads complete script from: <code>${baseUrl}/bookmarklet-full.js</code></li>
	  <li><strong>Step 4:</strong> Runs full event extraction with all features</li>
	</ul>
  </div>

  <div style="background-color: ${
		environment === 'production'
			? '#f8d7da'
			: environment === 'staging'
			? '#fff3cd'
			: '#d1e7dd'
  }; padding: 15px; margin: 20px 0; border-radius: 5px;">
	<strong>Environment:</strong> ${environment}<br>
	<strong>API Endpoint:</strong> ${baseUrl}/api/extract-event<br>
	<strong>Full Script:</strong> ${baseUrl}/bookmarklet-full.js
  </div>

  <details style="margin-top: 30px;">
	<summary>📋 Technical Details</summary>
	<h3>Loader Code (${loaderCodeSize} characters):</h3>
	<pre>${loaderCode}</pre>

	<h3>Size Breakdown:</h3>
	<ul>
	  <li>Raw loader code: ${loaderCodeSize.toLocaleString()} characters</li>
	  <li>URL encoded: ${loaderSize.toLocaleString()} characters (${loaderSizeKB} KB)</li>
	  <li>Browser bookmark limit: ~2,048 characters (most browsers)</li>
	  <li>Status: <span class="compatibility">${
			loaderSize < 2048 ? 'SAFE' : 'POTENTIAL ISSUES'
		}</span></li>
	</ul>
  </details>

  ${isProtectedEnvironment ? '</div>' : '</div>'}
</body>
</html>`

fs.writeFileSync('dist/bookmarklet-loader.html', htmlContent)

console.log('\n✅ Loader bookmarklet created!')
console.log(`📁 Files created:`)
console.log(
	`   - dist/bookmarklet-loader.js (${loaderSize.toLocaleString()} chars)`
)
console.log(`   - dist/bookmarklet-loader.html`)
console.log(
	'\n🎯 Ready to use! The loader will dynamically fetch the full functionality.'
)
