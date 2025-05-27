import dotenv from 'dotenv'
import { MediaUploader } from './src/utils/MediaUploader.ts' // Add this import
import FormData from 'form-data'
import { Readable } from 'node:stream' // Fix: use node: prefix

// Load environment variables
dotenv.config()

// Environment-specific WordPress config
const WP_API_URL = process.env.WP_API_URL || 'https://sacitcentral.com/wp-json'
const WP_USERNAME = process.env.WP_USERNAME!
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD!

// Base64 encode credentials
const authString = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString(
	'base64'
)

// Create MediaUploader instance - Add this
const mediaUploader = new MediaUploader(
	WP_API_URL.replace('/wp-json', ''), // Remove /wp-json since MediaUploader adds it back
	WP_USERNAME,
	WP_APP_PASSWORD
)

// Check if API is accessible
export async function checkApiConnection() {
	try {
		const response = await fetch(`${WP_API_URL}/wp/v2/posts?per_page=1`)
		const data = await response.json()

		return {
			success: true,
			message: 'Successfully connected to WordPress API',
			data: data,
		}
	} catch (error) {
		return {
			success: false,
			message: `Failed to connect to WordPress API: ${error.message}`,
		}
	}
}

// Add this interface at the top of the file
interface WordPressEventPayload {
	title: string
	content: string
	status: string
	meta: {
		_EventStartDate: string
		_EventEndDate: string
		_EventTimezone: string
		_EventAllDay?: string
		_EventVenueID: number
		_EventURL: string
		_EventCost: string
		_EventCurrencySymbol: string
		_EventCurrencyPosition: string
		_EventShowMap: boolean
		_EventShowMapLink: boolean
		[key: string]: any // Allow additional meta fields
	}
	terms?: {
		tribe_events_cat?: number[]
		post_tag?: string[]
		[key: string]: any // Allow additional taxonomies
	}
	[key: string]: any // Allow additional fields
}

// Create an event in The Events Calendar
export async function createEvent(eventData) {
	try {
		// Format dates properly for The Events Calendar
		const startDate = new Date(eventData.start_time)
		const endDate = eventData.end_time
			? new Date(eventData.end_time)
			: new Date(startDate.getTime() + 3600000) // Default to 1 hour if no end time

		// Improved date formatting for TEC - ensure we preserve timezone info
		const formatDate = (date) => {
			// Format as YYYY-MM-DD HH:MM:SS in local timezone
			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			const hours = String(date.getHours()).padStart(2, '0')
			const minutes = String(date.getMinutes()).padStart(2, '0')
			const seconds = String(date.getSeconds()).padStart(2, '0')

			return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
		}

		console.log('Original start_time:', eventData.start_time)
		console.log('Parsed startDate:', startDate)
		console.log('Formatted start date:', formatDate(startDate))
		console.log('Formatted end date:', formatDate(endDate))

		// Enhance the description with source URL
		let enhancedDescription = eventData.description || ''

		// Add source URL at the end of description
		if (eventData.source_url) {
			const domain = getDomainFromUrl(eventData.source_url)
			enhancedDescription += `\n\n<p><strong>Original Event:</strong> <a href="${eventData.source_url}" target="_blank" rel="noopener">View on ${domain}</a></p>`
		}

		// Map event data to The Events Calendar format
		const eventPayload: WordPressEventPayload = {
			title: eventData.title,
			content: enhancedDescription,
			status: 'draft', // Start with drafts for safety

			// Event dates - using meta fields for The Events Calendar
			meta: {
				_EventStartDate: formatDate(startDate),
				_EventEndDate: formatDate(endDate),
				_EventTimezone: 'America/Los_Angeles',
				_EventAllDay: 'no', // Explicitly set to 'no' to ensure times are shown
				_EventVenueID: 0, // Will be updated if we create a venue
				_EventURL: eventData.source_url || '',
				_EventCost: 'Free', // Default, modify as needed
				_EventCurrencySymbol: '$',
				_EventCurrencyPosition: 'prefix',
				_EventShowMap: true,
				_EventShowMapLink: true,
			},
		}

		// Handle location/venue
		if (eventData.location) {
			// Either create a venue or look up an existing one
			const venueId = await getOrCreateVenue(eventData.location)
			if (venueId) {
				eventPayload.meta._EventVenueID = venueId
			}
		}

		// Handle categories and tags
		if (eventData.tags) {
			// Convert tags to an array if it's a string
			const tags = Array.isArray(eventData.tags)
				? eventData.tags
				: typeof eventData.tags === 'string'
				? eventData.tags.split(',').map((t) => t.trim())
				: []

			// Add tags to the event
			if (tags.length > 0) {
				eventPayload.terms = {
					tribe_events_cat: [], // Event categories
					post_tag: tags, // Regular tags
				}
			}
		}

		console.log(
			'Creating event in WordPress with payload:',
			JSON.stringify(eventPayload, null, 2)
		)

		// Make the API request
		const response = await fetch(`${WP_API_URL}/wp/v2/tribe_events`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${authString}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(eventPayload),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(
				`WordPress API error: ${response.status} ${
					response.statusText
				} - ${errorText.substring(0, 200)}`
			)
		}

		const result = await response.json()

		// Handle image if available
		if (eventData.image_url && result.id) {
			try {
				await setFeaturedImage(result.id, eventData.image_url)
			} catch (imageError) {
				console.error('Error setting featured image:', imageError)
				// Continue even if image upload fails
			}
		}

		return {
			success: true,
			message: 'Event created successfully',
			eventId: result.id,
			editUrl: result.link,
		}
	} catch (error) {
		console.error('Error creating WordPress event:', error)
		return {
			success: false,
			message: `Failed to create event: ${error.message}`,
		}
	}
}

