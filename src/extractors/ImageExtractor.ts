import { ImageInfo } from '../types'

// Supported image formats
const SUPPORTED_IMAGE_FORMATS = [
	'jpg',
	'jpeg',
	'png',
	'gif',
	'webp',
	'svg',
	'bmp',
	'tiff',
	'tif',
	'ico',
	'avif',
]

const VECTOR_FORMATS = ['svg']
const RASTER_FORMATS = [
	'jpg',
	'jpeg',
	'png',
	'gif',
	'webp',
	'bmp',
	'tiff',
	'tif',
	'avif',
]

// Enhanced image validation
const isValidImageUrl = (url: string): boolean => {
	if (
		!url ||
		url.trim() === '' ||
		url.startsWith('data:image/svg+xml;base64,')
	) {
		return false
	}

	// Skip common non-content images
	const skipPatterns = [
		/\/icon/i,
		/\/logo/i,
		/\/avatar/i,
		/\/profile/i,
		/\/thumb/i,
		/pixel\.gif/i,
		/spacer\./i,
		/blank\./i,
		/transparent\./i,
		/1x1\./i,
		/tracking/i,
		/analytics/i,
	]

	if (skipPatterns.some((pattern) => pattern.test(url))) {
		return false
	}

	// Check if URL has a supported image extension
	const urlWithoutQuery = url.split('?')[0].toLowerCase()
	const hasImageExtension = SUPPORTED_IMAGE_FORMATS.some((ext) =>
		urlWithoutQuery.endsWith(`.${ext}`)
	)

	// Also accept URLs that might be images but don't have extensions (like some CDN URLs)
	const mightBeImage =
		url.includes('/image/') ||
		url.includes('/img/') ||
		url.includes('/photo/') ||
		url.includes('/picture/')

	return hasImageExtension || mightBeImage
}

// Get image format from URL
const getImageFormat = (url: string): string => {
	const urlWithoutQuery = url.split('?')[0].toLowerCase()
	for (const format of SUPPORTED_IMAGE_FORMATS) {
		if (urlWithoutQuery.endsWith(`.${format}`)) {
			return format
		}
	}
	return 'unknown'
}

// Enhanced image dimension detection
const getImageDimensions = async (
	img: HTMLImageElement
): Promise<{ width: number; height: number; format: string }> => {
	return new Promise((resolve) => {
		const format = getImageFormat(img.src)

		// For SVG, we need special handling
		if (format === 'svg') {
			// Try to get SVG dimensions from the element itself
			const width = img.naturalWidth || img.width || 0
			const height = img.naturalHeight || img.height || 0

			// If no dimensions, try to fetch and parse the SVG
			if (width === 0 || height === 0) {
				fetch(img.src)
					.then((response) => response.text())
					.then((svgText) => {
						const parser = new DOMParser()
						const svgDoc = parser.parseFromString(
							svgText,
							'image/svg+xml'
						)
						const svgElement = svgDoc.querySelector('svg')

						if (svgElement) {
							const viewBox = svgElement.getAttribute('viewBox')
							const svgWidth = svgElement.getAttribute('width')
							const svgHeight = svgElement.getAttribute('height')

							if (viewBox) {
								const [, , vbWidth, vbHeight] = viewBox
									.split(' ')
									.map(Number)
								resolve({
									width: vbWidth || 300,
									height: vbHeight || 300,
									format,
								})
							} else if (svgWidth && svgHeight) {
								resolve({
									width: parseInt(svgWidth) || 300,
									height: parseInt(svgHeight) || 300,
									format,
								})
							} else {
								resolve({ width: 300, height: 300, format }) // Default SVG size
							}
						} else {
							resolve({ width: 300, height: 300, format })
						}
					})
					.catch(() => {
						resolve({ width: 300, height: 300, format })
					})
			} else {
				resolve({ width, height, format })
			}
		} else {
			// For raster images, use natural dimensions
			const width = img.naturalWidth || img.width || 0
			const height = img.naturalHeight || img.height || 0
			resolve({ width, height, format })
		}
	})
}

