// API interaction
import { EventData, ImageInfo } from '../types'

// This will be replaced during the build process based on environment
export const API_URL = '__API_URL_PLACEHOLDER__'

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
