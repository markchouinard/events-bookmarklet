import { ImageInfo } from '../types'

export const extractImages = (): ImageInfo[] => {
	const images: ImageInfo[] = []

	// Special handling for Meetup
	if (window.location.href.includes('meetup.com')) {
		console.log(
			'[SacIT] Detected Meetup site, using specialized extraction'
		)

		// Method 1: Try to find structured data (most reliable)
		try {
			// Look for JSON-LD structured data which often contains the image
			const jsonLdScripts = document.querySelectorAll(
				'script[type="application/ld+json"]'
			)
			Array.from(jsonLdScripts).forEach((script) => {
				try {
					if (script.textContent) {
						const data = JSON.parse(script.textContent)
						if (data.image && typeof data.image === 'string') {
							console.log(
								'[SacIT] Found image in JSON-LD:',
								data.image
							)
							images.push({
								url: data.image,
								alt: data.name || 'Event image',
								dimensions: 'unknown',
							})
						}
					}
				} catch (e) {
					console.error('[SacIT] Error parsing JSON-LD:', e)
				}
			})
		} catch (e) {
			console.error('[SacIT] Error extracting from JSON-LD:', e)
		}

		// Method 2: Try various Meetup selectors
		const selectors = [
			// Newer Meetup design
			'.event-info-group-photo img',
			'.eventPageHead--photo img',
			'.groupHomeHeader-banner img',
			'.event-photo img',
			'.photo-module img',
			'.eventHeaderPhoto img',
			'.event-header-image img',
			// General large images
			'img[style*="width: 100%"]',
			'img[width="600"]',
			'img[width="800"]',
			// Fallback to any large image
			'img[width][height]',
		]

		for (const selector of selectors) {
			const elements = document.querySelectorAll(selector)
			console.log(
				`[SacIT] Selector "${selector}" found ${elements.length} elements`
			)

			Array.from(elements).forEach((el) => {
				if (
					el instanceof HTMLImageElement &&
					el.src &&
					!el.src.includes('icon') &&
					!el.src.includes('logo')
				) {
					const width = el.naturalWidth || el.width
					const height = el.naturalHeight || el.height

					// Skip tiny images
					if (width && height && (width < 100 || height < 100)) return

					console.log(
						`[SacIT] Found potential Meetup image: ${el.src} (${width}x${height})`
					)
					images.push({
						url: el.src,
						alt: el.alt || 'Meetup event image',
						dimensions: `${width}x${height}`,
					})
				}
			})
		}

		// Method 3: Look for Open Graph meta tags
		const ogImage = document.querySelector('meta[property="og:image"]')
		if (ogImage && ogImage.getAttribute('content')) {
			const imageUrl = ogImage.getAttribute('content')
			if (imageUrl) {
				console.log('[SacIT] Found Open Graph image:', imageUrl)
				images.push({
					url: imageUrl,
					alt: 'Open Graph image',
					dimensions: 'unknown',
				})
			}
		}

		// Method 4: Check for background images
		const possibleBanners = document.querySelectorAll(
			'.eventPageHead, .groupHome-banner, .eventPageHead--photo'
		)
		Array.from(possibleBanners).forEach((el) => {
			const style = window.getComputedStyle(el)
			const bgImage = style.backgroundImage
			if (bgImage && bgImage !== 'none') {
				const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/)
				if (match && match[1]) {
					console.log('[SacIT] Found background image:', match[1])
					images.push({
						url: match[1],
						alt: 'Background image',
						dimensions: `${el.clientWidth}x${el.clientHeight}`,
					})
				}
			}
		})

		// Method 5: Get the group logo as fallback
		const groupLogo = document.querySelector(
			'.groupHomeHeader-groupLogo img, .organizerAvatar img, .avatar--org img'
		)
		if (groupLogo instanceof HTMLImageElement && groupLogo.src) {
			console.log('[SacIT] Found Meetup group logo:', groupLogo.src)
			images.push({
				url: groupLogo.src,
				alt: 'Meetup group logo',
				dimensions: 'unknown',
			})
		}

		// Debug Meetup images
		if (window.location.hostname.includes('meetup.com')) {
			debugMeetupImages()
		}
	} else {
		// Standard image extraction for non-Meetup sites
		const imgTags = document.querySelectorAll('img')
		Array.from(imgTags).forEach((img) => {
			if (
				!img.src ||
				img.src.trim() === '' ||
				img.src.startsWith('data:')
			)
				return

			const width = img.naturalWidth || img.width
			const height = img.naturalHeight || img.height

			// Skip very small images
			if (width < 100 || height < 100) return

			images.push({
				url: img.src,
				alt: img.alt || '',
				dimensions: `${width}x${height}`,
			})
		})

		// Also check for Open Graph image (commonly used for sharing)
		const ogImage = document.querySelector('meta[property="og:image"]')
		if (ogImage && ogImage.getAttribute('content')) {
			const imageUrl = ogImage.getAttribute('content')
			if (imageUrl) {
				images.push({
					url: imageUrl,
					alt: 'Open Graph image',
					dimensions: 'unknown',
				})
			}
		}
	}

	// Debug output all found images
	console.log('[SacIT] All extracted images:', images)

	return images.filter((img) => img.url !== null).slice(0, 10) // Limit to 10 images
}

// Debug images for Meetup
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

	// Print all image elements
	const allImages = document.querySelectorAll('img')
	console.log(`[SacIT] Found ${allImages.length} img elements`)
	Array.from(allImages).forEach((img) => {
		if (img.src && img.width > 100 && img.height > 100) {
			console.log(
				`Image: ${img.src} (${img.width}x${img.height}) alt="${img.alt}"`
			)
		}
	})

	// Check for JSON-LD
	const jsonLdElements = document.querySelectorAll(
		'script[type="application/ld+json"]'
	)
	console.log(`[SacIT] Found ${jsonLdElements.length} JSON-LD elements`)
}
