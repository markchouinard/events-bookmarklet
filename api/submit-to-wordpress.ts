import { VercelRequest, VercelResponse } from '@vercel/node'
import { getOrCreateVenue } from './utils/venue-handler'
import { getOrCreateTagIds } from './utils/tag-handler'
import { setFeaturedImage } from './utils/image-handler'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	// Add CORS headers
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

		console.log('🔧 WordPress config check:', {
			wpApiUrl: wpApiUrl ? 'SET' : 'MISSING',
			username: username ? 'SET' : 'MISSING',
			appPassword: appPassword ? 'SET' : 'MISSING',
		})

		if (!wpApiUrl || !username || !appPassword) {
			throw new Error(`Missing WordPress config`)
		}

		// Create Basic Auth header
		const auth = Buffer.from(`${username}:${appPassword}`).toString(
			'base64'
		)
		const wpEndpoint = `${wpApiUrl}/tribe/events/v1/events`

		console.log('🎯 WordPress endpoint:', wpEndpoint)

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
			start_date: eventData.start_date, // Direct field, not meta!
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
		const response = await fetch(wpEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${auth}`,
			},
			body: JSON.stringify(requestBody),
		})

		console.log(
			'📨 WordPress response status:',
			response.status,
			response.statusText
		)

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

function getDomainFromUrl(url: string): string {
	try {
		const urlObj = new URL(url)
		return urlObj.hostname.replace('www.', '')
	} catch (e) {
		return 'original source'
	}
}
