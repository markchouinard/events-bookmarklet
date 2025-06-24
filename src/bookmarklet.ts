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
	try {
		// Ensure environment badge is visible
		showEnvironmentBadge()
		const url = window.location.href
		const content = document.body.innerText.slice(0, 10000)

		// Extract images
		const images = extractImages()

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
		fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-SacIT-Token': 'secret123', // Make sure this header name matches
			},
			body: JSON.stringify(payload),
		})
			.then((data) => {
				console.log('[SacIT] Event extraction successful:', data)

				// Update loading notification instead of hiding it
				const loadingNotification = document.getElementById(
					'sacit-loading-notification'
				)
				if (loadingNotification) {
					loadingNotification.textContent = 'Processing results...'
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
		console.error('[SacIT] Critical error:', err)
		const errorMessage = err instanceof Error ? err.message : String(err)
		showNotification('Critical error', 'error', errorMessage)
	}
})()
