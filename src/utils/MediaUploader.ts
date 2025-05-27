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

			// Validate file type
			if (!this.isValidImageType(ext)) {
				throw new Error(`Unsupported file type: ${ext}`)
			}

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
			// Common raster formats
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp',
			bmp: 'image/bmp',

			// Modern formats
			avif: 'image/avif',
			heic: 'image/heic',
			heif: 'image/heif',

			// Vector formats
			svg: 'image/svg+xml',

			// TIFF formats
			tiff: 'image/tiff',
			tif: 'image/tiff',

			// Icon formats
			ico: 'image/x-icon',

			// Other formats
			pdf: 'application/pdf',
		}
		return types[extension] || 'application/octet-stream'
	}

	private isValidImageType(extension: string): boolean {
		const validTypes = [
			'jpg',
			'jpeg',
			'png',
			'gif',
			'webp',
			'bmp',
			'svg',
			'tiff',
			'tif',
			'ico',
			'avif',
			'heic',
			'heif',
		]
		return validTypes.includes(extension.toLowerCase())
	}

	private getFileExtensionFromContentType(contentType: string): string {
		const typeMap: Record<string, string> = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'image/webp': 'webp',
			'image/svg+xml': 'svg',
			'image/bmp': 'bmp',
			'image/tiff': 'tiff',
			'image/x-icon': 'ico',
			'image/avif': 'avif',
			'image/heic': 'heic',
			'image/heif': 'heif',
		}
		return typeMap[contentType] || 'jpg'
	}

	private sanitizeFilename(filename: string): string {
		// Remove or replace invalid characters for WordPress
		return filename
			.replace(/[^a-zA-Z0-9.-]/g, '_')
			.replace(/_{2,}/g, '_')
			.toLowerCase()
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

			// Validate content type
			if (!this.isValidContentType(finalContentType)) {
				throw new Error(`Unsupported content type: ${finalContentType}`)
			}

			// Generate filename if not provided
			const finalFilename =
				filename ||
				`upload-${Date.now()}.${this.getFileExtensionFromContentType(
					finalContentType
				)}`

			// Sanitize filename
			const sanitizedFilename = this.sanitizeFilename(finalFilename)

			formData.append('file', buffer, {
				filename: sanitizedFilename,
				contentType: finalContentType,
			})

			// Add metadata
			if (title) formData.append('title', title)
			if (caption) formData.append('caption', caption)
			if (description) formData.append('description', description)
			if (alt_text) formData.append('alt_text', alt_text)

			console.log(
				`Uploading ${finalContentType} file: ${sanitizedFilename}`
			)

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

	private isValidContentType(contentType: string): boolean {
		const validTypes = [
			'image/jpeg',
			'image/png',
			'image/gif',
			'image/webp',
			'image/bmp',
			'image/svg+xml',
			'image/tiff',
			'image/x-icon',
			'image/avif',
			'image/heic',
			'image/heif',
		]
		return validTypes.includes(contentType)
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
				if (match) {
					contentType = match[1]
					// Handle SVG data URLs specifically
					if (contentType === 'image/svg' || contentType === 'svg') {
						contentType = 'image/svg+xml'
					}
				}
			}

			// Generate appropriate filename if not provided
			if (!options.filename) {
				const extension =
					this.getFileExtensionFromContentType(contentType)
				options.filename = `base64-upload-${Date.now()}.${extension}`
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
			// Check if it's an SVG and skip it
			const isSVG =
				imageUrl.toLowerCase().includes('.svg') ||
				imageUrl.toLowerCase().includes('image/svg') ||
				imageUrl.endsWith('.svg')

			if (isSVG) {
				console.log(
					'Skipping SVG upload (not supported by WordPress by default)'
				)
				throw new Error(
					'SVG files are not supported by this WordPress installation'
				)
			}

			console.log(`Downloading image from: ${imageUrl}`)

			const imageResponse = await fetch(imageUrl, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (compatible; WordPress Media Uploader)',
				},
			})

			if (!imageResponse.ok) {
				throw new Error(
					`Failed to fetch image: ${imageResponse.statusText}`
				)
			}

			const imageArrayBuffer = await imageResponse.arrayBuffer()
			const imageBuffer = Buffer.from(imageArrayBuffer)

			// Get content type from response headers
			let contentType =
				imageResponse.headers.get('content-type') || 'image/jpeg'

			// Handle SVG content type variations (double-check)
			if (contentType.includes('svg')) {
				throw new Error(
					'SVG content type detected - not supported by WordPress'
				)
			}

			// Generate filename if not provided
			if (!options.filename) {
				// Try to get filename from URL
				const urlPath = new URL(imageUrl).pathname
				const urlFilename = urlPath.split('/').pop()

				if (urlFilename && urlFilename.includes('.')) {
					options.filename = this.sanitizeFilename(urlFilename)
				} else {
					// Generate filename based on content type
					const extension =
						this.getFileExtensionFromContentType(contentType)
					options.filename = `url-upload-${Date.now()}.${extension}`
				}
			}

			// Add source URL to title if not provided
			if (!options.title && !options.alt_text) {
				const domain = new URL(imageUrl).hostname
				options.title = `Image from ${domain}`
			}

			console.log(
				`Uploading ${contentType} from URL: ${options.filename}`
			)

			return await this.uploadBuffer(imageBuffer, {
				...options,
				contentType,
			})
		} catch (error) {
			console.error('Upload from URL failed:', error)
			throw error
		}
	}

	// Helper method to validate if WordPress supports the image type
	async checkWordPressImageSupport(): Promise<string[]> {
		try {
			const response = await fetch(
				`${this.baseUrl}/wp-json/wp/v2/media`,
				{
					method: 'OPTIONS',
					headers: {
						Authorization: `Basic ${this.auth}`,
					},
				}
			)

			if (response.ok) {
				const options = await response.json()
				// This would contain allowed mime types if WordPress provides them
				console.log('WordPress media endpoint options:', options)
			}

			// Return our supported types as fallback
			return [
				'image/jpeg',
				'image/png',
				'image/gif',
				'image/webp',
				'image/svg+xml',
				'image/bmp',
				'image/tiff',
			]
		} catch (error) {
			console.error('Error checking WordPress image support:', error)
			return ['image/jpeg', 'image/png', 'image/gif'] // Safe defaults
		}
	}

	// Method to optimize images before upload (optional)
	async optimizeImage(
		buffer: Buffer,
		contentType: string,
		maxWidth: number = 1920,
		maxHeight: number = 1080
	): Promise<Buffer> {
		// For SVG files, return as-is since they're vector-based
		if (contentType === 'image/svg+xml') {
			return buffer
		}

		// For other formats, you could integrate with sharp or similar library
		// This is a placeholder for image optimization logic
		console.log(`Image optimization not implemented for ${contentType}`)
		return buffer
	}
}
