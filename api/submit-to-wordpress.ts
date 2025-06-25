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

		// TODO: Implement WordPress API call here
		// For now, just return success
		return res.json({
			success: true,
			message: 'Event would be submitted to WordPress',
			eventData: eventData,
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
