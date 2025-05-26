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
- image_url (select the most appropriate image URL that represents this event)

If the event isn't relevant to tech, blockchain, WordPress, programming, professional networking, or IT in California or online, return:
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

IMAGES: ${images ? JSON.stringify(images) : 'No images available'}

TEXT:
${content.slice(0, 3000)}
`.trim()

		try {
			const response = await openai.chat.completions.create({
				model: 'gpt-4o',
				messages: [{ role: 'user', content: prompt }],
				temperature: 0.3,
			})

			const result = response.choices[0].message.content
			console.log('✅ Extracted event:', result)

			// Improved parsing logic
			try {
				let parsedResult

				// Case 1: Check for markdown code blocks
				if (result.includes('')) {
					console.log('Detected markdown code block format')

					// Extract just the JSON content
					// This regex captures everything between json and  but not including the backticks
					const codeBlockRegex = /(?:json)?\n([\s\S]+?)\n```/
					const jsonMatch = result.match(codeBlockRegex)

					if (jsonMatch && jsonMatch[1]) {
						const jsonContent = jsonMatch[1].trim()
						console.log(
							'Extracted JSON content without backticks:',
							jsonContent
						)
						parsedResult = JSON.parse(jsonContent)
					} else {
						throw new Error(
							'Could not extract JSON from markdown block'
						)
					}
				}
				// Case 2: Direct JSON
				else if (result.trim().startsWith('{')) {
					parsedResult = JSON.parse(result)
				}
				// Case 3: Unexpected format
				else {
					throw new Error('Response is not in expected format')
				}

				// Add default image for Python events if none was found
				if (
					parsedResult &&
					!parsedResult.irrelevant &&
					!parsedResult.image_url
				) {
					// Check if this is a Python event
					const tags = parsedResult.tags || []
					const isPythonEvent = tags.some(
						(tag) =>
							tag.toLowerCase().includes('python') ||
							(parsedResult.title &&
								parsedResult.title
									.toLowerCase()
									.includes('python'))
					)

					if (isPythonEvent) {
						console.log('Adding Python placeholder image')
						parsedResult.image_url =
							'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1200px-Python-logo-notext.svg.png'
					} else {
						// Generic tech event placeholder
						console.log('Adding generic tech event placeholder')
						parsedResult.image_url =
							'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4'
					}
				}

				// Send the parsed result
				res.json({ result: parsedResult })
			} catch (parseError) {
				console.error('❌ JSON parsing error:', parseError)

				// Last resort: manual extraction attempt
				try {
					console.log('Attempting manual JSON extraction')

					// Try to extract anything that looks like JSON
					const jsonPattern = /{[\s\S]*}/
					const possibleJson = result.match(jsonPattern)

					if (possibleJson) {
						const extractedJson = possibleJson[0]
						console.log('Manually extracted JSON:', extractedJson)

						const manuallyParsed = JSON.parse(extractedJson)
						console.log(
							'Successfully parsed manually extracted JSON'
						)

						// Add default image
						if (
							!manuallyParsed.image_url &&
							(manuallyParsed.title
								?.toLowerCase()
								.includes('python') ||
								manuallyParsed.tags?.some((t) =>
									t.toLowerCase().includes('python')
								))
						) {
							manuallyParsed.image_url =
								'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1200px-Python-logo-notext.svg.png'
						}

						res.json({ result: manuallyParsed })
						return
					}
				} catch (manualError) {
					console.error(
						'❌ Manual extraction also failed:',
						manualError
					)
				}

				// If all parsing fails, return a basic object with the raw data
				res.json({
					result: {
						title:
							result.match(/"title":\s*"([^"]+)"/)?.[1] ||
							'Parsing Error',
						description:
							'Could not parse the extracted data properly',
						raw: result,
						error: parseError.message,
						image_url:
							'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
					},
				})
			}
		} catch (err) {
			console.error('❌ GPT error:', err)
			res.status(500).json({ error: 'GPT extraction failed.' })
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
