import sharp from 'sharp'
import { MediaUploader } from './MediaUploader'

class ImageProcessor {
	private uploader: MediaUploader

	constructor(baseUrl: string, username: string, password: string) {
		this.uploader = new MediaUploader(baseUrl, username, password)
	}

	async uploadResizedImage(
		inputPath: string,
		width: number,
		height: number,
		options: { filename: string; title?: string; alt_text?: string }
	) {
		try {
			// Process image in memory
			const processedBuffer = await sharp(inputPath)
				.resize(width, height, { fit: 'cover' })
				.jpeg({ quality: 85 })
				.toBuffer()

			// Upload processed buffer
			return await this.uploader.uploadBuffer(processedBuffer, {
				...options,
				contentType: 'image/jpeg',
			})
		} catch (error) {
			console.error('Error processing and uploading image:', error)
			throw error
		}
	}

	async uploadMultipleSizes(inputPath: string, baseName: string) {
		const sizes = [
			{ width: 150, height: 150, suffix: 'thumbnail' },
			{ width: 300, height: 300, suffix: 'medium' },
			{ width: 800, height: 600, suffix: 'large' },
		]

		const uploads = sizes.map(async (size) => {
			const buffer = await sharp(inputPath)
				.resize(size.width, size.height, { fit: 'cover' })
				.jpeg({ quality: 85 })
				.toBuffer()

			return this.uploader.uploadBuffer(buffer, {
				filename: `${baseName}-${size.suffix}.jpg`,
				title: `${baseName} (${size.suffix})`,
				contentType: 'image/jpeg',
			})
		})

		return Promise.all(uploads)
	}
}
