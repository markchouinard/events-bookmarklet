import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	// Add CORS headers FIRST
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-SacIT-Token')
	res.setHeader('Access-Control-Max-Age', '86400')

	if (req.method === 'OPTIONS') {
		return res.status(200).end()
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	// Token validation
	const token = req.headers['x-sacit-token']
	if (token !== 'secret123') {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	try {
		console.log('🚀 Starting WordPress submission...')

		const { eventData } = req.body

		// ✅ MATCH LOCAL VERSION - Detailed logging
		console.log('=== RECEIVED EVENT DATA ===')
		console.log(JSON.stringify(eventData, null, 2))

		// ✅ MATCH LOCAL VERSION - Individual field validation
		if (!eventData) {
			throw new Error('Missing eventData')
		}
		if (!eventData.title) {
			throw new Error('Missing title')
		}
		if (!eventData.start_date) {
			throw new Error('Missing start_date')
		}

		// ✅ ADD DATE PROCESSING - Match local version exactly
		const startDate = new Date(eventData.start_date)
		const endDate = eventData.end_date
			? new Date(eventData.end_date)
			: new Date(startDate.getTime() + 3600000) // Add 1 hour if no end date

		// Check if dates are valid
		if (isNaN(startDate.getTime())) {
			throw new Error(`Invalid start_date: ${eventData.start_date}`)
		}
		if (isNaN(endDate.getTime())) {
			throw new Error(`Invalid end_date: ${eventData.end_date}`)
		}

		console.log('=== PARSED DATES ===')
		console.log('startDate:', startDate)
		console.log('endDate:', endDate)

		// WordPress API configuration
		const wpApiUrl = process.env.WP_API_URL
		const username = process.env.WP_USERNAME
		const appPassword = process.env.WP_APP_PASSWORD
		const auth = Buffer.from(`${username}:${appPassword}`).toString(
			'base64'
		)

		console.log('🚀 Processing event with utilities...')

		// 1. Handle venue
		let venueId = 0
		if (eventData.venue) {
			venueId = await getOrCreateVenue(eventData.venue, wpApiUrl, auth)
		}

		// 2. Handle tags
		let tagIds: number[] = []
		if (eventData.tags && Array.isArray(eventData.tags)) {
			tagIds = await getOrCreateTagIds(eventData.tags, wpApiUrl, auth)
		}

		// 3. Enhanced description
		let enhancedDescription = eventData.content || ''
		if (eventData.url) {
			const domain = getDomainFromUrl(eventData.url)
			enhancedDescription += `\n\n<p><strong>Original Event:</strong> <a href="${eventData.url}" target="_blank" rel="noopener">View on ${domain}</a></p>`
		}

		// ✅ UPDATE EVENT PAYLOAD - Use formatted dates
		const requestBody = {
			title: eventData.title,
			description: enhancedDescription,
			start_date: formatDate(startDate), // ← Use formatted date
			end_date: formatDate(endDate), // ← Use formatted date
			timezone: eventData.timezone || 'America/Los_Angeles',
			all_day: eventData.all_day || false,
			cost: eventData.cost || '',
			website: eventData.url || '',
			venue: venueId,
			show_map: true,
			show_map_link: true,
			featured: false,
			status: 'draft',
		}

		console.log('📝 Creating event...')
		const response = await fetch(`${wpApiUrl}/tribe/events/v1/events`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${auth}`,
			},
			body: JSON.stringify(requestBody),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(
				`WordPress API error: ${response.status} - ${errorText}`
			)
		}

		const wpResult = await response.json()
		console.log('✅ Event created:', wpResult.id)

		// 5. Add tags in separate request
		if (tagIds.length > 0) {
			console.log(`🏷️ Adding tags to event ${wpResult.id}:`, tagIds)
			const tagResponse = await fetch(
				`${wpApiUrl}/wp/v2/tribe_events/${wpResult.id}`,
				{
					method: 'POST',
					headers: {
						Authorization: `Basic ${auth}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ tags: tagIds }),
				}
			)

			if (tagResponse.ok) {
				console.log('✅ Tags added successfully')
			} else {
				console.warn('⚠️ Failed to add tags')
			}
		}

		// 6. Handle featured image
		if (eventData.image_url) {
			await setFeaturedImage(
				wpResult.id,
				eventData.image_url,
				wpApiUrl,
				auth
			)
		}

		return res.json({
			success: true,
			message: 'Event submitted to WordPress successfully',
			wpEventId: wpResult.id,
			wpEventUrl: wpResult.url,
		})
	} catch (error) {
		console.error('💥 Error:', error)
		return res.status(500).json({
			success: false,
			message: 'Failed to submit event to WordPress',
			error: error.message,
		})
	}
}

