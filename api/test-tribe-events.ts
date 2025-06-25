import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		// Test if tribe_events endpoint exists
		const response = await fetch(
			'https://stage.sacitcentral.com/wp-json/wp/v2/tribe_events?per_page=1'
		)

		return res.json({
			success: response.ok,
			status: response.status,
			statusText: response.statusText,
			data: response.ok ? await response.json() : await response.text(),
		})
	} catch (error) {
		return res.json({
			success: false,
			error: error.message,
		})
	}
}
