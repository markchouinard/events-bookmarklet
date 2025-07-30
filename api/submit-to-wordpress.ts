import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	console.log('🚀 WordPress submission started')

	// Add CORS headers FIRST
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', '*')
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
		console.log('📦 Processing event data...')

		const { eventData } = req.body
		console.log('Event data received:', JSON.stringify(eventData, null, 2))

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

		console.log('WordPress config check:', {
			wpApiUrl: wpApiUrl ? 'SET' : 'MISSING',
			username: username ? 'SET' : 'MISSING',
			appPassword: appPassword ? 'SET' : 'MISSING',
		})

		if (!wpApiUrl || !username || !appPassword) {
			throw new Error('Missing WordPress configuration')
		}

		// Create Basic Auth header
		const auth = Buffer.from(`${username}:${appPassword}`).toString(
			'base64'
		)

		console.log('🏢 Processing venue...')
		let venueId = 0
		if (eventData.venue) {
			try {
				venueId = await getOrCreateVenue(
					eventData.venue,
					wpApiUrl,
					auth
				)
			} catch (error) {
				console.warn('Venue creation failed:', error)
			}
		}

		console.log('🏷️ Processing tags...')
		let tagIds: number[] = []
		if (eventData.tags && Array.isArray(eventData.tags)) {
			try {
				tagIds = await getOrCreateTagIds(eventData.tags, wpApiUrl, auth)
			} catch (error) {
				console.warn('Tag processing failed:', error)
			}
		}

		console.log('👥 Processing organizer...')
		let organizerId = 0
		if (eventData.organizer) {
			try {
				organizerId = await getOrCreateOrganizer(
					eventData.organizer,
					wpApiUrl,
					auth
				)
			} catch (error) {
				console.warn('Organizer creation failed:', error)
			}
		}

		// Enhanced description with Austin's disclaimer notice
		let enhancedDescription = ''
		
		// Add Austin's disclaimer notice at the top
		enhancedDescription += '<h2><span style="color: #008000;"><em>***Please Use Source Link Below to Confirm Event Details***</em></span></h2>\n\n'
		
		// Add the main event content
		enhancedDescription += eventData.content || ''
		
		// Clean and add source link at the bottom
		let cleanUrl = eventData.url
		if (eventData.url) {
			cleanUrl = cleanUrlParameters(eventData.url)
			const domain = getDomainFromUrl(cleanUrl)
			const linkText = eventData.title || domain
			enhancedDescription += `\n\n<p><strong>Original Event:</strong> <a href="${cleanUrl}" target="_blank" rel="noopener">${linkText}</a></p>`
		}

		// Create event payload
		const requestBody = {
			title: eventData.title,
			description: enhancedDescription,
			start_date: eventData.start_date,
			end_date: eventData.end_date || eventData.start_date,
			timezone: eventData.timezone || 'America/Los_Angeles',
			all_day: eventData.all_day || false,
			cost: eventData.cost || '',
			website: cleanUrl || '',
			venue: venueId,
			organizer: organizerId > 0 ? [organizerId] : [],
			show_map: true,
			show_map_link: true,
			featured: false,
			status: 'draft',
		}

		console.log('📝 Creating event in WordPress...')
		console.log('Request body:', JSON.stringify(requestBody, null, 2))

		const response = await fetch(`${wpApiUrl}/tribe/events/v1/events`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${auth}`,
			},
			body: JSON.stringify(requestBody),
		})

		console.log('WordPress response status:', response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error('WordPress API error:', response.status, errorText)
			throw new Error(
				`WordPress API error: ${response.status} - ${errorText}`
			)
		}

		const wpResult = await response.json()
		console.log('✅ Event created successfully:', wpResult.id)

		// Add tags in separate request if we have any
		if (tagIds.length > 0 && wpResult.id) {
			console.log(`🏷️ Adding tags to event ${wpResult.id}:`, tagIds)
			try {
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
			} catch (tagError) {
				console.warn('Tag addition failed:', tagError)
			}
		}

		// Handle featured image (simplified for now)
		if (eventData.image_url && wpResult.id) {
			console.log('🖼️ Setting featured image from:', eventData.image_url)
			try {
				await setFeaturedImage(
					wpResult.id,
					eventData.image_url,
					wpApiUrl,
					auth
				)
			} catch (imageError) {
				console.warn('⚠️ Featured image upload failed:', imageError)
			}
		}

		return res.json({
			success: true,
			message: 'Event submitted to WordPress successfully',
			wpEventId: wpResult.id,
			wpEventUrl: wpResult.url || wpResult.link,
		})
	} catch (error) {
		console.error('💥 Error:', error)
		const errorMessage =
			error instanceof Error ? error.message : String(error)
		return res.status(500).json({
			success: false,
			message: 'Failed to submit event to WordPress',
			error: errorMessage,
		})
	}
}

// Utility Functions
async function getOrCreateVenue(
	locationName: string,
	wpApiUrl: string,
	authString: string
): Promise<number> {
	try {
		console.log(`🏢 Processing venue: ${locationName}`)

		// Search for existing venue
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
					(tag: any) =>
						tag.name.toLowerCase() === tagName.toLowerCase()
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

function getDomainFromUrl(url: string): string {
	try {
		const urlObj = new URL(url)
		return urlObj.hostname.replace('www.', '')
	} catch (e) {
		return 'original source'
	}
}

function cleanUrlParameters(url: string): string {
	try {
		const urlObj = new URL(url)
		
		// Parameters to keep (essential for functionality)
		const keepParams = new Set([
			'id', 'event_id', 'eventId', 'e', 'eid',  // Event IDs
			'date', 'start', 'time',                  // Date/time params
			'category', 'cat', 'type',                // Category params
			'slug', 'name',                           // Slug/name params
			'page', 'p',                              // Page params
		])
		
		// Remove tracking/analytics parameters
		const removeParams = new Set([
			'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',  // UTM tracking
			'fbclid', 'gclid', 'igshid',                                            // Social media tracking
			'recId', 'recSource', 'searchId', 'eventOrigin',                        // Meetup tracking
			'_hsenc', '_hsmi',                                                      // HubSpot tracking
			'mc_cid', 'mc_eid',                                                     // MailChimp tracking
			'ref', 'referrer', 'source',                                            // Referrer tracking
			'clicked', 'email', 'signature',                                        // Email tracking
		])
		
		// Keep only essential parameters
		const newSearchParams = new URLSearchParams()
		
		urlObj.searchParams.forEach((value, key) => {
			const lowerKey = key.toLowerCase()
			// Keep if it's in the keep list, or if it's not in the remove list
			if (keepParams.has(lowerKey) || !removeParams.has(lowerKey)) {
				// Only keep if it seems essential (not obviously tracking)
				if (!lowerKey.includes('track') && !lowerKey.includes('analytics') && 
				    !lowerKey.startsWith('__') && !lowerKey.includes('pixel')) {
					newSearchParams.append(key, value)
				}
			}
		})
		
		urlObj.search = newSearchParams.toString()
		return urlObj.toString()
	} catch (e) {
		// If URL parsing fails, return original
		return url
	}
}

async function getOrCreateOrganizer(
	organizerName: string,
	wpApiUrl: string,
	authString: string
): Promise<number> {
	try {
		console.log(`👥 Processing organizer: ${organizerName}`)

		// Search for existing organizer
		const searchResponse = await fetch(
			`${wpApiUrl}/wp/v2/tribe_organizer?search=${encodeURIComponent(
				organizerName
			)}`,
			{
				headers: {
					Authorization: `Basic ${authString}`,
				},
			}
		)

		if (searchResponse.ok) {
			const organizers = await searchResponse.json()
			if (organizers.length > 0) {
				console.log(
					`✅ Found existing organizer: ${organizers[0].title.rendered} (ID: ${organizers[0].id})`
				)
				return organizers[0].id
			}
		}

		// Create new organizer
		console.log(`🆕 Creating new organizer: ${organizerName}`)
		const organizerPayload = {
			title: organizerName,
			status: 'publish',
			meta: {
				_OrganizerPhone: '',
				_OrganizerWebsite: '',
				_OrganizerEmail: '',
			},
		}

		const createResponse = await fetch(`${wpApiUrl}/wp/v2/tribe_organizer`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${authString}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(organizerPayload),
		})

		if (!createResponse.ok) {
			console.error(`❌ Failed to create organizer: ${createResponse.status}`)
			return 0
		}

		const newOrganizer = await createResponse.json()
		console.log(`✅ Created new organizer with ID: ${newOrganizer.id}`)
		return newOrganizer.id
	} catch (error) {
		console.error('❌ Error with organizer:', error)
		return 0
	}
}

async function setFeaturedImage(
	eventId: number,
	imageUrl: string,
	wpApiUrl: string,
	authString: string
): Promise<boolean> {
	try {
		console.log(`🖼️ Downloading image from: ${imageUrl}`)

		const imageResponse = await fetch(imageUrl)
		if (!imageResponse.ok) {
			throw new Error(
				`Failed to fetch image: ${imageResponse.statusText}`
			)
		}

		// Fix: Use blob directly from response
		const blob = await imageResponse.blob()
		const contentType =
			imageResponse.headers.get('content-type') || 'image/jpeg'

		console.log(
			`📦 Image downloaded: ${blob.size} bytes, type: ${contentType}`
		)

		// Use native FormData
		const formData = new FormData()

		const extension = contentType.includes('png') ? 'png' : 'jpg'
		const filename = `event-${eventId}-featured.${extension}`

		// This should work now - blob is proper Blob type
		formData.append('file', blob, filename)

		// Upload to WordPress media library
		console.log('📤 Uploading to WordPress media library...')
		const uploadResponse = await fetch(`${wpApiUrl}/wp/v2/media`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${authString}`,
				// Let FormData set Content-Type automatically
			},
			body: formData,
		})

		if (!uploadResponse.ok) {
			const errorText = await uploadResponse.text()
			throw new Error(
				`Media upload failed: ${uploadResponse.status} - ${errorText}`
			)
		}

		const mediaObject = await uploadResponse.json()
		console.log('✅ Media uploaded successfully:', mediaObject.id)

		// Set as featured image
		console.log(`🖼️ Setting as featured image for event ${eventId}`)
		const updateResponse = await fetch(
			`${wpApiUrl}/wp/v2/tribe_events/${eventId}`,
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
			const errorText = await updateResponse.text()
			throw new Error(
				`Failed to set featured image: ${updateResponse.status} - ${errorText}`
			)
		}

		console.log('🎉 Featured image set successfully!')
		return true
	} catch (error) {
		console.error('❌ Error setting featured image:', error)
		return false
	}
}
