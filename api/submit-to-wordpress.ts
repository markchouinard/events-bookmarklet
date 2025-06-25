import { VercelRequest, VercelResponse } from '@vercel/node'

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

		const requestBody = {
			title: eventData.title,
			// Enhanced description with source link
			description: `${eventData.content || ''}

${eventData.venue ? `**Venue:** ${eventData.venue}` : ''}

${
	eventData.url
		? `**Original Event:** [View on ${getDomainFromUrl(eventData.url)}](${
				eventData.url
		  })`
		: ''
}`.trim(),
			start_date: eventData.start_date, // Direct field, not meta!
			end_date: eventData.end_date || eventData.start_date,
			timezone: eventData.timezone || 'America/Los_Angeles',
			all_day: eventData.all_day || false,
			cost: eventData.cost || '',
			website: eventData.url || '',
			image: eventData.image_url || '',
			show_map: true,
			show_map_link: true,
			featured: false,
			status: 'draft',

			// Handle tags and categories if you have them
			tags: eventData.tags
				? eventData.tags.map((tag) => ({ name: tag }))
				: [],

			// Handle venue - you'll need to create venues first or use existing IDs
			// For now, put venue info in description
		}

		console.log('📝 Request body:', JSON.stringify(requestBody, null, 2))

		// Submit to WordPress
		console.log('📡 Making request to WordPress...')
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

		const responseText = await response.text()
		console.log('📄 WordPress response body:', responseText)

		if (!response.ok) {
			console.error(
				'❌ WordPress API error:',
				response.status,
				responseText
			)
			return res.status(500).json({
				success: false,
				message: `WordPress API error: ${response.status}`,
				details: responseText,
			})
		}

		const wpResult = JSON.parse(responseText)
		console.log('✅ WordPress success:', wpResult.id)

		return res.json({
			success: true,
			message: 'Event submitted to WordPress successfully',
			wpEventId: wpResult.id,
			wpEventUrl: wpResult.link,
		})
	} catch (error) {
		console.error('💥 Catch block error:', error)
		console.error('💥 Error stack:', error.stack)
		return res.status(500).json({
			success: false,
			message: 'Failed to submit event to WordPress',
			error: error.message,
			stack: error.stack,
		})
	}
}

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
