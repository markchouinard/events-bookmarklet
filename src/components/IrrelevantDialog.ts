import { EventData } from '../types'

export const showIrrelevantDialog = (eventData: EventData): void => {
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
			'<strong>Reason:</strong> ' + eventData.relevance_reason
		reason.style.marginBottom = '20px'
		dialog.appendChild(reason)
	}

	// Add event page info
	const pageInfo = document.createElement('div')
	pageInfo.innerHTML = '<strong>Page URL:</strong> ' + window.location.href
	pageInfo.style.fontSize = '12px'
	pageInfo.style.marginBottom = '20px'
	pageInfo.style.wordBreak = 'break-all'
	dialog.appendChild(pageInfo)

	// Add buttons
	const buttonContainer = document.createElement('div')
	buttonContainer.style.display = 'flex'
	buttonContainer.style.justifyContent = 'space-between'

	// Create overlay
	const overlay = document.createElement('div')
	overlay.style.position = 'fixed'
	overlay.style.top = '0'
	overlay.style.left = '0'
	overlay.style.width = '100%'
	overlay.style.height = '100%'
	overlay.style.backgroundColor = 'rgba(0,0,0,0.5)'
	overlay.style.zIndex = '9999'

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

		buttonContainer.appendChild(rawDataButton)
	}

	dialog.appendChild(buttonContainer)

	// Add overlay click handler
	overlay.onclick = () => {
		document.body.removeChild(overlay)
		document.body.removeChild(dialog)
	}

	document.body.appendChild(overlay)
	document.body.appendChild(dialog)
}
