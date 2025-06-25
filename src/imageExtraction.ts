import { ImageInfo } from './extractors/types'
import {
	MeetupExtractor,
	EventbriteExtractor,
	GenericExtractor,
} from './extractors'
import { scoreImage } from './utils/imageScoring'

export const extractImages = async (): Promise<ImageInfo[]> => {
	// Extractor factory
	const getExtractor = () => {
		const url = window.location.href.toLowerCase()

		if (url.includes('meetup.com')) return new MeetupExtractor()
		if (url.includes('eventbrite.com')) return new EventbriteExtractor()
		return new GenericExtractor()
	}

	// Extract images using appropriate strategy
	const extractor = getExtractor()
	console.log(`[SacIT] Using ${extractor.name} extractor`)

	const images = await extractor.extract()

	// Post-process: dedupe, score, and sort
	const uniqueImages = deduplicateImages(images)
	const scoredImages = scoreAndSortImages(uniqueImages)

	console.log('[SacIT] Final extracted images:', scoredImages)
	return scoredImages.slice(0, 10)
}

const deduplicateImages = (images: ImageInfo[]): ImageInfo[] => {
	return images.filter(
		(img, index, self) => index === self.findIndex((i) => i.url === img.url)
	)
}

const scoreAndSortImages = (images: ImageInfo[]): ImageInfo[] => {
	return images
		.map((img) => ({ ...img, score: scoreImage(img) }))
		.sort((a, b) => b.score - a.score)
}
