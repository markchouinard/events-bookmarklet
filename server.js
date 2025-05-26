import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
dotenv.config()

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

// Start server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`)
	console.log(`Bookmarklet URL: http://localhost:${port}/bookmarklet.html`)
})
