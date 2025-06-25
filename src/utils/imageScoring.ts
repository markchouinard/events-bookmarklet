import { ImageInfo } from '../extractors/types'

// Size scoring thresholds
const SIZE_THRESHOLDS = {
	EXTRA_LARGE: { min: 500000, score: 10 },
	LARGE: { min: 200000, score: 7 },
	MEDIUM: { min: 100000, score: 5 },
	SMALL: { min: 50000, score: 3 },
	TINY: { min: 0, score: 1 },
} as const

// URL pattern scoring
const URL_PATTERNS = [
	{ pattern: /\b(hero|banner|featured|main)\b/i, score: 5 },
	{ pattern: /\b(event|photo|image)\b/i, score: 3 },
	{ pattern: /\b(thumb|thumbnail|small|mini)\b/i, score: -2 },
	{ pattern: /\b(logo|icon|avatar|profile)\b/i, score: -3 },
	{ pattern: /\b(ad|advertisement|sponsor)\b/i, score: -5 },
] as const

// Format preferences
const FORMAT_SCORES = {
	jpg: 3,
	jpeg: 3,
	webp: 3,
	png: 2,
	svg: 1,
} as const

export const scoreImage = (
	imageInfo: ImageInfo & { format?: string }
): number => {
	let score = 0

	// Parse dimensions safely
	const dims = parseDimensions(imageInfo.dimensions)
	if (!dims) return 0

	const [width, height] = dims

	// Size scoring
	score += getSizeScore(width * height)

	// Aspect ratio scoring (prefer landscape for events)
	score += getAspectRatioScore(width / height)

	// Format scoring
	score += getFormatScore(imageInfo.format)

	// URL pattern scoring
	score += getUrlScore(imageInfo.url)

	// Alt text scoring
	score += getAltTextScore(imageInfo.alt)

	return Math.max(0, score)
}

// Helper functions
const parseDimensions = (dimensions: string): [number, number] | null => {
	if (dimensions === 'unknown') return null

	const parts = dimensions.split('x').map(Number)
	if (parts.length === 2 && parts.every((n) => !isNaN(n) && n > 0)) {
		return [parts[0], parts[1]]
	}
	return null
}

const getSizeScore = (area: number): number => {
	for (const threshold of Object.values(SIZE_THRESHOLDS)) {
		if (area >= threshold.min) {
			return threshold.score
		}
	}
	return 0
}

const getAspectRatioScore = (ratio: number): number => {
	// Prefer landscape orientation for event images
	if (ratio >= 1.2 && ratio <= 2.0) return 3
	if (ratio >= 1.0 && ratio <= 1.2) return 1
	return 0
}

const getFormatScore = (format?: string): number => {
	if (!format) return 0
	return (
		FORMAT_SCORES[format.toLowerCase() as keyof typeof FORMAT_SCORES] || 0
	)
}

const getUrlScore = (url: string): number => {
	const lowerUrl = url.toLowerCase()
	let urlScore = 0

	for (const { pattern, score } of URL_PATTERNS) {
		if (pattern.test(lowerUrl)) {
			urlScore += score
		}
	}

	return urlScore
}

const getAltTextScore = (alt: string): number => {
	if (!alt) return 0

	let altScore = 0

	// Length-based scoring
	if (alt.length > 10) altScore += 1
	if (alt.length > 30) altScore += 1

	// Content indicators
	if (/\b(event|conference|meeting|celebration)\b/i.test(alt)) altScore += 2
	if (/\b(logo|icon|button)\b/i.test(alt)) altScore -= 2

	return altScore
}