// Enhanced image quality scoring
const scoreImage = (imageInfo: ImageInfo & { format?: string }): number => {
	let score = 0

	// Size scoring
	const [width, height] = imageInfo.dimensions.split('x').map(Number)
	if (width && height) {
		const area = width * height
		if (area >= 500000) score += 10 // Large images
		else if (area >= 200000) score += 7
		else if (area >= 100000) score += 5
		else if (area >= 50000) score += 3
		else score += 1

		// Prefer landscape orientation for event images
		const aspectRatio = width / height
		if (aspectRatio >= 1.2 && aspectRatio <= 2.0) score += 3
	}

	// Format scoring
	if (imageInfo.format) {
		if (['jpg', 'jpeg', 'webp'].includes(imageInfo.format)) score += 3
		else if (['png'].includes(imageInfo.format)) score += 2
		else if (['svg'].includes(imageInfo.format)) score += 1 // SVG good for logos, less for photos
	}

	// URL quality indicators
	const url = imageInfo.url.toLowerCase()
	if (
		url.includes('hero') ||
		url.includes('banner') ||
		url.includes('featured')
	)
		score += 5
	if (url.includes('event') || url.includes('photo')) score += 3
	if (url.includes('thumb') || url.includes('small')) score -= 2
	if (url.includes('logo') || url.includes('icon')) score -= 3

	// Alt text quality
	if (imageInfo.alt && imageInfo.alt.length > 10) score += 2

	return score
}

export const extractImages = async (): Promise<ImageInfo[]> => {
	const images: ImageInfo[] = []

	// Special handling for Meetup
	if (window.location.href.includes('meetup.com')) {
		console.log(
			'[SacIT] Detected Meetup site, using specialized extraction'
		)

		// Method 1: JSON-LD structured data
		try {
			const jsonLdScripts = document.querySelectorAll(
				'script[type="application/ld+json"]'
			)
			for (const script of Array.from(jsonLdScripts)) {
				try {
					if (script.textContent) {
						const data = JSON.parse(script.textContent)
						if (
							data.image &&
							typeof data.image === 'string' &&
							isValidImageUrl(data.image)
						) {
							console.log(
								'[SacIT] Found image in JSON-LD:',
								data.image
							)
							images.push({
								url: data.image,
								alt: data.name || 'Event image',
								dimensions: 'unknown',
								format: getImageFormat(data.image),
							})
						}
					}
				} catch (e) {
					console.error('[SacIT] Error parsing JSON-LD:', e)
				}
			}
		} catch (e) {
			console.error('[SacIT] Error extracting from JSON-LD:', e)
		}

		// Method 2: Enhanced Meetup selectors
		const selectors = [
			'.event-info-group-photo img',
			'.eventPageHead--photo img',
			'.groupHomeHeader-banner img',
			'.event-photo img',
			'.photo-module img',
			'.eventHeaderPhoto img',
			'.event-header-image img',
			'.hero-image img',
			'.event-banner img',
			'img[style*="width: 100%"]',
			'img[width="600"]',
			'img[width="800"]',
			'img[width][height]',
		]

		for (const selector of selectors) {
			const elements = document.querySelectorAll(selector)
			console.log(
				`[SacIT] Selector "${selector}" found ${elements.length} elements`
			)

			for (const el of Array.from(elements)) {
				if (el instanceof HTMLImageElement && isValidImageUrl(el.src)) {
					try {
						const { width, height, format } =
							await getImageDimensions(el)

						// Enhanced filtering for SVG and other formats
						if (format === 'svg') {
							// For SVG, be more lenient with size requirements
							if (width >= 50 && height >= 50) {
								console.log(
									`[SacIT] Found SVG image: ${el.src} (${width}x${height})`
								)
								images.push({
									url: el.src,
									alt: el.alt || 'SVG image',
									dimensions: `${width}x${height}`,
									format: format,
								})
							}
						} else {
							// For raster images, maintain size requirements
							if (width >= 100 && height >= 100) {
								console.log(
									`[SacIT] Found image: ${el.src} (${width}x${height}) format: ${format}`
								)
								images.push({
									url: el.src,
									alt: el.alt || 'Event image',
									dimensions: `${width}x${height}`,
									format: format,
								})
							}
						}
					} catch (error) {
						console.error(
							'[SacIT] Error getting image dimensions:',
							error
						)
					}
				}
			}
		}

		// Method 3: Open Graph and Twitter meta tags
		const metaSelectors = [
			'meta[property="og:image"]',
			'meta[property="og:image:url"]',
			'meta[name="twitter:image"]',
			'meta[name="twitter:image:src"]',
		]

		for (const selector of metaSelectors) {
			const metaTag = document.querySelector(selector)
			if (metaTag) {
				const imageUrl = metaTag.getAttribute('content')
				if (imageUrl && isValidImageUrl(imageUrl)) {
					console.log(
						`[SacIT] Found meta image (${selector}):`,
						imageUrl
					)
					images.push({
						url: imageUrl,
						alt: 'Meta tag image',
						dimensions: 'unknown',
						format: getImageFormat(imageUrl),
					})
				}
			}
		}

		// Method 4: Background images with SVG support
		const possibleBanners = document.querySelectorAll(
			'.eventPageHead, .groupHome-banner, .eventPageHead--photo, .hero-section, .banner'
		)

		for (const el of Array.from(possibleBanners)) {
			const style = window.getComputedStyle(el)
			const bgImage = style.backgroundImage
			if (bgImage && bgImage !== 'none') {
				const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/)
				if (match && match[1] && isValidImageUrl(match[1])) {
					console.log('[SacIT] Found background image:', match[1])
					images.push({
						url: match[1],
						alt: 'Background image',
						dimensions: `${el.clientWidth}x${el.clientHeight}`,
						format: getImageFormat(match[1]),
					})
				}
			}
		}

		if (window.location.hostname.includes('meetup.com')) {
			debugMeetupImages()
		}
	} else {
		// Enhanced standard image extraction
		const imgTags = document.querySelectorAll('img')

		for (const img of Array.from(imgTags)) {
			if (isValidImageUrl(img.src)) {
				try {
					const { width, height, format } = await getImageDimensions(
						img
					)

					// Different size requirements based on format
					const minSize = format === 'svg' ? 50 : 100

					if (width >= minSize && height >= minSize) {
						images.push({
							url: img.src,
							alt: img.alt || '',
							dimensions: `${width}x${height}`,
							format: format,
						})
					}
				} catch (error) {
					console.error('[SacIT] Error processing image:', error)
				}
			}
		}

		// Check meta tags for all sites
		const metaSelectors = [
			'meta[property="og:image"]',
			'meta[property="og:image:url"]',
			'meta[name="twitter:image"]',
			'meta[name="twitter:image:src"]',
		]

		for (const selector of metaSelectors) {
			const metaTag = document.querySelector(selector)
			if (metaTag) {
				const imageUrl = metaTag.getAttribute('content')
				if (imageUrl && isValidImageUrl(imageUrl)) {
					images.push({
						url: imageUrl,
						alt: 'Social media image',
						dimensions: 'unknown',
						format: getImageFormat(imageUrl),
					})
				}
			}
		}
	}

	// Remove duplicates and sort by quality
	const uniqueImages = images.filter(
		(img, index, self) => index === self.findIndex((i) => i.url === img.url)
	)

	// Score and sort images
	const scoredImages = uniqueImages
		.map((img) => ({
			...img,
			score: scoreImage(img),
		}))
		.sort((a, b) => b.score - a.score)

	console.log('[SacIT] All extracted images with scores:', scoredImages)

	return scoredImages.slice(0, 10) // Return top 10 images
}

