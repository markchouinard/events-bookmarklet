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

		console.log(`Submitting event to WordPress: ${eventData.title}`)

		// WordPress API configuration
		const wpApiUrl = process.env.WP_API_URL
		const username = process.env.WP_USERNAME
		const appPassword = process.env.WP_APP_PASSWORD

		if (!wpApiUrl || !username || !appPassword) {
			throw new Error('Missing WordPress API configuration')
		}

		// Create Basic Auth header
		const auth = Buffer.from(`${username}:${appPassword}`).toString(
			'base64'
		)

		// Submit to WordPress
		const response = await fetch(`${wpApiUrl}/wp/v2/tribe_events`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${auth}`,
			},
			body: JSON.stringify({
				title: eventData.title,
				content: eventData.content || '',
				status: 'draft', // Start as draft for review
				meta: {
					_EventStartDate: eventData.start_date,
					_EventEndDate: eventData.end_date || eventData.start_date,
					_EventVenueID: eventData.venue || '',
					_EventCost: eventData.cost || 'Free',
					_EventURL: eventData.url || '',
				},
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(
				`WordPress API error: ${response.status} - ${errorText}`
			)
		}

		const wpResult = await response.json()

		return res.json({
			success: true,
			message: 'Event submitted to WordPress successfully',
			wpEventId: wpResult.id,
			wpEventUrl: wpResult.link,
		})
	} catch (error) {
		console.error('Error submitting to WordPress:', error)
		return res.status(500).json({
			success: false,
			message: 'Failed to submit event to WordPress',
			error: error.message,
		})
	}
}
