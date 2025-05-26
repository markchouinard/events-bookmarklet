// API interaction
import { EventData, ImageInfo } from '../types'

export const API_URL = 'http://localhost:3000/extract-event'

export const extractEventData = async (
	url: string,
	content: string,
	images: ImageInfo[]
): Promise<any> => {
	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-SacIT-Token': 'secret123',
			},
			body: JSON.stringify({ url, content, images }),
		})

		if (!response.ok) {
			throw new Error(
				`Server returned ${response.status} ${response.statusText}`
			)
		}

		return await response.json()
	} catch (error) {
		console.error('[SacIT] API error:', error)
		throw error
	}
}
