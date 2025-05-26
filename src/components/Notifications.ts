import { NotificationType } from '../types'

export const createNotificationContainer = (): HTMLElement => {
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

export const showNotification = (
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