// Function to create or get a venue
async function getOrCreateVenue(locationName) {
	try {
		// First, check if venue already exists with this name
		const searchResponse = await fetch(
			`${WP_API_URL}/wp/v2/tribe_venue?search=${encodeURIComponent(
				locationName
			)}`,
			{
				headers: {
					Authorization: `Basic ${authString}`,
				},
			}
		)

		if (searchResponse.ok) {
			const venues = await searchResponse.json()
			if (venues.length > 0) {
				console.log(
					`Found existing venue: ${venues[0].title.rendered} (ID: ${venues[0].id})`
				)
				return venues[0].id
			}
		}

		// If not found, create a new venue
		console.log(`Creating new venue: ${locationName}`)

		// Parse location for more details if possible
		let venueAddress = ''
		let venueCity = ''
		let venueState = ''
		let venueZip = ''
		let venueCountry = 'United States'

		// Very basic location parsing - improve this based on your location formats
		if (locationName.includes(',')) {
			const parts = locationName.split(',').map((p) => p.trim())
			if (parts.length >= 2) {
				venueAddress = parts[0]
				venueCity = parts[1]

				// Try to extract state and zip
				if (parts.length >= 3) {
					// Check for state + zip format
					const stateZipMatch = parts[2].match(/([A-Z]{2})\s+(\d{5})/)
					if (stateZipMatch) {
						venueState = stateZipMatch[1]
						venueZip = stateZipMatch[2]
					} else {
						venueState = parts[2]
					}
				}
			}
		}

		// Create venue payload
		const venuePayload = {
			title: locationName,
			status: 'publish',
			meta: {
				_VenueAddress: venueAddress,
				_VenueCity: venueCity,
				_VenueStateProvince: venueState,
				_VenueZip: venueZip,
				_VenueCountry: venueCountry,
				_VenuePhone: '',
				_VenueURL: '',
				_VenueShowMap: true,
				_VenueShowMapLink: true,
			},
		}

		const createResponse = await fetch(`${WP_API_URL}/wp/v2/tribe_venue`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${authString}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(venuePayload),
		})

		if (!createResponse.ok) {
			throw new Error(`Failed to create venue: ${createResponse.status}`)
		}

		const newVenue = await createResponse.json()
		console.log(`Created new venue with ID: ${newVenue.id}`)
		return newVenue.id
	} catch (error) {
		console.error('Error with venue:', error)
		return 0 // Return 0 to indicate no venue
	}
}

