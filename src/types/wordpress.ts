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
		width: number
		height: number
		file: string
		sizes: Record<string, any>
	}
	post: number | null
	source_url: string
}

export type UploadOptions = {
	filename?: string
	title?: string
	caption?: string
	description?: string
	alt_text?: string
	contentType?: string
}

export interface EventData {
	title: string
	content: string
	excerpt?: string
	status?: 'publish' | 'draft' | 'private'
	start_date: string
	end_date: string
	all_day?: boolean
	timezone?: string
	featured?: boolean
	venue?: {
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
	organizer?: {
		organizer: string
		phone?: string
		website?: string
		email?: string
	}
	cost?: string
	cost_details?: string
	website?: string
	categories?: number[]
	tags?: number[]
	featured_media?: number
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

export interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}
