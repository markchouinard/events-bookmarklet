import fs from 'fs'
import FormData from 'form-data'
import fetch from 'node-fetch'
import { WordPressMediaObject, UploadOptions } from '../types/wordpress'

export const uploadImageWithMetadata = async (
	imagePath: string,
	baseUrl: string,
	username: string,
	password: string,
	metadata: UploadOptions = {}
): Promise<WordPressMediaObject> => {
	const imageBuffer: Buffer = fs.readFileSync(imagePath)
	const formData = new FormData()

	// Add the file
	formData.append('file', imageBuffer, {
		filename: metadata.filename || 'image.jpg',
		contentType: metadata.contentType || 'image/jpeg',
	})

	// Add metadata fields
	if (metadata.title) {
		formData.append('title', metadata.title)
	}
	if (metadata.caption) {
		formData.append('caption', metadata.caption)
	}
	if (metadata.description) {
		formData.append('description', metadata.description)
	}
	if (metadata.alt_text) {
		formData.append('alt_text', metadata.alt_text)
	}

	try {
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
			throw new Error(
				`Upload failed: ${
					(result as any).message || response.statusText
				}`
			)
		}

		return result
	} catch (error) {
		console.error('Upload error:', error)
		throw error
	}
}