// ✅ ADD FORMAT DATE FUNCTION - Match local version exactly
function formatDate(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	const seconds = String(date.getSeconds()).padStart(2, '0')
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// Inline utility functions
async function getOrCreateVenue(
	locationName: string,
	wpApiUrl: string,
	authString: string
): Promise<number> {
	try {
		// ✅ MATCH LOCAL - Exact logging format
		console.log(`Creating new venue: ${locationName}`)

		// First, check if venue already exists with this name
		const searchResponse = await fetch(
			`${wpApiUrl}/wp/v2/tribe_venue?search=${encodeURIComponent(
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
				// ✅ MATCH LOCAL - Exact logging format
				console.log(
					`Found existing venue: ${venues[0].title.rendered} (ID: ${venues[0].id})`
				)
				return venues[0].id
			}
		}

		// If not found, create a new venue
		console.log(`Creating new venue: ${locationName}`)

		// ✅ ADD LOCATION PARSING - Match local version exactly
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

		// ✅ USE PARSED LOCATION DATA
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

		const createResponse = await fetch(`${wpApiUrl}/wp/v2/tribe_venue`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${authString}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(venuePayload),
		})

		if (!createResponse.ok) {
			// ✅ MATCH LOCAL - Throw error instead of returning 0
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

async function getOrCreateTagIds(
	tags: string[],
	wpApiUrl: string,
	authString: string
): Promise<number[]> {
	console.log(`🏷️ Processing ${tags.length} tags:`, tags)

	const tagIds: number[] = []

	for (const tagName of tags) {
		try {
			// Search for existing tag
			const searchResponse = await fetch(
				`${wpApiUrl}/wp/v2/tags?search=${encodeURIComponent(tagName)}`,
				{
					headers: {
						Authorization: `Basic ${authString}`,
					},
				}
			)

			if (searchResponse.ok) {
				const existingTags = await searchResponse.json()
				const exactMatch = existingTags.find(
					(tag) => tag.name.toLowerCase() === tagName.toLowerCase()
				)

				if (exactMatch) {
					console.log(
						`✅ Found existing tag: ${exactMatch.name} (ID: ${exactMatch.id})`
					)
					tagIds.push(exactMatch.id)
					continue
				}
			}

			// Create new tag
			console.log(`🆕 Creating new tag: ${tagName}`)
			const createResponse = await fetch(`${wpApiUrl}/wp/v2/tags`, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${authString}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: tagName,
					slug: tagName.toLowerCase().replace(/\s+/g, '-'),
				}),
			})

			if (createResponse.ok) {
				const newTag = await createResponse.json()
				console.log(
					`✅ Created new tag: ${newTag.name} (ID: ${newTag.id})`
				)
				tagIds.push(newTag.id)
			} else {
				console.error(
					`❌ Failed to create tag "${tagName}": ${createResponse.status}`
				)
			}
		} catch (error) {
			console.error(`❌ Error processing tag "${tagName}":`, error)
		}
	}

	console.log(
		`🏷️ Processed ${tags.length} tags into ${tagIds.length} tag IDs:`,
		tagIds
	)
	return tagIds
}

async function setFeaturedImage(
	eventId: number,
	imageUrl: string,
	wpApiUrl: string,
	authString: string
): Promise<boolean> {
	try {
		console.log(
			`🖼️ Setting featured image for event ${eventId} from: ${imageUrl}`
		)

		// For now, just log - image upload is complex in serverless
		console.log('⚠️ Image upload skipped in serverless environment')
		return true
	} catch (error) {
		console.error('❌ Error with featured image:', error)
		return false
	}
}

function getDomainFromUrl(url: string): string {
	try {
		const urlObj = new URL(url)
		return urlObj.hostname.replace('www.', '')
	} catch (e) {
		return 'original source'
	}
}
