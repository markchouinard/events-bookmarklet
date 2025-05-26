import { EventData } from '../types'

export const parseEventData = (data: any): EventData => {
	let eventData: EventData = { raw: '' }

	console.log('[SacIT] Parsing response data:', data)

	// Store raw response for debugging
	if (data.raw_result) {
		return {
			title: 'API Error',
			description: 'The server returned an error or invalid response',
			raw: data.raw_result,
			_rawResponse: data.raw_result,
		}
	}

	if (!data || !data.result) {
		console.error('[SacIT] No result data found in response')
		return {
			title: 'Error',
			description: 'No data received from server',
			raw: JSON.stringify(data),
		}
	}

	// Store the raw response for debugging
	const rawResponse = data.result

	try {
		// Case 1: If result is already an object
		if (typeof data.result === 'object') {
			console.log('[SacIT] Result is already an object')
			eventData = {
				...data.result,
				_rawResponse: JSON.stringify(data.result),
			}
		}
		// Case 2: If result is a string that needs parsing
		else if (typeof data.result === 'string') {
			console.log('[SacIT] Result is a string, attempting to parse')
			const jsonString = data.result.trim()

			// First, try to parse it directly as JSON (server might have already cleaned it)
			try {
				console.log('[SacIT] Attempting to parse as direct JSON')
				eventData = JSON.parse(jsonString)
				eventData._rawResponse = rawResponse
				console.log('[SacIT] Successfully parsed as direct JSON')
			} catch (directParseError) {
				console.log(
					'[SacIT] Direct JSON parse failed, trying to extract from code blocks'
				)

				// If direct parsing fails, try to extract JSON from markdown code blocks if present
				if (jsonString.includes('```')) {
					console.log(
						'[SacIT] Detected markdown code block, attempting to extract JSON'
					)
					// Extract content between triple backticks
					const match = jsonString.match(
						/```(?:json)?\n?([\s\S]+?)\n?```/
					)
					if (match && match[1]) {
						const extracted = match[1].trim()
						console.log(
							'[SacIT] Extracted content from code block:',
							extracted.substring(0, 50) + '...'
						)
						try {
							eventData = JSON.parse(extracted)
							eventData._rawResponse = rawResponse
						} catch (e) {
							console.error(
								'[SacIT] Error parsing extracted JSON:',
								e
							)
							throw e
						}
					} else {
						throw new Error(
							'Could not extract JSON from code block'
						)
					}
				} else {
					// If no code blocks and not direct JSON, rethrow the original error
					throw directParseError
				}
			}
		}
	} catch (e) {
		console.error('[SacIT] Error parsing result:', e)
		// Show raw data when parsing fails
		return {
			title: 'Parsing Error',
			description: 'Could not parse event data. Raw response:',
			raw: rawResponse,
			_rawResponse: rawResponse,
		}
	}

	return eventData
}
