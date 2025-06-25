export interface ImageInfo {
	url: string
	alt: string
	dimensions: string
	format?: string
	score?: number
}

export interface ImageExtractor {
	name: string
	extract(): Promise<ImageInfo[]>
}
