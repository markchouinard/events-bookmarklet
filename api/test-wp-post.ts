import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		const auth = Buffer.from(
			`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
		).toString('base64')

		const response = await fetch(
			'https://stage.sacitcentral.com/wp-json/wp/v2/posts',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${auth}`,
				},
				body: JSON.stringify({
					title: 'Test from Vercel',
					content: 'This is a test post from Vercel',
					status: 'draft',
				}),
			}
		)

		return res.json({
			success: response.ok,
			status: response.status,
			data: response.ok ? await response.json() : await response.text(),
		})
	} catch (error) {
		return res.json({
			success: false,
			error: error.message,
		})
	}
}
