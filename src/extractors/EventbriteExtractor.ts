import { BaseImageExtractor } from './BaseImageExtractor'
import { ImageInfo } from './types'

export class EventbriteExtractor extends BaseImageExtractor {
	name = 'Eventbrite'

	async extract(): Promise<ImageInfo[]> {
		const strategies = [
			() => this.extractFromJsonLd(),
			() => this.extractFromMetaTags(),
			() => this.extractFromSelectors(this.getEventbriteSelectors()),
			() =>
				this.extractFromBackgroundImages(
					this.getEventbriteBannerSelectors()
				),
		]

		return this.runStrategies(strategies)
	}

	private getEventbriteSelectors(): string[] {
		return [
			'img[data-testid="hero-img"]',
			'picture[data-testid="hero-image"] img',
			'.event-hero img',
			'.css-1mghjxa',
			'.event-hero__image img',
			'.event-card-image img',
			'.structured-content-rich-text img',
		]
	}

	private getEventbriteBannerSelectors(): string[] {
		return [
			'.event-hero',
			'.event-hero__background',
			'.hero-image',
			'.event-card',
		]
	}
}
