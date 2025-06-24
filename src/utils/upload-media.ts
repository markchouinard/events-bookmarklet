import fs from 'fs'
import FormData from 'form-data'
import fetch from 'node-fetch'
import {
	WordPressMediaObject,
	UploadOptions,
	ApiResponse,
} from '../types/wordpress'

export const uploadImage = async (
	imagePath: string,
	filename: string,
	baseUrl: string,
	username: string,
	password: string
): Promise<WordPressMediaObject> => {
	try {
		// Read the image file
		const imageBuffer: Buffer = fs.readFileSync(imagePath)

		// Create form data
		const formData = new FormData()
		formData.append('file', imageBuffer, {
			filename: filename,
			contentType: 'image/jpeg', // or determine from file extension
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

		if (!response.ok) {
			throw new Error(`Upload failed: ${response.statusText}`)
		}

		const mediaObject: WordPressMediaObject = await response.json()
		console.log('Image uploaded successfully:', mediaObject.id)
		return mediaObject
	} catch (error) {
		console.error('Error uploading image:', error)
		throw error
	}
}
