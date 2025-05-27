export interface UploadOptions {
	filename?: string
	title?: string
	caption?: string
	description?: string
	alt_text?: string
	contentType?: string
}

export interface WordPressMediaObject {
	id: number
	date: string
	date_gmt: string
	guid: {
		rendered: string
	}
	modified: string
	modified_gmt: string
	slug: string
	status: string
	type: string
	link: string
	title: {
		rendered: string
	}
	author: number
	comment_status: string
	ping_status: string
	template: string
	meta: any[]
	description: {
		rendered: string
	}
	caption: {
		rendered: string
	}
	alt_text: string
	media_type: string
	mime_type: string
	media_details: {
		width?: number
		height?: number
		file: string
		sizes?: {
			[key: string]: {
				file: string
				width: number
				height: number
				mime_type: string
				source_url: string
			}
		}
		image_meta?: any
	}
	source_url: string
}

export interface EventData {
	title: string
	content: string
	excerpt?: string
	status?: 'publish' | 'draft' | 'private'

	// Date/Time fields - use these instead of meta fields
	start_date: string // Instead of _EventStartDate
	end_date: string // Instead of _EventEndDate
	timezone?: string // Instead of _EventTimezone
	all_day?: boolean // Instead of _EventAllDay

	// Venue - can be ID or object
	venue?:
		| number
		| {
				venue: string
				address?: string
				city?: string
				state?: string
				province?: string
				zip?: string
				country?: string
				phone?: string
				website?: string
		  }

	// Organizer - can be ID or object
	organizer?:
		| number
		| {
				organizer: string
				phone?: string
				website?: string
				email?: string
		  }

	// Other event fields
	url?: string // Instead of _EventURL
	cost?: string // Instead of _EventCost
	cost_details?: string
	currency_symbol?: string // Instead of _EventCurrencySymbol
	currency_position?: 'prefix' | 'suffix' // Instead of _EventCurrencyPosition

	// Display options
	show_map?: boolean // Instead of _EventShowMap
	show_map_link?: boolean // Instead of _EventShowMapLink
	featured?: boolean

	// Taxonomy
	categories?: number[] // tribe_events_cat IDs
	tags?: string[] | number[] // Can be tag names or IDs

	// Media
	featured_media?: number
	image_url?: string
	irrelevant?: boolean
	relevance_reason?: string
	_rawResponse?: string
}

export interface WordPressEvent {
	id: number
	title: {
		rendered: string
	}
	content: {
		rendered: string
	}
	start_date: string
	end_date: string
	featured_media: number
	link: string
	status: string
}

export interface ApiResponse<T = any> {
	success: boolean
	data?: T
	error?: string
	message?: string
	eventId?: number
	editUrl?: string
}
