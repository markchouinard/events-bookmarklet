import FormData from 'form-data'
import fetch from 'node-fetch'
import { WordPressMediaObject } from '../types/wordpress'

export const uploadImageFromUrl = async (
	imageUrl: string,
	filename: string,
	baseUrl: string,
	username: string,
	password: string
): Promise<WordPressMediaObject> => {
	try {
		// First, fetch the image from the URL
		const imageResponse = await fetch(imageUrl)
		if (!imageResponse.ok) {
			throw new Error(
				`Failed to fetch image: ${imageResponse.statusText}`
			)
		}

		const imageBuffer: Buffer = await imageResponse.buffer()
		const contentType: string =
			imageResponse.headers.get('content-type') || 'image/jpeg'

		// Create form data
		const formData = new FormData()
		formData.append('file', imageBuffer, {
			filename: filename,
			contentType: contentType,
		})

		const response = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
			method: 'POST',
			headers: {
				Authorization:
					'Basic ' +
					Buffer.from(`${username}:${password}`).toString('base64'),
				...formData.getHeaders(),
			},
			body: formData,
		})

		const result: WordPressMediaObject = await response.json()

		if (!response.ok) {
			throw new Error(`Upload failed: ${(result as any).message}`)
		}

		return result
	} catch (error) {
		console.error('Error uploading from URL:', error)
		throw error
	}
}
