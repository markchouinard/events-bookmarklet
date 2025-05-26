import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Environment-specific WordPress config
const WP_API_URL = process.env.WP_API_URL || 'https://sacitcentral.com/wp-json'
const WP_USERNAME = process.env.WP_USERNAME
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD

// Base64 encode credentials
const authString = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString(
	'base64'
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

// Create an event in The Events Calendar
export async function createEvent(eventData) {
	try {
		// Format dates properly for The Events Calendar
		const startDate = new Date(eventData.start_time)
		const endDate = eventData.end_time
			? new Date(eventData.end_time)
			: new Date(startDate.getTime() + 3600000) // Default to 1 hour if no end time

		// Format for TEC API: YYYY-MM-DD HH:MM:SS
		const formatDate = (date) => {
			return date.toISOString().replace('T', ' ').substring(0, 19)
		}

		// Map event data to The Events Calendar format
		const eventPayload = {
			title: eventData.title,
			content: eventData.description,
			status: 'draft', // Start with drafts for safety

			// Event dates - using meta fields for The Events Calendar
			meta: {
				_EventStartDate: formatDate(startDate),
				_EventEndDate: formatDate(endDate),
				_EventTimezone: 'America/Los_Angeles',
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
async function setFeaturedImage(eventId, imageUrl) {
	try {
		console.log(
			`Setting featured image for event ${eventId} from URL: ${imageUrl}`
		)

		// First, create the media item
		const mediaPayload = {
			title: `Featured image for event ${eventId}`,
			status: 'publish',
			media_type: 'image',
			source_url: imageUrl,
		}

		// Create a new media item
		const mediaResponse = await fetch(`${WP_API_URL}/wp/v2/media`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${authString}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(mediaPayload),
		})

		if (!mediaResponse.ok) {
			throw new Error(`Failed to create media: ${mediaResponse.status}`)
		}

		const media = await mediaResponse.json()

		// Now attach the media to the event
		const updateResponse = await fetch(
			`${WP_API_URL}/wp/v2/tribe_events/${eventId}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Basic ${authString}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					featured_media: media.id,
				}),
			}
		)

		if (!updateResponse.ok) {
			throw new Error(
				`Failed to attach media to event: ${updateResponse.status}`
			)
		}

		return true
	} catch (error) {
		console.error('Error with featured image:', error)
		return false
	}
}
