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
		console.log(
			'📦 Received eventData:',
			JSON.stringify(eventData, null, 2)
		)

		if (!eventData || !eventData.title || !eventData.start_date) {
			console.log('❌ Missing required event data')
			return res.status(400).json({
				success: false,
				message: 'Missing required event data',
			})
		}

		// WordPress API configuration
		const wpApiUrl = process.env.WP_API_URL
		const username = process.env.WP_USERNAME
		const appPassword = process.env.WP_APP_PASSWORD

		if (!wpApiUrl || !username || !appPassword) {
			throw new Error(`Missing WordPress config`)
		}

		// Create Basic Auth header
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

		// 4. Create event payload
		const requestBody = {
			title: eventData.title,
			description: enhancedDescription,
			start_date: eventData.start_date,
			end_date: eventData.end_date || eventData.start_date,
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

// Inline utility functions
async function getOrCreateVenue(
	locationName: string,
	wpApiUrl: string,
	authString: string
): Promise<number> {
	try {
		console.log(`🏢 Processing venue: ${locationName}`)

		// First, check if venue already exists
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
				console.log(
					`✅ Found existing venue: ${venues[0].title.rendered} (ID: ${venues[0].id})`
				)
				return venues[0].id
			}
		}

		// Create new venue
		console.log(`🆕 Creating new venue: ${locationName}`)

		const venuePayload = {
			title: locationName,
			status: 'publish',
			meta: {
				_VenueAddress: '',
				_VenueCity: '',
				_VenueStateProvince: '',
				_VenueZip: '',
				_VenueCountry: 'United States',
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
			console.error(`❌ Failed to create venue: ${createResponse.status}`)
			return 0
		}

		const newVenue = await createResponse.json()
		console.log(`✅ Created new venue with ID: ${newVenue.id}`)
		return newVenue.id
	} catch (error) {
		console.error('❌ Error with venue:', error)
		return 0
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
