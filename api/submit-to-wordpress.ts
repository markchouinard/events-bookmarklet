import { VercelRequest, VercelResponse } from '@vercel/node'
import { createEvent } from '../wordpress-api'
import { handleCors } from '../lib/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	// Add CORS headers FIRST
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

		const result = await createEvent(eventData)
		return res.json(result)
	} catch (error) {
		console.error('Error submitting to WordPress:', error)
		return res.status(500).json({
			success: false,
			message: 'Failed to submit event to WordPress',
			error: error.message,
		})
	}
}
