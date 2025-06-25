import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	res.setHeader('Access-Control-Allow-Origin', '*')

	if (req.method === 'OPTIONS') {
		return res.status(200).end()
	}

	const wpApiUrl = process.env.WP_API_URL
	const username = process.env.WP_USERNAME
	const appPassword = process.env.WP_APP_PASSWORD

	return res.json({
		environment: 'production',
		wpApiUrl: wpApiUrl ? 'SET' : 'MISSING',
		username: username ? 'SET' : 'MISSING',
		appPassword: appPassword ? 'SET' : 'MISSING',
		endpoint: wpApiUrl ? `${wpApiUrl}/wp/v2/posts?per_page=1` : 'N/A',
	})
}
