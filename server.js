import express from 'express'
import bodyParser from 'body-parser'
import { OpenAI } from 'openai'
import dotenv from 'dotenv'
dotenv.config()

const app = express()

// Add this CORS middleware BEFORE your routes
app.use((req, res, next) => {
	// Allow requests from any origin during development
	res.header('Access-Control-Allow-Origin', '*')

	// Allow specific headers, including your custom X-SacIT-Token
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, X-SacIT-Token'
	)

	// Handle preflight requests
	if (req.method === 'OPTIONS') {
		res.header('Access-Control-Allow-Methods', 'GET, POST')
		return res.status(200).send()
	}

	next()
})

app.use(bodyParser.json())

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

app.post('/extract-event', async (req, res) => {
	console.log(
		'📥 Received request from:',
		req.get('Origin') || 'Unknown origin'
	)

	try {
		// Validate auth token
		const token = req.header('X-SacIT-Token')
		if (token !== 'secret123') {
			console.error('❌ Authentication failed: Invalid token')
			return res.status(401).json({
				error: 'Unauthorized',
				details: 'Invalid or missing authentication token',
			})
		}

		// Check if we have required data
		const { url, content } = req.body
		if (!url || !content) {
			console.error('❌ Missing required fields:', {
				url: !!url,
				content: !!content,
			})
			return res.status(400).json({
				error: 'Bad Request',
				details:
					'Missing required fields: url and content are required',
			})
		}

		console.log('🔍 Processing URL:', url)
		console.log('📄 Content length:', content.length)

		// Your existing OpenAI processing code
		const prompt = `
You are an assistant that extracts structured event data from webpages. Given the raw text and URL of an event page, return a JSON object with:
- title
- description
- start_time (ISO format)
- end_time (if available)
- location
- source_url
- tags (short keywords)

If the event isn't relevant to tech, professional networking, or IT in California, or an online event, return: { "irrelevant": true }

URL: ${url}

TEXT:
${content.slice(0, 3000)}
    `.trim()

		const response = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.3,
		})

		const result = response.choices[0].message.content
		console.log('✅ Extracted event:', result)
		res.json({ result })
	} catch (err) {
		console.error('❌ Server error:', err)
		res.status(500).json({
			error: 'Server error',
			message: err.message,
			stack:
				process.env.NODE_ENV === 'development' ? err.stack : undefined,
		})
	}
})

app.listen(3000, () => console.log('API running on http://localhost:3000'))
