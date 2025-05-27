import fs from 'fs'
import FormData from 'form-data'
import fetch from 'node-fetch'
import { WordPressMediaObject, UploadOptions } from '../types/wordpress'

export class MediaUploader {
	private baseUrl: string
	private auth: string

	constructor(baseUrl: string, username: string, password: string) {
		this.baseUrl = baseUrl
		this.auth = Buffer.from(`${username}:${password}`).toString('base64')
	}

	async uploadFile(
		filePath: string,
		options: UploadOptions = {}
	): Promise<WordPressMediaObject> {
		const { filename, title, caption, description, alt_text } = options

		try {
			const fileBuffer: Buffer = fs.readFileSync(filePath)
			const formData = new FormData()

			// Determine content type from file extension
			const ext: string = filePath.split('.').pop()?.toLowerCase() || ''
			const contentType: string = this.getContentType(ext)

			formData.append('file', fileBuffer, {
				filename: filename || `upload.${ext}`,
				contentType: contentType,
			})

			// Add metadata
			if (title) formData.append('title', title)
			if (caption) formData.append('caption', caption)
			if (description) formData.append('description', description)
			if (alt_text) formData.append('alt_text', alt_text)

			const response = await fetch(
				`${this.baseUrl}/wp-json/wp/v2/media`,
				{
					method: 'POST',
					headers: {
						Authorization: `Basic ${this.auth}`,
						...formData.getHeaders(),
					},
					body: formData,
				}
			)

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
			console.error('Upload failed:', error)
			throw error
		}
	}

	private getContentType(extension: string): string {
		const types: Record<string, string> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp',
			pdf: 'application/pdf',
		}
		return types[extension] || 'application/octet-stream'
	}

	async deleteMedia(mediaId: number): Promise<any> {
		try {
			const response = await fetch(
				`${this.baseUrl}/wp-json/wp/v2/media/${mediaId}`,
				{
					method: 'DELETE',
					headers: {
						Authorization: `Basic ${this.auth}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ force: true }),
				}
			)

			return await response.json()
		} catch (error) {
			console.error('Delete failed:', error)
			throw error
		}
	}

	async getMedia(mediaId: number): Promise<WordPressMediaObject> {
		try {
			const response = await fetch(
				`${this.baseUrl}/wp-json/wp/v2/media/${mediaId}`,
				{
					headers: {
						Authorization: `Basic ${this.auth}`,
					},
				}
			)

			if (!response.ok) {
				throw new Error(`Failed to get media: ${response.statusText}`)
			}

			return await response.json()
		} catch (error) {
			console.error('Get media failed:', error)
			throw error
		}
	}

	async uploadBuffer(
		buffer: Buffer,
		options: UploadOptions & { contentType?: string } = {}
	): Promise<WordPressMediaObject> {
		const { filename, title, caption, description, alt_text, contentType } =
			options

		try {
			const formData = new FormData()

			// Use provided contentType or determine from filename
			const finalContentType =
				contentType ||
				this.getContentType(
					filename?.split('.').pop()?.toLowerCase() || ''
				)

			formData.append('file', buffer, {
				filename: filename || 'upload.jpg',
				contentType: finalContentType,
			})

			// Add metadata
			if (title) formData.append('title', title)
			if (caption) formData.append('caption', caption)
			if (description) formData.append('description', description)
			if (alt_text) formData.append('alt_text', alt_text)

			const response = await fetch(
				`${this.baseUrl}/wp-json/wp/v2/media`,
				{
					method: 'POST',
					headers: {
						Authorization: `Basic ${this.auth}`,
						...formData.getHeaders(),
					},
					body: formData,
				}
			)

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
			console.error('Upload buffer failed:', error)
			throw error
		}
	}

	async uploadFromBase64(
		base64Data: string,
		options: UploadOptions = {}
	): Promise<WordPressMediaObject> {
		try {
			// Remove data URL prefix if present (data:image/jpeg;base64,...)
			const base64String = base64Data.includes(',')
				? base64Data.split(',')[1]
				: base64Data

			// Convert base64 to buffer
			const buffer = Buffer.from(base64String, 'base64')

			// Detect content type from data URL if present
			let contentType = 'image/jpeg'
			if (base64Data.startsWith('data:')) {
				const match = base64Data.match(/data:([^;]+)/)
				if (match) contentType = match[1]
			}

			// Use uploadBuffer with detected content type
			return await this.uploadBuffer(buffer, {
				...options,
				contentType,
			})
		} catch (error) {
			console.error('Upload from base64 failed:', error)
			throw error
		}
	}

	async uploadFromUrl(
		imageUrl: string,
		options: UploadOptions = {}
	): Promise<WordPressMediaObject> {
		try {
			console.log(`Downloading image from: ${imageUrl}`)

			const imageResponse = await fetch(imageUrl)
			if (!imageResponse.ok) {
				throw new Error(
					`Failed to fetch image: ${imageResponse.statusText}`
				)
			}

			const imageArrayBuffer = await imageResponse.arrayBuffer()
			const imageBuffer = Buffer.from(imageArrayBuffer)
			const contentType =
				imageResponse.headers.get('content-type') || 'image/jpeg'

			// Generate filename if not provided
			if (!options.filename) {
				const extension = contentType.includes('png') ? 'png' : 'jpg'
				options.filename = `upload-${Date.now()}.${extension}`
			}

			return await this.uploadBuffer(imageBuffer, {
				...options,
				contentType,
			})
		} catch (error) {
			console.error('Upload from URL failed:', error)
			throw error
		}
	}
}

// Usage
// const uploader = new MediaUploader(
// 	'https://yoursite.com',
// 	'username',
// 	'password'
// )
// const media = await uploader.uploadFile('./event-image.jpg', {
// 	title: 'Event Featured Image',
// 	alt_text: 'Beautiful event venue',
// })
