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
		image_url?: string | null
		raw?: string
		_rawResponse?: string
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
			dialog.appendChild(imageContainer)
		}

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
		closeButton.onclick = () => {
			document.body.removeChild(overlay)
			document.body.removeChild(dialog)
		}
		dialog.appendChild(closeButton)

		// Add "View Raw Data" button for debugging
		if (eventData._rawResponse) {
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
					eventData._rawResponse || 'No raw data available'
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

	// Extract images from the page
	const extractImages = (): Array<{
		url: string
		alt: string
		dimensions: string
	}> => {
		const images = []

		// Special handling for Meetup
		if (window.location.href.includes('meetup.com')) {
			console.log(
				'[SacIT] Detected Meetup site, using specialized extraction'
			)

			// Method 1: Try to find structured data (most reliable)
			try {
				// Look for JSON-LD structured data which often contains the image
				const jsonLdScripts = document.querySelectorAll(
					'script[type="application/ld+json"]'
				)
				Array.from(jsonLdScripts).forEach((script) => {
					try {
						if (script.textContent) {
							const data = JSON.parse(script.textContent)
							if (data.image && typeof data.image === 'string') {
								console.log(
									'[SacIT] Found image in JSON-LD:',
									data.image
								)
								images.push({
									url: data.image,
									alt: data.name || 'Event image',
									dimensions: 'unknown',
								})
							}
						}
					} catch (e) {
						console.error('[SacIT] Error parsing JSON-LD:', e)
					}
				})
			} catch (e) {
				console.error('[SacIT] Error extracting from JSON-LD:', e)
			}

			// Method 2: Try various Meetup selectors
			const selectors = [
				// Newer Meetup design
				'.event-info-group-photo img',
				'.eventPageHead--photo img',
				'.groupHomeHeader-banner img',
				'.event-photo img',
				'.photo-module img',
				'.eventHeaderPhoto img',
				'.event-header-image img',
				// General large images
				'img[style*="width: 100%"]',
				'img[width="600"]',
				'img[width="800"]',
				// Fallback to any large image
				'img[width][height]',
			]

			for (const selector of selectors) {
				const elements = document.querySelectorAll(selector)
				console.log(
					`[SacIT] Selector "${selector}" found ${elements.length} elements`
				)

				Array.from(elements).forEach((el) => {
					if (
						el instanceof HTMLImageElement &&
						el.src &&
						!el.src.includes('icon') &&
						!el.src.includes('logo')
					) {
						const width = el.naturalWidth || el.width
						const height = el.naturalHeight || el.height

						// Skip tiny images
						if (width && height && (width < 100 || height < 100))
							return

						console.log(
							`[SacIT] Found potential Meetup image: ${el.src} (${width}x${height})`
						)
						images.push({
							url: el.src,
							alt: el.alt || 'Meetup event image',
							dimensions: `${width}x${height}`,
						})
					}
				})
			}

			// Method 3: Look for Open Graph meta tags
			const ogImage = document.querySelector('meta[property="og:image"]')
			if (ogImage && ogImage.getAttribute('content')) {
				const imageUrl = ogImage.getAttribute('content')
				if (imageUrl) {
					// Add this check to ensure imageUrl is not null
					console.log('[SacIT] Found Open Graph image:', imageUrl)
					images.push({
						url: imageUrl,
						alt: 'Open Graph image',
						dimensions: 'unknown',
					})
				}
			}

			// Method 4: Check for background images
			const possibleBanners = document.querySelectorAll(
				'.eventPageHead, .groupHome-banner, .eventPageHead--photo'
			)
			Array.from(possibleBanners).forEach((el) => {
				const style = window.getComputedStyle(el)
				const bgImage = style.backgroundImage
				if (bgImage && bgImage !== 'none') {
					const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/)
					if (match && match[1]) {
						console.log('[SacIT] Found background image:', match[1])
						images.push({
							url: match[1],
							alt: 'Background image',
							dimensions: `${el.clientWidth}x${el.clientHeight}`,
						})
					}
				}
			})

			// Method 5: Get the group logo as fallback
			const groupLogo = document.querySelector(
				'.groupHomeHeader-groupLogo img, .organizerAvatar img, .avatar--org img'
			)
			if (groupLogo instanceof HTMLImageElement && groupLogo.src) {
				console.log('[SacIT] Found Meetup group logo:', groupLogo.src)
				images.push({
					url: groupLogo.src,
					alt: 'Meetup group logo',
					dimensions: 'unknown',
				})
			}
		} else {
			// Standard image extraction for non-Meetup sites
			const imgTags = document.querySelectorAll('img')
			Array.from(imgTags).forEach((img) => {
				if (
					!img.src ||
					img.src.trim() === '' ||
					img.src.startsWith('data:')
				)
					return

				const width = img.naturalWidth || img.width
				const height = img.naturalHeight || img.height

				// Skip very small images
				if (width < 100 || height < 100) return

				images.push({
					url: img.src,
					alt: img.alt || '',
					dimensions: `${width}x${height}`,
				})
			})

			// Also check for Open Graph image (commonly used for sharing)
			const ogImage = document.querySelector('meta[property="og:image"]')
			if (ogImage && ogImage.getAttribute('content')) {
				images.push({
					url: ogImage.getAttribute('content') || '',
					alt: 'Open Graph image',
					dimensions: 'unknown',
				})
			}
		}

		// Debug output all found images
		console.log('[SacIT] All extracted images:', images)

		return images
			.filter((img) => img.url !== null) // Filter out any null URLs
			.slice(0, 10) // Limit to 10 images
	}

	// Debug images for Meetup
	const debugMeetupImages = () => {
		if (!window.location.hostname.includes('meetup.com')) {
			return
		}

		console.log('[SacIT] DEBUG: Analyzing Meetup page structure')

		// Print all meta tags
		const metaTags = document.querySelectorAll('meta')
		console.log(`[SacIT] Found ${metaTags.length} meta tags`)
		Array.from(metaTags).forEach((meta) => {
			if (
				meta.getAttribute('property')?.includes('image') ||
				meta.getAttribute('name')?.includes('image')
			) {
				console.log('Meta image tag:', meta.outerHTML)
			}
		})

		// Print all image elements
		const allImages = document.querySelectorAll('img')
		console.log(`[SacIT] Found ${allImages.length} img elements`)
		Array.from(allImages).forEach((img) => {
			if (img.src && img.width > 100 && img.height > 100) {
				console.log(
					`Image: ${img.src} (${img.width}x${img.height}) alt="${img.alt}"`
				)
			}
		})

		// Check for JSON-LD
		const jsonLdElements = document.querySelectorAll(
			'script[type="application/ld+json"]'
		)
		console.log(`[SacIT] Found ${jsonLdElements.length} JSON-LD elements`)
	}

	// Main functionality
	try {
		const url = window.location.href
		const content = document.body.innerText.slice(0, 10000)

		// Extract images
		const images = extractImages()

		// Debug Meetup images
		debugMeetupImages()

		// Show initial notification
		const loadingNotification = showNotification(
			'Extracting event data...',
			'info'
		)
		loadingNotification.id = 'sacit-loading-notification'

		console.log('[SacIT] Starting event extraction from:', url)
		console.log('[SacIT] Found images:', images.length)
		console.log('[SacIT] Image details:', images)

		fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-SacIT-Token': 'secret123',
			},
			body: JSON.stringify({
				url,
				content,
				images,
			}),
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

				// Parse the result - sometimes it might come as a string that needs parsing
				let eventData: EventData = { raw: '' }

				if (data.result && typeof data.result === 'string') {
					// Store the original response for debugging
					eventData = { raw: data.result }

					try {
						// Fix: Properly extract JSON from markdown code blocks
						const jsonString = data.result.trim()

						// Case 1: If it starts with a backtick, it's likely a markdown code block
						if (jsonString.startsWith('')) {
							console.log(
								'[SacIT] Detected markdown code block, attempting to extract JSON'
							)
							// Extract content between triple backticks, ignoring the json part
							const match = jsonString.match(
								/(?:json)?\n([\s\S]+?)\n/
							)
							if (match && match[1]) {
								console.log(
									'[SacIT] Extracted content from code block:',
									match[1]
								)
								eventData = JSON.parse(match[1].trim())
								// Keep the raw data for debugging
								eventData._rawResponse = data.result
							} else {
								throw new Error(
									'Could not extract JSON from code block'
								)
							}
						}
						// Case 2: If it's a plain JSON string
						else if (jsonString.startsWith('{')) {
							eventData = JSON.parse(jsonString)
							// Keep the raw data for debugging
							eventData._rawResponse = data.result
						}
						// Case 3: Some other string format
						else {
							throw new Error('Unexpected response format')
						}
					} catch (e) {
						console.error('[SacIT] Error parsing result:', e)
						// Show raw data when parsing fails
						showNotification(
							'Parsing Error',
							'error',
							'Could not parse event data. See console for details.'
						)
						eventData = {
							title: 'Parsing Error',
							description: 'Raw data received from server:',
							raw: data.result,
						}
					}
				} else {
					eventData = data.result || data
				}

				// After you've parsed the eventData, add this check for irrelevant events:
				if (eventData.irrelevant === true) {
					console.log('[SacIT] Event deemed irrelevant by AI')

					// Show notification explaining that the event is irrelevant
					showNotification(
						'Event Not Relevant',
						'info',
						'This event was determined to be irrelevant for SacIT Central. The AI looks for tech, professional networking, or IT events in California.'
					)

					// Create a simplified dialog for irrelevant events
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
					dialog.style.maxWidth = '500px'
					dialog.style.width = '80vw'
					dialog.style.fontFamily = 'Arial, sans-serif'

					// Add title
					const title = document.createElement('h2')
					title.textContent = 'Event Not Relevant'
					title.style.margin = '0 0 15px 0'
					title.style.color = '#607D8B'
					dialog.appendChild(title)

					// Add explanation
					const explanation = document.createElement('p')
					explanation.textContent =
						'This event was determined to be irrelevant for SacIT Central.'
					explanation.style.marginBottom = '10px'
					dialog.appendChild(explanation)

					// Add criteria
					const criteria = document.createElement('p')
					criteria.innerHTML =
						'The AI looks for events related to:<br>• Technology<br>• Professional networking<br>• IT in California'
					criteria.style.marginBottom = '20px'
					criteria.style.backgroundColor = '#f5f5f5'
					criteria.style.padding = '10px'
					criteria.style.borderRadius = '4px'
					dialog.appendChild(criteria)

					// Add reason if available
					if (eventData.relevance_reason) {
						const reason = document.createElement('div')
						reason.innerHTML =
							'<strong>Reason:</strong> ' +
							eventData.relevance_reason
						reason.style.marginBottom = '20px'
						dialog.appendChild(reason)
					}

					// Add event page info
					const pageInfo = document.createElement('div')
					pageInfo.innerHTML =
						'<strong>Page URL:</strong> ' + window.location.href
					pageInfo.style.fontSize = '12px'
					pageInfo.style.marginBottom = '20px'
					pageInfo.style.wordBreak = 'break-all'
					dialog.appendChild(pageInfo)

					// Add buttons
					const buttonContainer = document.createElement('div')
					buttonContainer.style.display = 'flex'
					buttonContainer.style.justifyContent = 'space-between'

					// Close button
					const closeButton = document.createElement('button')
					closeButton.textContent = 'Close'
					closeButton.style.padding = '8px 16px'
					closeButton.style.backgroundColor = '#607D8B'
					closeButton.style.color = 'white'
					closeButton.style.border = 'none'
					closeButton.style.borderRadius = '4px'
					closeButton.style.cursor = 'pointer'
					closeButton.onclick = () => {
						document.body.removeChild(overlay)
						document.body.removeChild(dialog)
					}
					buttonContainer.appendChild(closeButton)

					// Add "View Raw Data" button for debugging
					if (eventData._rawResponse) {
						const rawDataButton = document.createElement('button')
						rawDataButton.textContent = 'View Raw Data'
						rawDataButton.style.padding = '8px 16px'
						rawDataButton.style.backgroundColor = '#9E9E9E'
						rawDataButton.style.color = 'white'
						rawDataButton.style.border = 'none'
						rawDataButton.style.borderRadius = '4px'
						rawDataButton.style.cursor = 'pointer'

						rawDataButton.onclick = () => {
							const rawData =
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
							rawDialog.style.boxShadow =
								'0 5px 20px rgba(0,0,0,0.3)'
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

							const closeRawButton =
								document.createElement('button')
							closeRawButton.textContent = 'Close'
							closeRawButton.style.marginTop = '10px'
							closeRawButton.style.padding = '8px 16px'
							closeRawButton.onclick = () =>
								document.body.removeChild(rawDialog)
							rawDialog.appendChild(closeRawButton)

							document.body.appendChild(rawDialog)
						}

						buttonContainer.appendChild(rawDataButton)
					}

					dialog.appendChild(buttonContainer)

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
				} else {
					// Not irrelevant - show the normal event result dialog
					showNotification('Event extracted successfully!', 'success')
					showEventResult(eventData)
				}
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
