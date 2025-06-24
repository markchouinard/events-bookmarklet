import { VercelRequest, VercelResponse } from '@vercel/node'

export function setCorsHeaders(res: VercelResponse) {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, DELETE, OPTIONS'
	)
	res.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, X-SacIT-Token'
	)
	res.setHeader('Access-Control-Max-Age', '86400')
}

export function handleCors(req: VercelRequest, res: VercelResponse) {
	setCorsHeaders(res)

	// Handle preflight OPTIONS request
	if (req.method === 'OPTIONS') {
		res.status(200).end()
		return true // Indicates that the request was handled
	}

	return false // Continue with normal processing
}
