;(function () {
	// Configuration
	const API_URL = 'http://localhost:3000/extract-event'

	// Define types
	type NotificationType = 'info' | 'success' | 'error'

	interface EventData {
		title?: string
		description?: string
		start_time?: string
		end_time?: string
		location?: string
		source_url?: string
		tags?: string[] | string
		raw?: string
		[key: string]: any // Allow other properties
	}

	// Utility functions
	const createNotificationContainer = (): HTMLElement => {
		const existingContainer = document.getElementById(
			'sacit-notification-container'
		)
		if (existingContainer) return existingContainer

		const container = document.createElement('div')
		container.id = 'sacit-notification-container'
		container.style.position = 'fixed'
		container.style.top = '20px'
		container.style.right = '20px'
		container.style.zIndex = '9999'
		container.style.width = '400px'
		container.style.maxWidth = '80vw'
		container.style.fontFamily = 'Arial, sans-serif'
		document.body.appendChild(container)
		return container
	}

	const showNotification = (
		message: string,
		type: NotificationType = 'info',
		details: string | object | null = null
	): HTMLElement => {
		const container = createNotificationContainer()

		const notification = document.createElement('div')
		notification.style.marginBottom = '10px'
		notification.style.padding = '15px'
		notification.style.borderRadius = '4px'
		notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)'
		notification.style.wordBreak = 'break-word'
		notification.style.backgroundColor =
			type === 'error'
				? '#f44336'
				: type === 'success'
				? '#4CAF50'
				: '#2196F3'
		notification.style.color = 'white'

		// Main message
		const messageEl = document.createElement('div')
		messageEl.style.fontWeight = 'bold'
		messageEl.textContent = message
		notification.appendChild(messageEl)

		// Add details if provided
		if (details) {
			const detailsEl = document.createElement('div')
			detailsEl.style.marginTop = '8px'
			detailsEl.style.fontSize = '12px'
			detailsEl.style.opacity = '0.9'

			if (typeof details === 'object') {
				// Format JSON nicely
				try {
					detailsEl.innerHTML =
						'<pre style="margin: 0; white-space: pre-wrap;">' +
						JSON.stringify(details, null, 2) +
						'</pre>'
				} catch (e) {
					detailsEl.textContent = String(details)
				}
			} else {
				detailsEl.textContent = details
			}

			notification.appendChild(detailsEl)
		}

		container.appendChild(notification)

		// Remove after delay (longer for details)
		const timeout = details ? 20000 : 5000
		setTimeout(() => {
			notification.style.opacity = '0'
			notification.style.transition = 'opacity 0.5s'
			setTimeout(() => {
				try {
					container.removeChild(notification)
				} catch (e) {}
			}, 500)
		}, timeout)

		return notification
	}

	// Create result dialog for showing extracted event
	const showEventResult = (eventData: EventData): void => {
		// Remove any existing dialogs
		const existingDialog = document.getElementById('sacit-event-dialog')
		if (existingDialog) {
			document.body.removeChild(existingDialog)
		}

		// Create dialog container
		const dialog = document.createElement('div')
		dialog.id = 'sacit-event-dialog'
		dialog.style.position = 'fixed'
		dialog.style.top = '50%'
		dialog.style.left = '50%'
		dialog.style.transform = 'translate(-50%, -50%)'
		dialog.style.backgroundColor = 'white'
		dialog.style.color = '#333'
		dialog.style.padding = '20px'
		dialog.style.borderRadius = '8px'
		dialog.style.boxShadow = '0 5px 20px rgba(0,0,0,0.3)'
		dialog.style.zIndex = '10000'
		dialog.style.maxWidth = '80vw'
		dialog.style.maxHeight = '80vh'
		dialog.style.width = '600px'
		dialog.style.overflowY = 'auto'
		dialog.style.fontFamily = 'Arial, sans-serif'

		// Add title
		const title = document.createElement('h2')
		title.textContent = 'Extracted Event Data'
		title.style.margin = '0 0 15px 0'
		title.style.color = '#2196F3'
		dialog.appendChild(title)

		// Add event data in a nice format
		const contentDiv = document.createElement('div')

		// Format each field
		const eventFields = [
			{ key: 'title', label: 'Title' },
			{ key: 'description', label: 'Description' },
			{
				key: 'start_time',
				label: 'Start Time',
				format: (v: string) => new Date(v).toLocaleString(),
			},
			{
				key: 'end_time',
				label: 'End Time',
				format: (v: string | undefined) =>
					v ? new Date(v).toLocaleString() : 'N/A',
			},
			{ key: 'location', label: 'Location' },
			{ key: 'source_url', label: 'Source URL' },
			{
				key: 'tags',
				label: 'Tags',
				format: (v: string[] | string) =>
					Array.isArray(v) ? v.join(', ') : v,
			},
		]

		for (const field of eventFields) {
			const fieldValue = eventData[field.key]
			if (fieldValue) {
				const fieldDiv = document.createElement('div')
				fieldDiv.style.marginBottom = '10px'

				const label = document.createElement('strong')
				label.textContent = field.label + ': '
				fieldDiv.appendChild(label)

				const value = document.createElement('span')
				value.textContent = field.format
					? field.format(fieldValue)
					: fieldValue
				fieldDiv.appendChild(value)

				contentDiv.appendChild(fieldDiv)
			}
		}

		dialog.appendChild(contentDiv)

		// Add event image if available
		if (eventData.image_url) {
			const imageContainer = document.createElement('div')
			imageContainer.style.marginBottom = '15px'
			imageContainer.style.textAlign = 'center'

			const image = document.createElement('img')
			image.src = eventData.image_url
			image.alt = eventData.title || 'Event image'
			image.style.maxWidth = '100%'
			image.style.maxHeight = '300px'
			image.style.borderRadius = '4px'
			image.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)'

			imageContainer.appendChild(image)

			// Insert image at the top of the content
			dialog.insertBefore(imageContainer, contentDiv)
		}

		// Add close button
		const closeButton = document.createElement('button')
		closeButton.textContent = 'Close'
		closeButton.style.marginTop = '20px'
		closeButton.style.padding = '8px 16px'
		closeButton.style.backgroundColor = '#2196F3'
		closeButton.style.color = 'white'
		closeButton.style.border = 'none'
		closeButton.style.borderRadius = '4px'
		closeButton.style.cursor = 'pointer'
		closeButton.onclick = () => document.body.removeChild(dialog)
		dialog.appendChild(closeButton)

		// Add "View Raw Data" button for debugging
		if (eventData.raw || eventData._rawResponse) {
			const rawDataButton = document.createElement('button')
			rawDataButton.textContent = 'View Raw Data'
			rawDataButton.style.marginTop = '20px'
			rawDataButton.style.marginLeft = '10px'
			rawDataButton.style.padding = '8px 16px'
			rawDataButton.style.backgroundColor = '#607D8B'
			rawDataButton.style.color = 'white'
			rawDataButton.style.border = 'none'
			rawDataButton.style.borderRadius = '4px'
			rawDataButton.style.cursor = 'pointer'

			rawDataButton.onclick = () => {
				const rawData =
					eventData.raw ||
					eventData._rawResponse ||
					'No raw data available'
				const rawDialog = document.createElement('div')
				rawDialog.style.position = 'fixed'
				rawDialog.style.top = '50%'
				rawDialog.style.left = '50%'
				rawDialog.style.transform = 'translate(-50%, -50%)'
				rawDialog.style.backgroundColor = '#f5f5f5'
				rawDialog.style.padding = '20px'
				rawDialog.style.borderRadius = '8px'
				rawDialog.style.boxShadow = '0 5px 20px rgba(0,0,0,0.3)'
				rawDialog.style.zIndex = '10001'
				rawDialog.style.maxWidth = '90vw'
				rawDialog.style.maxHeight = '90vh'
				rawDialog.style.overflowY = 'auto'

				const pre = document.createElement('pre')
				pre.style.whiteSpace = 'pre-wrap'
				pre.style.wordBreak = 'break-word'
				pre.textContent =
					typeof rawData === 'string'
						? rawData
						: JSON.stringify(rawData, null, 2)
				rawDialog.appendChild(pre)

				const closeRawButton = document.createElement('button')
				closeRawButton.textContent = 'Close'
				closeRawButton.style.marginTop = '10px'
				closeRawButton.style.padding = '8px 16px'
				closeRawButton.onclick = () =>
					document.body.removeChild(rawDialog)
				rawDialog.appendChild(closeRawButton)

				document.body.appendChild(rawDialog)
			}

			dialog.appendChild(rawDataButton)
		}

		// Add overlay
		const overlay = document.createElement('div')
		overlay.style.position = 'fixed'
		overlay.style.top = '0'
		overlay.style.left = '0'
		overlay.style.width = '100%'
		overlay.style.height = '100%'
		overlay.style.backgroundColor = 'rgba(0,0,0,0.5)'
		overlay.style.zIndex = '9999'
		overlay.onclick = () => {
			document.body.removeChild(overlay)
			document.body.removeChild(dialog)
		}

		document.body.appendChild(overlay)
		document.body.appendChild(dialog)
	}

	// Main functionality
	try {
		const url = window.location.href
		const content = document.body.innerText.slice(0, 10000)

		// Show initial notification
		const loadingNotification = showNotification(
			'Extracting event data...',
			'info'
		)
		loadingNotification.id = 'sacit-loading-notification'

		console.log('[SacIT] Starting event extraction from:', url)

		fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-SacIT-Token': 'secret123',
			},
			body: JSON.stringify({ url, content }),
		})
			.then((response) => {
				console.log(
					`[SacIT] Server response status: ${response.status}`
				)

				if (!response.ok) {
					throw new Error(
						`Server returned ${response.status} ${response.statusText}`
					)
				}

				return response.json()
			})
			.then((data) => {
				console.log('[SacIT] Event extraction successful:', data)

				// Hide loading notification
				const loadingNotification = document.getElementById(
					'sacit-loading-notification'
				)
				if (loadingNotification) {
					loadingNotification.style.display = 'none'
				}

				// Show success notification
				showNotification('Event extracted successfully!', 'success')

				// Parse the result - sometimes it might come as a string that needs parsing
				let eventData: EventData = { raw: '' } // Initialize it first

				if (data.result && typeof data.result === 'string') {
					// Store the original response for debugging
					eventData = { raw: data.result } // Initialize with raw data first

					try {
						// Log the exact string for debugging
						console.log(
							'[SacIT] Raw result string:',
							JSON.stringify(data.result)
						)

						const jsonString = data.result.trim()

						// Case 1: If it contains markdown code blocks
						if (jsonString.includes('')) {
							console.log('[SacIT] Detected markdown code block')

							// More robust regex - extract anything between json and
							// This handles both \n and literal newlines in the string
							const codeBlockContent = jsonString
								.replace(/^json\s*/, '')
								.replace(/\s*```$/, '')
							console.log(
								'[SacIT] Extracted content:',
								codeBlockContent
							)

							// Try to parse the extracted content
							const parsedData = JSON.parse(codeBlockContent)
							console.log(
								'[SacIT] Successfully parsed JSON:',
								parsedData
							)

							// Update eventData with parsed content
							eventData = parsedData
							eventData._rawResponse = data.result
						}
						// Case 2: Direct JSON string
						else if (jsonString.startsWith('{')) {
							eventData = JSON.parse(jsonString)
							eventData._rawResponse = data.result
						} else {
							throw new Error('Unexpected response format')
						}
					} catch (e) {
						console.error('[SacIT] Error parsing result:', e)

						// FALLBACK METHOD: Try a more brute-force approach
						try {
							console.log(
								'[SacIT] Attempting fallback parsing method'
							)

							// Extract anything that looks like a JSON object
							const jsonMatch = data.result.match(/{[\s\S]*}/)
							if (jsonMatch) {
								const jsonObject = jsonMatch[0]
								console.log(
									'[SacIT] Found potential JSON:',
									jsonObject
								)

								const parsedData = JSON.parse(jsonObject)
								console.log(
									'[SacIT] Successfully parsed with fallback method:',
									parsedData
								)

								eventData = parsedData
								eventData._rawResponse = data.result
							} else {
								throw new Error('Fallback parsing also failed')
							}
						} catch (fallbackError) {
							console.error(
								'[SacIT] Fallback parsing failed:',
								fallbackError
							)

							// Show raw data when all parsing methods fail
							showNotification(
								'Parsing Error',
								'error',
								'Could not parse event data. See console for details.'
							)
						}
					}
				} else {
					eventData = data.result || data
				}

				// Show the extracted event data
				showEventResult(eventData)
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
