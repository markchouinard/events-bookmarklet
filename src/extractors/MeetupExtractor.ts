import { BaseImageExtractor } from './BaseImageExtractor'
import { ImageInfo } from './types'

export class MeetupExtractor extends BaseImageExtractor {
	name = 'Meetup'

	async extract(): Promise<ImageInfo[]> {
		const strategies = [
			() => this.extractFromJsonLd(),
			() => this.extractFromMetaTags(),
			() => this.extractFromSelectors(this.getMeetupSelectors()),
			() =>
				this.extractFromBackgroundImages(
					this.getMeetupBannerSelectors()
				),
		]

		return this.runStrategies(strategies)
	}

	private getMeetupSelectors(): string[] {
		return [
			'.event-info-group-photo img',
			'.eventPageHead--photo img',
			'.groupHomeHeader-banner img',
			'.event-photo img',
			'.photo-module img',
			'.eventHeaderPhoto img',
			'.event-header-image img',
			'.hero-image img',
			'.event-banner img',
		]
	}

	private getMeetupBannerSelectors(): string[] {
		return [
			'.eventPageHead',
			'.groupHome-banner',
			'.eventPageHead--photo',
			'.hero-section',
			'.banner',
		]
	}
}
