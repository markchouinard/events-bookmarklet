import { EventData } from '../types'
import { showNotification } from './Notifications'
import { API_URL } from '../services/ApiService'

export const addWordPressSubmitButton = (
	dialog: HTMLElement,
	eventData: EventData
): void => {
	// Create container for WordPress submission
	const wpContainer = document.createElement('div')
	wpContainer.style.marginTop = '20px'
	wpContainer.style.borderTop = '1px solid #eee'
	wpContainer.style.paddingTop = '15px'

	// Create publish option checkbox
	const publishOption = document.createElement('div')
	publishOption.style.marginBottom = '15px'
	publishOption.style.display = 'flex'
	publishOption.style.alignItems = 'center'

	const publishCheckbox = document.createElement('input')
	publishCheckbox.type = 'checkbox'
	publishCheckbox.id = 'publish-immediately'
	publishCheckbox.style.marginRight = '8px'

	const publishLabel = document.createElement('label')
	publishLabel.htmlFor = 'publish-immediately'
	publishLabel.textContent = 'Publish immediately (unchecked = save as draft)'
	publishLabel.style.fontSize = '14px'
	publishLabel.style.cursor = 'pointer'
	publishLabel.style.color = '#333'

	publishOption.appendChild(publishCheckbox)
	publishOption.appendChild(publishLabel)

	// Create submit button
	const submitButton = document.createElement('button')
	submitButton.textContent = 'Submit to SacIT Central'
	submitButton.style.padding = '10px 16px'
	submitButton.style.backgroundColor = '#4CAF50'
	submitButton.style.color = 'white'
	submitButton.style.border = 'none'
	submitButton.style.borderRadius = '4px'
	submitButton.style.cursor = 'pointer'
	submitButton.style.fontWeight = 'bold'

	// Create status message
	const statusMessage = document.createElement('span')
	statusMessage.style.marginLeft = '10px'
	statusMessage.style.display = 'none'

	// Add click handler
	submitButton.onclick = async () => {
		try {
			submitButton.disabled = true
			submitButton.textContent = 'Submitting...'
			statusMessage.textContent = ''
			statusMessage.style.display = 'inline'

			// Prepare event data with selected tags, image, and publish status
			const submissionData = {
				...eventData,
				// Use selectedTags if available, otherwise fall back to all tags
				tags: eventData.selectedTags || eventData.tags,
				// Use selectedImage URL if available, otherwise fall back to original image_url
				image_url: eventData.selectedImage?.url || eventData.image_url,
				// Add publish status (draft by default, publish if checked)
				status: publishCheckbox.checked ? 'publish' : 'draft'
			}
			
			console.log('[SacIT] Submitting event with selected tags:', submissionData.tags)
			console.log('[SacIT] Submitting event with selected image:', submissionData.image_url)
			console.log('[SacIT] Submitting event as:', submissionData.status)
			console.log('[SacIT] Submitting event content:', submissionData.content?.substring(0, 100) + '...')

			// Make API request to your server
			const response = await fetch(
				`${API_URL.replace('/extract-event', '')}/submit-to-wordpress`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-SacIT-Token': 'secret123',
					},
					body: JSON.stringify({ eventData: submissionData }),
				}
			)

			const result = await response.json()

			if (result.success) {
				const isPublished = submissionData.status === 'publish'
				statusMessage.textContent = `✓ Event ${isPublished ? 'published' : 'saved as draft'} successfully!`
				statusMessage.style.color = '#4CAF50'

				// Show notification
				showNotification(
					`Event ${isPublished ? 'published' : 'saved as draft'} to SacIT Central!`,
					'success',
					`The event "${eventData.title}" has been ${isPublished ? 'published' : 'saved as a draft'}.`
				)

				// Disable button to prevent duplicate submissions
				submitButton.textContent = `${isPublished ? 'Published' : 'Saved as Draft'} ✓`
				submitButton.style.backgroundColor = '#888'
			} else {
				throw new Error(result.message || 'Unknown error')
			}
		} catch (error) {
			console.error('Error submitting to WordPress:', error)
			statusMessage.textContent = `✗ Error: ${error.message}`
			statusMessage.style.color = '#f44336'
			submitButton.disabled = false
			submitButton.textContent = 'Try Again'

			// Show notification
			showNotification('Failed to submit event', 'error', error.message)
		}
	}

	// Add elements to container
	wpContainer.appendChild(publishOption)
	wpContainer.appendChild(submitButton)
	wpContainer.appendChild(statusMessage)

	// Add container to dialog
	dialog.appendChild(wpContainer)
}
