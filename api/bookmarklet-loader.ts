import { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'fs'
import path from 'path'

export default function handler(req: VercelRequest, res: VercelResponse) {
	try {
		// Serve the loader HTML page
		res.setHeader('Content-Type', 'text/html')

		const htmlPath = path.join(
			process.cwd(),
			'dist',
			'bookmarklet-loader.html'
		)

		if (fs.existsSync(htmlPath)) {
			const html = fs.readFileSync(htmlPath, 'utf8')
			res.status(200).send(html)
		} else {
			res.status(404).send('<h1>Bookmarklet loader not found</h1>')
		}
	} catch (error) {
		console.error('Error serving loader:', error)
		res.status(500).send('<h1>Error loading bookmarklet loader</h1>')
	}
}
