import * as Sentry from '@sentry/browser'

// ✅ REAL SENTRY INIT - FIRST THING
Sentry.init({
	dsn: 'https://d0218b8c4606d5f2a3480ad10db9ed67@o4507068179349504.ingest.us.sentry.io/4507588915691521',
	environment: '__ENVIRONMENT_PLACEHOLDER__',
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
import { showEnvironmentBadge } from './utils/UIUtils'

// ✅ KEEP ORIGINAL STRUCTURE - Just add Sentry context and error capture
;(function () {
	try {
		// ✅ SET SENTRY CONTEXT
		Sentry.setContext('page', {
			url: window.location.href,
			title: document.title,
			domain: window.location.hostname,
		})
		Sentry.setTag('source', 'bookmarklet')

		// Ensure environment badge is visible
		showEnvironmentBadge()
		const url = window.location.href
		const content = document.body.innerText.slice(0, 10000)

		// Extract images
		const images = extractImages()

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
				'X-SacIT-Token': 'secret123',
			},
			body: JSON.stringify(payload),
		})
			.then((response) => response.json())
			.then((data) => {
				console.log('[SacIT] Event extraction successful:', data)

				// Update loading notification
				const loadingNotification = document.getElementById(
					'sacit-loading-notification'
				)
				if (loadingNotification) {
					loadingNotification.textContent = 'Processing results...'
				}

				// Parse the result
				const eventData = parseEventData(data)

				// Show results
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
				}, 100)
			})
			.catch((err) => {
				// ✅ CAPTURE API ERRORS IN SENTRY
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
				const errorMessage =
					err instanceof Error ? err.message : String(err)
				showNotification(
					'Error extracting event data',
					'error',
					errorMessage
				)
			})
	} catch (err) {
		// ✅ CAPTURE CRITICAL ERRORS IN SENTRY
		Sentry.captureException(err, {
			tags: {
				source: 'bookmarklet-critical',
				url: window.location.href,
			},
		})

		console.error('[SacIT] Critical error:', err)
		const errorMessage = err instanceof Error ? err.message : String(err)
		showNotification('Critical error', 'error', errorMessage)
	}
})()