// Simple function to set a featured image from URL
async function setFeaturedImage(
	eventId: number,
	imageUrl: string
): Promise<boolean> {
	try {
		console.log(
			`Setting featured image for event ${eventId} from URL: ${imageUrl}`
		)

		// Use your MediaUploader's uploadFromUrl method
		const mediaObject = await mediaUploader.uploadFromUrl(imageUrl, {
			filename: `event-${eventId}-featured.jpg`,
			title: `Featured image for event ${eventId}`,
			alt_text: `Featured image for event ${eventId}`,
		})

		console.log('Image uploaded successfully:', mediaObject.id)

		// Set as featured image
		const updateResponse = await fetch(
			`${WP_API_URL}/wp/v2/tribe_events/${eventId}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Basic ${authString}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					featured_media: mediaObject.id,
				}),
			}
		)

		if (!updateResponse.ok) {
			throw new Error(
				`Failed to set featured image: ${updateResponse.status}`
			)
		}

		console.log('Featured image set successfully')
		return true
	} catch (error) {
		console.error('Error with featured image:', error)
		return false
	}
}

// Improved fallback method that downloads and re-uploads
async function setFeaturedImageImprovedFallback(eventId, imageUrl) {
	try {
		console.log(`Trying improved fallback for event ${eventId}`)

		// Extract clean URL from Eventbrite proxy
		let cleanImageUrl = imageUrl
		if (imageUrl.includes('img.evbuc.com/https%3A%2F%2F')) {
			try {
				const decodedUrl = decodeURIComponent(
					imageUrl.split('img.evbuc.com/')[1].split('?')[0]
				)
				console.log('Extracted clean URL:', decodedUrl)
				cleanImageUrl = decodedUrl
			} catch (e) {
				console.log('Could not extract clean URL, using original')
			}
		}

		// Method 1: Try to download and upload manually with proper headers
		console.log('Fallback: Downloading image and uploading manually')

		try {
			// Download the image
			const imageResponse = await fetch(cleanImageUrl)
			if (!imageResponse.ok) {
				throw new Error(
					`Failed to fetch image: ${imageResponse.statusText}`
				)
			}

			const imageArrayBuffer = await imageResponse.arrayBuffer()
			const imageBuffer = Buffer.from(imageArrayBuffer)
			const contentType =
				imageResponse.headers.get('content-type') || 'image/jpeg'

			// Create a simple filename
			const extension = contentType.includes('png') ? 'png' : 'jpg'
			const filename = `event-${eventId}-featured.${extension}`

			console.log(
				`Manual upload: ${filename}, ${contentType}, ${imageBuffer.length} bytes`
			)

			// Use a very simple approach - create the media entry first, then upload
			const mediaPayload = {
				title: `Featured image for event ${eventId}`,
				status: 'publish',
				alt_text: `Featured image for event ${eventId}`,
				media_type: 'image',
				mime_type: contentType,
			}

			// Create media entry without file first
			const mediaResponse = await fetch(`${WP_API_URL}/wp/v2/media`, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${authString}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(mediaPayload),
			})

			if (mediaResponse.ok) {
				const media = await mediaResponse.json()
				console.log('Created media entry:', media.id)

				// Now try to upload the actual file to the media entry
				const { default: FormDataNode } = await import('form-data')
				const formData = new FormDataNode()

				formData.append('file', imageBuffer, {
					filename: filename,
					contentType: contentType,
				})

				const uploadResponse = await fetch(
					`${WP_API_URL}/wp/v2/media/${media.id}`,
					{
						method: 'POST',
						headers: {
							Authorization: `Basic ${authString}`,
							...formData.getHeaders(),
						},
						body: formData,
					}
				)

				if (uploadResponse.ok) {
					const updatedMedia = await uploadResponse.json()
					console.log(
						'File uploaded to media entry:',
						updatedMedia.id
					)

					// Set as featured image
					const updateResponse = await fetch(
						`${WP_API_URL}/wp/v2/tribe_events/${eventId}`,
						{
							method: 'POST',
							headers: {
								Authorization: `Basic ${authString}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								featured_media: updatedMedia.id,
							}),
						}
					)

					if (updateResponse.ok) {
						console.log('Featured image set successfully')
						return updatedMedia
					} else {
						console.error('Failed to set as featured image')
					}
				} else {
					const uploadError = await uploadResponse.text()
					console.error('File upload failed:', uploadError)
				}
			} else {
				const mediaError = await mediaResponse.text()
				console.error('Media entry creation failed:', mediaError)
			}
		} catch (manualError) {
			console.error('Manual upload method failed:', manualError)
		}

		// Method 2: Try a completely different approach - save the image URL in post meta instead
		console.log(
			'Fallback: Saving image URL in post meta instead of uploading'
		)

		try {
			// Update the event with the image URL in meta fields
			const metaUpdateResponse = await fetch(
				`${WP_API_URL}/wp/v2/tribe_events/${eventId}`,
				{
					method: 'POST',
					headers: {
						Authorization: `Basic ${authString}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						meta: {
							_event_image_url: cleanImageUrl,
							_event_original_image_url: imageUrl,
						},
					}),
				}
			)

			if (metaUpdateResponse.ok) {
				console.log('Image URL saved in post meta successfully')
				return {
					id: 'meta',
					source_url: cleanImageUrl,
					note: 'Image URL saved in post meta due to upload issues',
				}
			} else {
				const metaError = await metaUpdateResponse.text()
				console.error('Meta update failed:', metaError)
			}
		} catch (metaError) {
			console.error('Meta update method failed:', metaError)
		}

		console.log('All fallback methods failed')
		return false
	} catch (error) {
		console.error('Improved fallback method failed:', error)
		return false
	}
}

// Helper function to extract domain from URL (more robust version)
function getDomainFromUrl(url) {
	try {
		if (!url || typeof url !== 'string') {
			return 'original source'
		}

		const urlObj = new URL(url)
		let domain = urlObj.hostname

		// Remove www. prefix if present
		if (domain.startsWith('www.')) {
			domain = domain.substring(4)
		}

		return domain
	} catch (e) {
		console.error('Error parsing URL:', url, e)
		return 'original source'
	}
}
