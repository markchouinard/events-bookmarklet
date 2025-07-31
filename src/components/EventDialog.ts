// Event dialog component
import { EventData } from '../types'
import { addWordPressSubmitButton } from './WordPressSubmit'

export const showEventResult = (eventData: EventData): void => {
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

	// Add image selection section if images are available
	if (eventData.availableImages && eventData.availableImages.length > 0) {
		const imageSection = document.createElement('div')
		imageSection.style.marginBottom = '20px'
		imageSection.style.borderBottom = '1px solid #eee'
		imageSection.style.paddingBottom = '15px'

		const imageTitle = document.createElement('h3')
		imageTitle.textContent = 'Select Event Image'
		imageTitle.style.margin = '0 0 10px 0'
		imageTitle.style.color = '#2196F3'
		imageTitle.style.fontSize = '16px'
		imageSection.appendChild(imageTitle)

		// Initialize selectedImage if not set (default to first image)
		if (!eventData.selectedImage && eventData.availableImages.length > 0) {
			eventData.selectedImage = eventData.availableImages[0]
		}

		// Create radio button group for image selection
		const imageGrid = document.createElement('div')
		imageGrid.style.display = 'grid'
		imageGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))'
		imageGrid.style.gap = '10px'
		imageGrid.style.marginBottom = '10px'

		// Add "No image" option
		const noImageOption = document.createElement('div')
		noImageOption.style.display = 'flex'
		noImageOption.style.flexDirection = 'column'
		noImageOption.style.alignItems = 'center'
		noImageOption.style.padding = '8px'
		noImageOption.style.border = '2px solid #ddd'
		noImageOption.style.borderRadius = '4px'
		noImageOption.style.cursor = 'pointer'
		noImageOption.style.backgroundColor = '#f9f9f9'

		const noImageRadio = document.createElement('input')
		noImageRadio.type = 'radio'
		noImageRadio.name = 'eventImage'
		noImageRadio.id = 'no-image'
		noImageRadio.style.marginBottom = '5px'

		const noImageLabel = document.createElement('label')
		noImageLabel.textContent = 'No Image'
		noImageLabel.htmlFor = 'no-image'
		noImageLabel.style.fontSize = '12px'
		noImageLabel.style.textAlign = 'center'
		noImageLabel.style.cursor = 'pointer'

		noImageOption.appendChild(noImageRadio)
		noImageOption.appendChild(noImageLabel)

		noImageRadio.onchange = () => {
			if (noImageRadio.checked) {
				eventData.selectedImage = null
				// Update border styles
				document.querySelectorAll('[name="eventImage"]').forEach((radio, index) => {
					const container = radio.parentElement as HTMLElement
					if (radio.checked) {
						container.style.borderColor = '#2196F3'
						container.style.backgroundColor = '#e3f2fd'
					} else {
						container.style.borderColor = '#ddd'
						container.style.backgroundColor = index === 0 ? '#f9f9f9' : '#fff'
					}
				})
				console.log('[SacIT] Selected image: none')
			}
		}

		imageGrid.appendChild(noImageOption)

		// Add image options (up to 5)
		eventData.availableImages.slice(0, 5).forEach((imageInfo, index) => {
			const imageOption = document.createElement('div')
			imageOption.style.display = 'flex'
			imageOption.style.flexDirection = 'column'
			imageOption.style.alignItems = 'center'
			imageOption.style.padding = '8px'
			imageOption.style.border = '2px solid #ddd'
			imageOption.style.borderRadius = '4px'
			imageOption.style.cursor = 'pointer'
			imageOption.style.backgroundColor = '#fff'

			// Set first image as selected by default
			if (index === 0 && eventData.selectedImage === imageInfo) {
				imageOption.style.borderColor = '#2196F3'
				imageOption.style.backgroundColor = '#e3f2fd'
			}

			const radio = document.createElement('input')
			radio.type = 'radio'
			radio.name = 'eventImage'
			radio.id = `image-${index}`
			radio.checked = eventData.selectedImage === imageInfo
			radio.style.marginBottom = '5px'

			const img = document.createElement('img')
			img.src = imageInfo.url
			img.alt = imageInfo.alt || 'Event image option'
			img.style.width = '80px'
			img.style.height = '60px'
			img.style.objectFit = 'cover'
			img.style.borderRadius = '2px'
			img.style.marginBottom = '5px'

			const imageLabel = document.createElement('label')
			imageLabel.htmlFor = `image-${index}`
			imageLabel.style.fontSize = '10px'
			imageLabel.style.textAlign = 'center'
			imageLabel.style.cursor = 'pointer'
			imageLabel.style.lineHeight = '1.2'
			imageLabel.textContent = `${imageInfo.dimensions || 'Unknown size'}`

			radio.onchange = () => {
				if (radio.checked) {
					eventData.selectedImage = imageInfo
					// Update border styles
					document.querySelectorAll('[name="eventImage"]').forEach((r, i) => {
						const container = r.parentElement as HTMLElement
						if (r.checked) {
							container.style.borderColor = '#2196F3'
							container.style.backgroundColor = '#e3f2fd'
						} else {
							container.style.borderColor = '#ddd'
							container.style.backgroundColor = i === 0 ? '#f9f9f9' : '#fff'
						}
					})
					console.log('[SacIT] Selected image:', imageInfo)
				}
			}

			imageOption.appendChild(radio)
			imageOption.appendChild(img)
			imageOption.appendChild(imageLabel)
			imageGrid.appendChild(imageOption)
		})

		imageSection.appendChild(imageGrid)

		// Add helper text
		const helperText = document.createElement('div')
		helperText.textContent = 'Choose an image to use for this event, or select "No Image"'
		helperText.style.fontSize = '12px'
		helperText.style.color = '#666'
		helperText.style.fontStyle = 'italic'
		imageSection.appendChild(helperText)

		dialog.appendChild(imageSection)
	}

	// Add event data in a nice format
	const contentDiv = document.createElement('div')

	// Format each field
	const eventFields = [
		{ key: 'title', label: 'Title' },
		{ key: 'content', label: 'Description' },
		{
			key: 'start_date',
			label: 'Start Date',
			format: (v: string) => new Date(v).toLocaleString(),
		},
		{
			key: 'end_date',
			label: 'End Date',
			format: (v: string | undefined) =>
				v ? new Date(v).toLocaleString() : 'N/A',
		},
		{ key: 'timezone', label: 'Timezone' },
		{ key: 'all_day', label: 'All Day', format: (v: boolean) => v ? 'Yes' : 'No' },
		{ key: 'venue', label: 'Venue' },
		{ key: 'organizer', label: 'Organizer' },
		{ key: 'cost', label: 'Cost' },
		{ key: 'url', label: 'Source URL', format: (v: string) => v.substring(0, 100) + (v.length > 100 ? '...' : '') },
		{
			key: 'tags',
			label: 'Tags',
			format: (v: string[] | string) =>
				Array.isArray(v) ? v.join(', ') : v,
		},
	]

	for (const field of eventFields) {
		const fieldValue = eventData[field.key]
		if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
			const fieldDiv = document.createElement('div')
			fieldDiv.style.marginBottom = '15px'
			fieldDiv.style.paddingBottom = '10px'
			fieldDiv.style.borderBottom = '1px solid #eee'

			const label = document.createElement('div')
			label.textContent = field.label
			label.style.fontWeight = 'bold'
			label.style.color = '#2196F3'
			label.style.marginBottom = '5px'
			fieldDiv.appendChild(label)

			const value = document.createElement('div')
			value.style.lineHeight = '1.4'
			value.style.color = '#333'
			
			// Special handling for description to preserve formatting
			if (field.key === 'content') {
				value.style.maxHeight = '150px'
				value.style.overflowY = 'auto'
				value.style.padding = '8px'
				value.style.backgroundColor = '#f9f9f9'
				value.style.borderRadius = '4px'
				value.style.whiteSpace = 'pre-wrap'
			}
			
			// Special handling for URL to make it clickable
			if (field.key === 'url') {
				const link = document.createElement('a')
				link.href = fieldValue
				link.target = '_blank'
				link.rel = 'noopener'
				link.textContent = field.format ? field.format(fieldValue) : fieldValue
				link.style.color = '#2196F3'
				link.style.textDecoration = 'underline'
				value.appendChild(link)
			} 
			// Special handling for tags to add checkboxes
			else if (field.key === 'tags' && Array.isArray(fieldValue)) {
				value.style.display = 'flex'
				value.style.flexWrap = 'wrap'
				value.style.gap = '8px'
				
				// Store selected tags on the event data for later use
				if (!eventData.selectedTags) {
					eventData.selectedTags = [...fieldValue] // All tags selected by default
				}
				
				fieldValue.forEach((tag: string, index: number) => {
					const tagContainer = document.createElement('div')
					tagContainer.style.display = 'flex'
					tagContainer.style.alignItems = 'center'
					tagContainer.style.backgroundColor = '#f0f8ff'
					tagContainer.style.border = '1px solid #ddd'
					tagContainer.style.borderRadius = '4px'
					tagContainer.style.padding = '4px 8px'
					tagContainer.style.fontSize = '14px'
					
					const checkbox = document.createElement('input')
					checkbox.type = 'checkbox'
					checkbox.checked = true // All tags selected by default
					checkbox.style.marginRight = '6px'
					checkbox.id = `tag-${index}`
					
					const tagLabel = document.createElement('label')
					tagLabel.textContent = tag
					tagLabel.htmlFor = `tag-${index}`
					tagLabel.style.cursor = 'pointer'
					tagLabel.style.fontSize = '14px'
					
					// Update selected tags when checkbox changes
					checkbox.onchange = () => {
						if (checkbox.checked) {
							if (!eventData.selectedTags.includes(tag)) {
								eventData.selectedTags.push(tag)
							}
						} else {
							const tagIndex = eventData.selectedTags.indexOf(tag)
							if (tagIndex > -1) {
								eventData.selectedTags.splice(tagIndex, 1)
							}
						}
						console.log('[SacIT] Selected tags:', eventData.selectedTags)
					}
					
					tagContainer.appendChild(checkbox)
					tagContainer.appendChild(tagLabel)
					value.appendChild(tagContainer)
				})
				
				// Add helper text
				const helperText = document.createElement('div')
				helperText.textContent = 'Uncheck tags you don\'t want to include when submitting to SacIT Central'
				helperText.style.fontSize = '12px'
				helperText.style.color = '#666'
				helperText.style.fontStyle = 'italic'
				helperText.style.marginTop = '8px'
				helperText.style.width = '100%'
				value.appendChild(helperText)
			} 
			else {
				value.textContent = field.format
					? field.format(fieldValue)
					: fieldValue
			}
			
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

	// Create overlay
	const overlay = document.createElement('div')
	overlay.style.position = 'fixed'
	overlay.style.top = '0'
	overlay.style.left = '0'
	overlay.style.width = '100%'
	overlay.style.height = '100%'
	overlay.style.backgroundColor = 'rgba(0,0,0,0.5)'
	overlay.style.zIndex = '9999'

	closeButton.onclick = () => {
		document.body.removeChild(overlay)
		document.body.removeChild(dialog)
	}
	dialog.appendChild(closeButton)

	// Add WordPress submit button before the close button
	addWordPressSubmitButton(dialog, eventData)

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
			const rawData = eventData._rawResponse || 'No raw data available'
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
			closeRawButton.onclick = () => document.body.removeChild(rawDialog)
			rawDialog.appendChild(closeRawButton)

			document.body.appendChild(rawDialog)
		}

		dialog.appendChild(rawDataButton)
	}

	// Add overlay click handler
	overlay.onclick = () => {
		document.body.removeChild(overlay)
		document.body.removeChild(dialog)
	}

	document.body.appendChild(overlay)
	document.body.appendChild(dialog)
}
