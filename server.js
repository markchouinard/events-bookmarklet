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
		const { url, content, images } = req.body
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
		console.log('🖼️ Images found:', images ? images.length : 0)

		// Your existing OpenAI processing code
		const prompt = `
You are an assistant that extracts structured event data from webpages. Given the raw text, URL, and available images of an event page, return a JSON object with:
- title
- description
- start_time (ISO format)
- end_time (if available)
- location
- source_url
- tags (short keywords)
- image_url (select the most appropriate image URL that represents this event, or null if none are suitable.  Use hints like class names to determine if an image is suitable.  Meetup seems to use "event-description-image" for event images, but this may vary.)

If the event isn't relevant to tech, professional networking, or IT in California, return: { "irrelevant": true }

URL: ${url}

IMAGES: ${images ? JSON.stringify(images) : 'No images available'}

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

		// Parse the JSON from the response
		try {
			let cleanResult
			if (result.includes('')) {
				// Extract JSON from markdown code block
				const match = result.match(/(?:json)?\s*([\s\S]+?)\s*```/)
				if (match && match[1]) {
					cleanResult = JSON.parse(match[1].trim())
				}
			} else if (result.trim().startsWith('{')) {
				cleanResult = JSON.parse(result)
			} else {
				cleanResult = { raw: result }
			}

			// Send parsed object
			res.json({ result: cleanResult })
		} catch (parseError) {
			console.error('❌ JSON parsing error:', parseError)
			res.json({ result: result, parseError: parseError.message })
		}
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
