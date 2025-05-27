import { MediaUploader } from '../MediaUploader'
import fetch from 'node-fetch'

const uploader = new MediaUploader(
	'https://yoursite.com',
	'username',
	'password'
)

// Example 1: Process and upload image from API
async function uploadProcessedImage() {
	// Get image from external API
	const response = await fetch('https://api.example.com/generate-image')
	const imageBuffer = await response.buffer()

	// Upload directly without saving to disk
	const media = await uploader.uploadBuffer(imageBuffer, {
		filename: 'generated-image.png',
		title: 'AI Generated Image',
		alt_text: 'Generated artwork',
		contentType: 'image/png',
	})

	return media
}

// Example 2: Upload from base64 (common in web apps)
async function uploadFromFrontend(base64Data: string) {
	const media = await uploader.uploadFromBase64(base64Data, {
		filename: 'user-upload.jpg',
		title: 'User Uploaded Image',
		alt_text: 'User content',
	})

	return media
}

// Example 3: Process multiple images in memory
async function uploadImageVariants(originalBuffer: Buffer) {
	// Simulate image processing (you'd use sharp, jimp, etc.)
	const thumbnailBuffer = await createThumbnail(originalBuffer)
	const watermarkedBuffer = await addWatermark(originalBuffer)

	const [original, thumbnail, watermarked] = await Promise.all([
		uploader.uploadBuffer(originalBuffer, {
			filename: 'original.jpg',
			title: 'Original Image',
		}),
		uploader.uploadBuffer(thumbnailBuffer, {
			filename: 'thumbnail.jpg',
			title: 'Thumbnail',
		}),
		uploader.uploadBuffer(watermarkedBuffer, {
			filename: 'watermarked.jpg',
			title: 'Watermarked Image',
		}),
	])

	return { original, thumbnail, watermarked }
}

// Mock functions for example
async function createThumbnail(buffer: Buffer): Promise<Buffer> {
	// Use sharp, jimp, or other image processing library
	return buffer // placeholder
}

async function addWatermark(buffer: Buffer): Promise<Buffer> {
	// Add watermark processing
	return buffer // placeholder
}
