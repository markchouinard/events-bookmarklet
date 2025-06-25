import * as Sentry from '@sentry/browser'

// ✅ REAL SENTRY INIT - FIRST THING
Sentry.init({
	dsn: 'https://d0218b8c4606d5f2a3480ad10db9ed67@o4507068179349504.ingest.us.sentry.io/4507588915691521',
	environment: '__ENVIRONMENT_PLACEHOLDER__', // Will be replaced during build
	sendDefaultPii: true,
	tracesSampleRate: 1.0,
})

// Main bookmarklet entry point
import { showNotification } from './components/Notifications'
import { showEventResult } from './components/EventDialog'
import { showIrrelevantDialog } from './components/IrrelevantDialog'
import { extractImages } from './extractors/ImageExtractor'
import { extractEventData } from './services/ApiService'
import { parseEventData } from './utils/Parser'
import { EventData } from './types'

// Main functionality
import { showEnvironmentBadge } from './utils/UIUtils'
;(function () {
	Sentry.withScope((scope) => {
		scope.setTag('source', 'bookmarklet')
		scope.setContext('page', {
			url: window.location.href,
			title: document.title,
			domain: window.location.hostname,
		})

		try {
			// Ensure environment badge is visible
			showEnvironmentBadge()
			const url = window.location.href
			const content = document.body.innerText.slice(0, 10000)

			// Extract images - AWAIT the promise
			const images = await extractImages()

			const payload = {
				url: url,
				content: content,
				images: images,
			}

			// Show initial notification
			const loadingNotification = showNotification(
				'Extracting event data...',
				'info'
			)
			loadingNotification.id = 'sacit-loading-notification'

			console.log('[SacIT] Starting event extraction from:', url)
			console.log('[SacIT] Found images:', images.length)
			console.log('[SacIT] Image details:', images)

			// Extract event data
			fetch('__API_URL_PLACEHOLDER__', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-SacIT-Token': 'secret123', // Make sure this header name matches
				},
				body: JSON.stringify(payload),
			})
				.then((response) => response.json())
				.then((data) => {
					console.log('[SacIT] Event extraction successful:', data)

					// Update loading notification instead of hiding it
					const loadingNotification = document.getElementById(
						'sacit-loading-notification'
					)
					if (loadingNotification) {
						loadingNotification.textContent =
							'Processing results...'
					}

					// Parse the result
					const eventData = parseEventData(data)

					// Now hide and show results
					setTimeout(() => {
						if (loadingNotification) {
							loadingNotification.style.display = 'none'
						}

						if (eventData.irrelevant === true) {
							console.log('[SacIT] Event deemed irrelevant by AI')
							showNotification(
								'Event Not Relevant',
								'info',
								'This event was determined to be irrelevant for SacIT Central.'
							)
							showIrrelevantDialog(eventData)
						} else {
							showNotification(
								'Event extracted successfully!',
								'success'
							)
							showEventResult(eventData)
						}
					}, 100) // Small delay to ensure smooth transition
				})
				.catch((err) => {
					// ✅ CAPTURE API ERRORS
					Sentry.captureException(err, {
						tags: {
							source: 'bookmarklet-api-call',
							url: window.location.href,
						},
						extra: {
							payload: payload,
						},
					})

					console.error('[SacIT] Fetch error:', err)
					showNotification(
						'Error extracting event data',
						'error',
						err.message
					)
				})
		} catch (err) {
			// ✅ CAPTURE CRITICAL ERRORS
			Sentry.captureException(err, {
				tags: {
					source: 'bookmarklet-critical',
					url: window.location.href,
				},
			})

			console.error('[SacIT] Critical error:', err)
			showNotification('Critical error', 'error', err.message)
		}
	})
})()
