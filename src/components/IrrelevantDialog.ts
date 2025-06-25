import { EventData } from '../types'

export const showIrrelevantDialog = (eventData: any) => {
	try {
		console.log('[SacIT] showIrrelevantDialog called with:', eventData)

		// Remove any existing dialogs
		const existingDialog = document.getElementById(
			'sacit-irrelevant-dialog'
		)
		if (existingDialog) {
			existingDialog.remove()
		}

		// Create dialog
		const dialog = document.createElement('div')
		dialog.id = 'sacit-irrelevant-dialog'
		dialog.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: white;
			border: 2px solid #ff6b6b;
			border-radius: 8px;
			padding: 20px;
			box-shadow: 0 4px 20px rgba(0,0,0,0.3);
			z-index: 10001;
			max-width: 500px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		`

		// Safely extract the reason
		const reason =
			eventData && eventData.reason
				? eventData.reason
				: 'No specific reason provided'
		console.log('[SacIT] Extracted reason:', reason)

		dialog.innerHTML = `
			<div style="text-align: center;">
				<h3 style="color: #ff6b6b; margin: 0 0 15px 0; font-size: 18px;">
					❌ Event Not Relevant
				</h3>

				<div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 6px; padding: 15px; margin: 15px 0; text-align: left;">
					<strong style="color: #c53030;">Reason:</strong>
					<div style="margin-top: 8px; color: #2d3748; line-height: 1.4;">
						${reason}
					</div>
				</div>

				<button id="sacit-irrelevant-close" style="
					background: #ff6b6b;
					color: white;
					border: none;
					padding: 12px 24px;
					border-radius: 4px;
					cursor: pointer;
					font-size: 14px;
					font-weight: bold;
				">Close</button>
			</div>
		`

		// Add to page
		document.body.appendChild(dialog)
		console.log('[SacIT] Dialog added to page')

		// Add close handler
		const closeBtn = document.getElementById('sacit-irrelevant-close')
		if (closeBtn) {
			closeBtn.addEventListener('click', () => {
				console.log('[SacIT] Close button clicked')
				dialog.remove()
			})
		}

		console.log('[SacIT] Dialog setup complete')
	} catch (error) {
		console.error('[SacIT] Error in showIrrelevantDialog:', error)
		// Fallback: show simple alert
		alert(
			`Event Not Relevant: ${
				eventData?.reason || 'No specific reason provided'
			}`
		)
	}
}
