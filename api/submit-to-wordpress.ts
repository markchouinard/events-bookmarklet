import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	// Add CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-SacIT-Token')
	res.setHeader('Access-Control-Max-Age', '86400')

	// Handle preflight OPTIONS request
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
		const { eventData } = req.body

		if (!eventData || !eventData.title || !eventData.start_date) {
			return res.status(400).json({
				success: false,
				message: 'Missing required event data',
			})
		}

		console.log(`🔥 Submitting event to WordPress: ${eventData.title}`)

		// WordPress API configuration
		const wpApiUrl = process.env.WP_API_URL
		const username = process.env.WP_USERNAME
		const appPassword = process.env.WP_APP_PASSWORD

		console.log('🔧 WordPress config:', {
			wpApiUrl: wpApiUrl ? 'SET' : 'MISSING',
			username: username ? 'SET' : 'MISSING',
			appPassword: appPassword ? 'SET' : 'MISSING',
		})

		if (!wpApiUrl || !username || !appPassword) {
			throw new Error(
				`Missing WordPress API configuration: wpApiUrl=${!!wpApiUrl}, username=${!!username}, appPassword=${!!appPassword}`
			)
		}

		// Create Basic Auth header
		const auth = Buffer.from(`${username}:${appPassword}`).toString(
			'base64'
		)
		const wpEndpoint = `${wpApiUrl}/wp/v2/tribe_events`

		console.log('🎯 WordPress endpoint:', wpEndpoint)

		// Submit to WordPress
		const response = await fetch(wpEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${auth}`,
			},
			body: JSON.stringify({
				title: eventData.title,
				status: 'draft',
				// Start with minimal meta fields that work
				meta: {
					_tribe_events_status: '',
					_tribe_events_status_reason: '',
					// Add event details in the content for now
				},
				// Add event details to the content
				content: `${eventData.content || ''}

**Event Details:**
- Start Date: ${eventData.start_date}
- End Date: ${eventData.end_date || eventData.start_date}
- Venue: ${eventData.venue || 'TBD'}
- Cost: ${eventData.cost || 'Free'}
- Source: ${eventData.url || ''}
        `.trim(),
			}),
		})

		console.log('📡 WordPress response status:', response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error('❌ WordPress API error:', errorText)
			throw new Error(
				`WordPress API error: ${response.status} - ${errorText}`
			)
		}

		const wpResult = await response.json()
		console.log('✅ WordPress success:', wpResult)

		return res.json({
			success: true,
			message: 'Event submitted to WordPress successfully',
			wpEventId: wpResult.id,
			wpEventUrl: wpResult.link,
		})
	} catch (error) {
		console.error('💥 Error submitting to WordPress:', error)
		return res.status(500).json({
			success: false,
			message: 'Failed to submit event to WordPress',
			error: error.message,
		})
	}
}
