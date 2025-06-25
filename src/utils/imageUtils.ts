/**
 * Validates if a URL points to a valid image
 */
export const isValidImageUrl = (url: string): boolean => {
	if (!url || typeof url !== 'string') return false

	try {
		const parsedUrl = new URL(url, window.location.href)

		// Check for valid image extensions
		const imageExtensions =
			/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)(\?|$)/i
		if (imageExtensions.test(parsedUrl.pathname)) return true

		// Check for data URLs
		if (url.startsWith('data:image/')) return true

		// Check for common image hosting patterns
		const imageHostPatterns = [
			/images?\./i,
			/img\./i,
			/cdn\./i,
			/static\./i,
			/photos?\./i,
			/media\./i,
		]

		return imageHostPatterns.some((pattern) =>
			pattern.test(parsedUrl.hostname)
		)
	} catch {
		return false
	}
}

/**
 * Extracts image format from URL
 */
export const getImageFormat = (url: string): string | undefined => {
	if (!url) return undefined

	try {
		// Handle data URLs
		if (url.startsWith('data:image/')) {
			const match = url.match(/data:image\/([^;]+)/)
			return match?.[1]?.toLowerCase()
		}

		// Extract from file extension
		const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i)
		return match?.[1]?.toLowerCase()
	} catch {
		return undefined
	}
}

/**
 * Gets image dimensions and format from an image element or URL
 */
export const getImageDimensions = async (
	imageElement: HTMLImageElement
): Promise<{ width: number; height: number; format?: string }> => {
	return new Promise((resolve, reject) => {
		// If image is already loaded and has dimensions
		if (imageElement.complete && imageElement.naturalWidth > 0) {
			resolve({
				width: imageElement.naturalWidth,
				height: imageElement.naturalHeight,
				format: getImageFormat(imageElement.src),
			})
			return
		}

		// Create a new image to load and measure
		const img = new Image()

		img.onload = () => {
			resolve({
				width: img.naturalWidth,
				height: img.naturalHeight,
				format: getImageFormat(img.src),
			})
		}

		img.onerror = () => {
			reject(new Error(`Failed to load image: ${imageElement.src}`))
		}

		// Set a timeout to avoid hanging
		setTimeout(() => {
			reject(new Error(`Image load timeout: ${imageElement.src}`))
		}, 5000)

		// Start loading
		img.src = imageElement.src
	})
}

/**
 * Gets image dimensions from URL (creates temporary image element)
 */
export const getImageDimensionsFromUrl = async (
	url: string
): Promise<{ width: number; height: number; format?: string }> => {
	return new Promise((resolve, reject) => {
		const img = new Image()

		img.onload = () => {
			resolve({
				width: img.naturalWidth,
				height: img.naturalHeight,
				format: getImageFormat(url),
			})
		}

		img.onerror = () => {
			reject(new Error(`Failed to load image: ${url}`))
		}

		// Set a timeout to avoid hanging
		setTimeout(() => {
			reject(new Error(`Image load timeout: ${url}`))
		}, 5000)

		// Handle CORS issues
		img.crossOrigin = 'anonymous'
		img.src = url
	})
}

/**
 * Checks if an image URL is accessible (HEAD request)
 */
export const isImageAccessible = async (url: string): Promise<boolean> => {
	try {
		const response = await fetch(url, {
			method: 'HEAD',
			mode: 'no-cors', // Avoid CORS issues for basic accessibility check
		})
		return response.ok
	} catch {
		return false
	}
}

/**
 * Gets file size of an image (if accessible)
 */
export const getImageFileSize = async (url: string): Promise<number | null> => {
	try {
		const response = await fetch(url, { method: 'HEAD' })
		const contentLength = response.headers.get('content-length')
		return contentLength ? parseInt(contentLength, 10) : null
	} catch {
		return null
	}
}

/**
 * Checks if image is likely a tracking pixel or tiny image
 */
export const isTrackingPixel = (width: number, height: number): boolean => {
	return (width <= 1 && height <= 1) || width * height <= 100
}

/**
 * Common image validation combining multiple checks
 */
export const validateImage = async (
	url: string,
	minWidth = 100,
	minHeight = 100
): Promise<{
	valid: boolean
	reason?: string
	dimensions?: { width: number; height: number }
}> => {
	try {
		// Basic URL validation
		if (!isValidImageUrl(url)) {
			return { valid: false, reason: 'Invalid image URL' }
		}

		// Get dimensions
		const dimensions = await getImageDimensionsFromUrl(url)

		// Size validation
		if (dimensions.width < minWidth || dimensions.height < minHeight) {
			return {
				valid: false,
				reason: `Image too small: ${dimensions.width}x${dimensions.height}`,
				dimensions,
			}
		}

		// Tracking pixel check
		if (isTrackingPixel(dimensions.width, dimensions.height)) {
			return {
				valid: false,
				reason: 'Likely tracking pixel',
				dimensions,
			}
		}

		return { valid: true, dimensions }
	} catch (error) {
		return {
			valid: false,
			reason: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}
