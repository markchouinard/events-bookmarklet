import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { checkApiConnection, createEvent } from './wordpress-api.js'

// Load environment variables
dotenv.config()

// Override with environment-specific file if available
if (process.env.NODE_ENV) {
	dotenv.config({ path: `.env.${process.env.NODE_ENV}`, override: true })
}

const config = {
	server: {
		port: process.env.PORT || 3000,
		environment: process.env.NODE_ENV || 'development',
	},
	wordpress: {
		apiUrl: process.env.WP_API_URL,
		eventEndpoint: process.env.WP_EVENT_ENDPOINT,
		authMethod: process.env.WP_AUTH_METHOD,
		username: process.env.WP_USERNAME,
		appPassword: process.env.WP_APP_PASSWORD,
	},
}

console.log(`Server starting in ${config.server.environment} mode`)
console.log(`WordPress API URL: ${config.wordpress.apiUrl}`)

// Get current file's directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Express
const app = express()
const port = process.env.PORT || 3000

// Configure OpenAI with the new v4 syntax
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.static('dist'))

// Validation middleware
const validateToken = (req, res, next) => {
	const token = req.headers['x-sacit-token']
	if (token !== 'secret123') {
		// In production, use a more secure approach
		return res.status(401).json({ error: 'Unauthorized' })
	}
	next()
}

// Routes
app.post('/extract-event', validateToken, async (req, res) => {
	try {
		const { url, content, images } = req.body

		if (!url || !content) {
			return res
				.status(400)
				.json({ error: 'URL and content are required' })
		}

		console.log(`Extracting event data from: ${url}`)
		console.log(`Content length: ${content.length} characters`)
		console.log(`Images provided: ${images ? images.length : 0}`)

		// Prepare the prompt for the LLM
		const prompt = `
You are an assistant that extracts structured event data from webpages.

RESPONSE FORMAT:
You must respond with a valid JSON object only. No markdown code blocks, no explanations, just a plain JSON object.

Given the raw text, URL, and available images of an event page, return a JSON object with:
- title
- description
- start_time (ISO format)
- end_time (if available)
- location
- source_url
- tags (short keywords)
- image_url (select the most appropriate image URL that represents this event)

If the event isn't relevant to tech, professional networking, or IT in California, return:
{
	"irrelevant": true,
	"relevance_score": 0-100,
	"relevance_reason": "Brief explanation why this event isn't relevant"
}

IMPORTANT INSTRUCTIONS FOR RELEVANCE:
- Tech events include: software development, IT, data science, AI/ML, cybersecurity, tech conferences
- Professional networking includes: career fairs, industry meetups, professional development
- California focus: prioritize events in California, especially Northern California and Sacramento area
- Score relevance from 0-100, with 75+ being highly relevant
- Provide clear reasoning for irrelevant events

URL: ${url}

IMAGES: ${images ? JSON.stringify(images.slice(0, 5)) : 'No images available'}

TEXT:
${content.slice(0, 3000)}
`.trim()

		// Call OpenAI API with the new v4 syntax
		const completion = await openai.chat.completions.create({
			model: 'gpt-4-turbo-preview', // or "gpt-3.5-turbo" for a less expensive option
			messages: [
				{
					role: 'system',
					content:
						'You are an event extraction assistant that returns ONLY valid JSON data with no other text or formatting.',
				},
				{
					role: 'user',
					content: prompt,
				},
			],
			temperature: 0.1,
			response_format: { type: 'json_object' }, // This ensures JSON response on supported models
		})

		const result = completion.choices[0].message.content

		// Validate and clean the result
		let cleanedResult = result

		// Remove any markdown code block markers if present
		if (result.includes('')) {
			cleanedResult = result.replace(/json\n|\n/g, '')
			console.log('Cleaned markdown JSON code blocks from response')
		} else if (result.includes('')) {
			cleanedResult = result.replace(/\n|\n/g, '')
			console.log('Cleaned markdown code blocks from response')
		}

		// Log the cleaned result for debugging
		console.log('Cleaned result:', cleanedResult.substring(0, 100) + '...')

		// Try to parse it to ensure it's valid JSON
		try {
			JSON.parse(cleanedResult)
			console.log('Response is valid JSON')
		} catch (e) {
			console.error('Invalid JSON in response:', e)
			console.error('Raw response:', result)
			return res.status(500).json({
				error: 'Invalid JSON response from LLM',
				raw_result: result,
			})
		}

		console.log('LLM Response processed successfully')
		return res.json({ result: cleanedResult })
	} catch (error) {
		console.error('Error processing request:', error)
		return res.status(500).json({
			error: 'Failed to process event',
			details: error.message,
		})
	}
})

// Add this new route with improved error handling
app.post('/submit-to-wordpress', validateToken, async (req, res) => {
	try {
		const { eventData } = req.body

		if (!eventData || !eventData.title || !eventData.start_time) {
			return res.status(400).json({
				success: false,
				message: 'Missing required event data',
			})
		}

		console.log(`Submitting event to WordPress: ${eventData.title}`)

		// Add more detailed logging
		console.log('WordPress API URL:', process.env.WP_API_URL)
		console.log('WordPress Username:', process.env.WP_USERNAME)
		console.log('Event data:', JSON.stringify(eventData, null, 2))

		const result = await createEvent(eventData)

		return res.json(result)
	} catch (error) {
		console.error('Error submitting to WordPress:', error)
		return res.status(500).json({
			success: false,
			message: 'Failed to submit event to WordPress',
			error: error.message,
		})
	}
})

// Add this route to test WordPress connection
app.get('/test-wordpress', async (req, res) => {
	try {
		const result = await checkApiConnection()
		res.json(result)
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Error testing WordPress connection',
			error: error.message,
		})
	}
})

// Add this to server.js
app.get('/check-events-api', async (req, res) => {
	try {
		// Check The Events Calendar REST API
		const tecApiResponse = await fetch(
			`${process.env.WP_API_URL}/tribe/events/v1/events?per_page=1`
		)
		const tecApiWorks = tecApiResponse.ok
		const tecApiStatus = tecApiResponse.status

		// Check WordPress core REST API with TEC post type
		const wpApiResponse = await fetch(
			`${process.env.WP_API_URL}/wp/v2/tribe_events?per_page=1`
		)
		const wpApiWorks = wpApiResponse.ok
		const wpApiStatus = wpApiResponse.status

		res.json({
			success: true,
			tecApiAvailable: tecApiWorks,
			tecApiStatus,
			wpApiAvailable: wpApiWorks,
			wpApiStatus,
			recommendation: tecApiWorks
				? 'Use The Events Calendar REST API'
				: 'Use WordPress Core REST API with TEC fields',
		})
	} catch (error) {
		res.json({
			success: false,
			error: error.message,
		})
	}
})

// Start server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`)
	console.log(`Bookmarklet URL: http://localhost:${port}/bookmarklet.html`)
})
