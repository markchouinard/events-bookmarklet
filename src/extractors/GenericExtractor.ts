import { BaseImageExtractor } from './BaseImageExtractor'
import { ImageInfo } from './types'
import { isValidImageUrl, getImageDimensions } from '../utils/imageUtils'

export class GenericExtractor extends BaseImageExtractor {
	name = 'Generic'

	async extract(): Promise<ImageInfo[]> {
		const strategies = [
			() => this.extractFromMetaTags(),
			() => this.extractGenericImages(),
		]

		return this.runStrategies(strategies)
	}

	private async extractGenericImages(): Promise<ImageInfo[]> {
		const images: ImageInfo[] = []
		const imgTags = document.querySelectorAll('img')

		for (const img of imgTags) {
			if (!isValidImageUrl(img.src)) continue

			try {
				const { width, height, format } = await getImageDimensions(img)
				const minSize = format === 'svg' ? 50 : 100

				if (width >= minSize && height >= minSize) {
					images.push({
						url: img.src,
						alt: img.alt || '',
						dimensions: `${width}x${height}`,
						format,
					})
				}
			} catch (error) {
				console.warn('[Generic] Error processing image:', error)
			}
		}

		return images
	}
}
