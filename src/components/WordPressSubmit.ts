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

			// Make API request to your server
			const response = await fetch(
				`${API_URL.replace('/extract-event', '')}/submit-to-wordpress`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-SacIT-Token': 'secret123',
					},
					body: JSON.stringify({ eventData }),
				}
			)

			const result = await response.json()

			if (result.success) {
				statusMessage.textContent = '✓ Event submitted successfully!'
				statusMessage.style.color = '#4CAF50'

				// Show notification
				showNotification(
					'Event submitted to SacIT Central!',
					'success',
					`The event "${eventData.title}" has been submitted as a draft.`
				)

				// Disable button to prevent duplicate submissions
				submitButton.textContent = 'Submitted ✓'
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
	wpContainer.appendChild(submitButton)
	wpContainer.appendChild(statusMessage)

	// Add container to dialog
	dialog.appendChild(wpContainer)
}
