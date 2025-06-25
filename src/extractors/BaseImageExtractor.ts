import { ImageExtractor, ImageInfo } from './types'
import {
	isValidImageUrl,
	getImageFormat,
	getImageDimensions,
} from '../utils/imageUtils'

export abstract class BaseImageExtractor implements ImageExtractor {
	abstract name: string

	protected async extractFromJsonLd(): Promise<ImageInfo[]> {
		const images: ImageInfo[] = []
		const scripts = document.querySelectorAll(
			'script[type="application/ld+json"]'
		)

		for (const script of scripts) {
			try {
				if (!script.textContent) continue

				const data = JSON.parse(script.textContent)
				const imageUrl = this.getImageFromStructuredData(data)

				if (imageUrl) {
					images.push({
						url: imageUrl,
						alt: data.name || 'Structured data image',
						dimensions: 'unknown',
						format: getImageFormat(imageUrl),
					})
				}
			} catch (error) {
				console.warn(`[${this.name}] JSON-LD parsing error:`, error)
			}
		}

		return images
	}

	protected async extractFromMetaTags(): Promise<ImageInfo[]> {
		const metaSelectors = [
			'meta[property="og:image"]',
			'meta[property="og:image:url"]',
			'meta[name="twitter:image"]',
			'meta[name="twitter:image:src"]',
		]

		return metaSelectors
			.map((selector) => document.querySelector(selector))
			.filter(Boolean)
			.map((meta) => meta!.getAttribute('content'))
			.filter((url) => url && isValidImageUrl(url))
			.map((url) => ({
				url: url!,
				alt: 'Social media image',
				dimensions: 'unknown',
				format: getImageFormat(url!),
			}))
	}

	protected async extractFromSelectors(
		selectors: string[]
	): Promise<ImageInfo[]> {
		const images: ImageInfo[] = []

		for (const selector of selectors) {
			const elements = document.querySelectorAll(selector)
			console.log(
				`[${this.name}] "${selector}" found ${elements.length} elements`
			)

			for (const el of elements) {
				if (
					!(el instanceof HTMLImageElement) ||
					!isValidImageUrl(el.src)
				)
					continue

				try {
					const { width, height, format } = await getImageDimensions(
						el
					)
					const minSize = format === 'svg' ? 50 : 100

					if (width >= minSize && height >= minSize) {
						images.push({
							url: el.src,
							alt: el.alt || 'Image',
							dimensions: `${width}x${height}`,
							format,
						})
					}
				} catch (error) {
					console.warn(
						`[${this.name}] Error processing image:`,
						error
					)
				}
			}
		}

		return images
	}

	protected async extractFromBackgroundImages(
		selectors: string[]
	): Promise<ImageInfo[]> {
		const images: ImageInfo[] = []

		for (const selector of selectors) {
			const elements = document.querySelectorAll(selector)

			for (const el of elements) {
				const style = window.getComputedStyle(el)
				const bgImage = style.backgroundImage

				if (bgImage === 'none') continue

				const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/)
				if (match?.[1] && isValidImageUrl(match[1])) {
					images.push({
						url: match[1],
						alt: 'Background image',
						dimensions: `${el.clientWidth}x${el.clientHeight}`,
						format: getImageFormat(match[1]),
					})
				}
			}
		}

		return images
	}

	protected async runStrategies(
		strategies: (() => Promise<ImageInfo[]>)[]
	): Promise<ImageInfo[]> {
		const allImages: ImageInfo[] = []

		for (const strategy of strategies) {
			try {
				const images = await strategy()
				allImages.push(...images)
			} catch (error) {
				console.warn(`[${this.name}] Strategy failed:`, error)
			}
		}

		return allImages
	}

	private getImageFromStructuredData(data: any): string | null {
		if (typeof data.image === 'string' && isValidImageUrl(data.image)) {
			return data.image
		}
		if (data.image?.url && isValidImageUrl(data.image.url)) {
			return data.image.url
		}
		return null
	}

	abstract extract(): Promise<ImageInfo[]>
}
