import { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'fs'
import path from 'path'

export default function handler(req: VercelRequest, res: VercelResponse) {
	try {
		// Set headers for JavaScript
		res.setHeader('Content-Type', 'application/javascript')
		res.setHeader('Cache-Control', 'public, max-age=300') // 5 min cache
		res.setHeader('Access-Control-Allow-Origin', '*')

		// Read the full bookmarklet script
		const scriptPath = path.join(
			process.cwd(),
			'dist',
			'bookmarklet-full.js'
		)

		if (fs.existsSync(scriptPath)) {
			const script = fs.readFileSync(scriptPath, 'utf8')
			res.status(200).send(script)
		} else {
			res.status(404).send('// Bookmarklet script not found')
		}
	} catch (error) {
		console.error('Error serving bookmarklet:', error)
		res.status(500).send('// Error loading bookmarklet')
	}
}
