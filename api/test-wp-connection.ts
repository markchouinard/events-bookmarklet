import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		const response = await fetch(
			'https://stage.sacitcentral.com/wp-json/wp/v2/posts?per_page=1'
		)
		const data = await response.json()

		return res.json({
			success: response.ok,
			status: response.status,
			dataLength: data.length,
			firstPost: data[0]?.title?.rendered || 'No posts',
		})
	} catch (error) {
		return res.json({
			success: false,
			error: error.message,
		})
	}
}
