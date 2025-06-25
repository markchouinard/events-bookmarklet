import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		const auth = Buffer.from(
			`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
		).toString('base64')

		const response = await fetch(
			'https://stage.sacitcentral.com/wp-json/wp/v2/tribe_events',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${auth}`,
				},
				body: JSON.stringify({
					title: 'Test Event from Vercel',
					content: 'This is a test event created from Vercel',
					status: 'draft',
					// Try minimal meta first
					meta: {
						_tribe_events_status: '',
						_tribe_events_status_reason: '',
					},
				}),
			}
		)

		const responseText = await response.text()
		let responseData
		try {
			responseData = JSON.parse(responseText)
		} catch {
			responseData = responseText
		}

		return res.json({
			success: response.ok,
			status: response.status,
			statusText: response.statusText,
			data: responseData,
		})
	} catch (error) {
		return res.json({
			success: false,
			error: error.message,
		})
	}
}
