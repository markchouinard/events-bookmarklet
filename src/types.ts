// Types
export type NotificationType = 'info' | 'success' | 'error'

export interface EventData {
	title?: string
	description?: string
	start_time?: string
	end_time?: string
	location?: string
	source_url?: string
	tags?: string[] | string
	selectedTags?: string[] // Tags selected by user via checkboxes
	image_url?: string | null
	availableImages?: ImageInfo[] // All images found for user selection
	selectedImage?: ImageInfo | null // Image selected by user
	raw?: string
	_rawResponse?: string
	irrelevant?: boolean
	relevance_reason?: string
	relevance_score?: number
	[key: string]: any // Allow other properties
}

export interface ImageInfo {
	url: string
	alt: string
	dimensions: string
	format?: string
	score?: number
}