// Enhanced debug function
const debugMeetupImages = () => {
	console.log('[SacIT] DEBUG: Analyzing Meetup page structure')

	// Print all meta tags
	const metaTags = document.querySelectorAll('meta')
	console.log(`[SacIT] Found ${metaTags.length} meta tags`)
	Array.from(metaTags).forEach((meta) => {
		if (
			meta.getAttribute('property')?.includes('image') ||
			meta.getAttribute('name')?.includes('image')
		) {
			console.log('Meta image tag:', meta.outerHTML)
		}
	})

	// Print all image elements with format info
	const allImages = document.querySelectorAll('img')
	console.log(`[SacIT] Found ${allImages.length} img elements`)
	Array.from(allImages).forEach((img) => {
		if (img.src && img.width > 50 && img.height > 50) {
			const format = getImageFormat(img.src)
			console.log(
				`Image: ${img.src} (${img.width}x${img.height}) format: ${format} alt="${img.alt}"`
			)
		}
	})

	// Check for JSON-LD
	const jsonLdElements = document.querySelectorAll(
		'script[type="application/ld+json"]'
	)
	console.log(`[SacIT] Found ${jsonLdElements.length} JSON-LD elements`)

	// Check for background images
	const elementsWithBg = document.querySelectorAll('*')
	let bgImageCount = 0
	Array.from(elementsWithBg).forEach((el) => {
		const style = window.getComputedStyle(el)
		if (style.backgroundImage && style.backgroundImage !== 'none') {
			bgImageCount++
			if (bgImageCount <= 5) {
				// Log first 5
				console.log('Background image found:', style.backgroundImage)
			}
		}
	})
	console.log(`[SacIT] Found ${bgImageCount} elements with background images`)
}
