import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { checkApiConnection, createEvent } from './wordpress-api.ts'
import { json } from 'stream/consumers'

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
app.post('/extract-event', async (req, res) => {
	const token = req.header('X-SacIT-Token')
	if (token !== 'secret123')
		return res.status(401).json({ error: 'Unauthorized' })

	const { url, content, images } = req.body

	// Get current date for context
	const currentDate = new Date()
	const currentDateString = currentDate.toISOString().split('T')[0] // YYYY-MM-DD format
	const currentDateTime = currentDate.toISOString() // Full ISO format
	const currentYear = currentDate.getFullYear()

	const prompt = `
You are an assistant that extracts structured event data from webpages.

CURRENT DATE: ${currentDateString}
CURRENT DATE/TIME: ${currentDateTime}
CURRENT YEAR: ${currentYear}

Given the raw text and URL of an event page, return ONLY a valid JSON object (no markdown formatting, no code blocks) with:
- title
- content (description of the event)
- start_date (ISO format, e.g., "2024-07-02T18:00:00" - use current year ${currentYear} if year is not specified)
- end_date (ISO format, if available - if only start time given, estimate reasonable end time)
- timezone (if detectable, e.g., "America/Los_Angeles", default to "America/Los_Angeles" for California events)
- all_day (boolean, true if it's an all-day event)
- venue (location/venue name as string)
- url (the source URL provided)
- cost (e.g., "Free", "$25", etc.)
- tags (array of short keywords)

IMPORTANT DATE PARSING RULES:
- If you see relative dates like "tomorrow", "next week", "this Friday", calculate from current date: ${currentDateString}
- If you see dates without year, assume current year: ${currentYear}
- If you see times like "6 PM" or "18:00", convert to full ISO format
- If no end time is specified, estimate a reasonable duration (typically 1-3 hours for most events)
- For California events, use "America/Los_Angeles" timezone

If the event isn't relevant to tech, professional networking, artificial intelligence,
or IT in California, return: { "irrelevant": true, "reason": "your reasons for making this decision" }

Return only the JSON object, no other text or formatting.

URL: ${url}

TEXT:
${content.slice(0, 3000)}
  `.trim()

	try {
		// Get event data from OpenAI
		const response = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.3,
		})

		const result = response.choices[0].message.content
		console.log('🔍 Extracted event:', result)

		// Parse the result
		let eventData
		try {
			let jsonString = result.trim()

			console.log('Raw OpenAI response length:', jsonString.length)
			console.log('First 50 chars:', jsonString.substring(0, 50))
			console.log(
				'Last 50 chars:',
				jsonString.substring(jsonString.length - 50)
			)

			// More aggressive cleaning of markdown code blocks
			if (jsonString.includes('```')) {
				// Find the first { and last }
				const firstBrace = jsonString.indexOf('{')
				const lastBrace = jsonString.lastIndexOf('}')

				if (
					firstBrace !== -1 &&
					lastBrace !== -1 &&
					lastBrace > firstBrace
				) {
					jsonString = jsonString.substring(firstBrace, lastBrace + 1)
					console.log(
						'Extracted JSON between braces:',
						jsonString.substring(0, 100) + '...'
					)
				} else {
					throw new Error(
						'Could not find valid JSON braces in response'
					)
				}
			}

			console.log('Final JSON string length:', jsonString.length)
			eventData = JSON.parse(jsonString)
			console.log('✅ Parsed event data successfully')
		} catch (parseError) {
			console.error('Error parsing OpenAI response:', parseError)
			console.error('Raw response:', result)
			return res.status(500).json({
				error: 'Failed to parse event data',
				details: parseError.message,
			})
		}

		// If event is irrelevant, return early
		if (eventData && eventData.irrelevant) {
			return res.json({ result: eventData })
		}

		// Add image URL if available
		if (images && images.length > 0) {
			eventData.image_url = images[0].url
		}

		// ONLY return the extracted data - don't create WordPress event yet
		res.json({
			result: eventData,
			// No wordpress creation here
		})
	} catch (err) {
		console.error('❌ Error:', err)
		res.status(500).json({ error: 'Event extraction failed.' })
	}
})

// Add this new route with improved error handling
app.post('/submit-to-wordpress', validateToken, async (req, res) => {
	try {
		const { eventData } = req.body

		if (!eventData || !eventData.title || !eventData.start_date) {
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
