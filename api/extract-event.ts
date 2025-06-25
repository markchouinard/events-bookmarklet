import { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import * as Sentry from '@sentry/node'

// ✅ REAL SENTRY INIT
Sentry.init({
	dsn: 'https://d0218b8c4606d5f2a3480ad10db9ed67@o4507068179349504.ingest.us.sentry.io/4507588915691521',
	environment: process.env.NODE_ENV || 'development',
	sendDefaultPii: true,
	tracesSampleRate: 1.0,
})

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
	return Sentry.withScope(async (scope) => {
		scope.setTag('function', 'extract-event')
		scope.setContext('request', {
			method: req.method,
			url: req.body?.url,
			contentLength: req.body?.content?.length,
		})

		try {
			// Add CORS headers FIRST - before any other logic
			res.setHeader('Access-Control-Allow-Origin', '*')
			res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
			res.setHeader(
				'Access-Control-Allow-Headers',
				'Content-Type, X-SacIT-Token'
			)
			res.setHeader('Access-Control-Max-Age', '86400')

			// Handle preflight OPTIONS request
			if (req.method === 'OPTIONS') {
				return res.status(200).end()
			}

			if (req.method !== 'POST') {
				return res.status(405).json({ error: 'Method not allowed' })
			}

			// Token validation
			const token = req.headers['x-sacit-token']
			if (token !== 'secret123') {
				return res.status(401).json({ error: 'Unauthorized' })
			}

			const { url, content, images } = req.body

			// Get current date for context
			const currentDate = new Date()
			const currentDateString = currentDate.toISOString().split('T')[0]
			const currentDateTime = currentDate.toISOString()
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


If the event isn't relevant to tech, professional networking, or IT in California, return: { "irrelevant": true, "irrelevant_reason": "Brief explanation of why this event is not relevant to tech/IT/professional networking" }

Return only the JSON object, no other text or formatting.

URL: ${url}

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
				console.log('🔍 Extracted event:', result)

				let eventData
				try {
					let jsonString = result.trim()

					if (jsonString.includes('```')) {
						const firstBrace = jsonString.indexOf('{')
						const lastBrace = jsonString.lastIndexOf('}')

						if (
							firstBrace !== -1 &&
							lastBrace !== -1 &&
							lastBrace > firstBrace
						) {
							jsonString = jsonString.substring(
								firstBrace,
								lastBrace + 1
							)
						} else {
							throw new Error(
								'Could not find valid JSON braces in response'
							)
						}
					}

					eventData = JSON.parse(jsonString)
				} catch (parseError) {
					console.error('Error parsing OpenAI response:', parseError)
					return res.status(500).json({
						error: 'Failed to parse event data',
						details: parseError.message,
					})
				}

				if (eventData && eventData.irrelevant) {
					return res.json({ result: eventData })
				}

				if (images && images.length > 0) {
					eventData.image_url = images[0].url
				}

				res.json({ result: eventData })
			} catch (err) {
				console.error('❌ Error:', err)
				res.status(500).json({ error: 'Event extraction failed.' })
			}
		} catch (error) {
			Sentry.captureException(error, {
				tags: {
					function: 'extract-event',
					url: req.body?.url || 'unknown',
				},
				extra: {
					requestBody: req.body,
				},
			})

			console.error('❌ Error:', error)
			res.status(500).json({ error: 'Event extraction failed.' })
		}
	})
}
