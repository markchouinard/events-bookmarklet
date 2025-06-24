import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Environment-specific WordPress config
const WP_API_URL = process.env.WP_API_URL || 'https://sacitcentral.com/wp-json'
const WP_USERNAME = process.env.WP_USERNAME!
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD!

// Base64 encode credentials
const authString = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString(
	'base64'
)

// Add this function to handle tag name to ID conversion
export async function getOrCreateTagIds(
	tags: (string | number)[]
): Promise<number[]> {
	if (!tags || tags.length === 0) {
		return []
	}

	const tagIds: number[] = []

	for (const tag of tags) {
		// If it's already a number (tag ID), use it directly
		if (typeof tag === 'number') {
			tagIds.push(tag)
			continue
		}

		// If it's a string that looks like a number (tag ID), convert it
		if (typeof tag === 'string' && /^\d+$/.test(tag.trim())) {
			tagIds.push(parseInt(tag.trim()))
			continue
		}

		// Skip empty or invalid tag names
		if (!tag || typeof tag !== 'string' || tag.trim() === '') {
			console.warn(`Skipping invalid tag: ${tag}`)
			continue
		}

		const cleanTagName = tag.trim()

		try {
			// First, try to find existing tag
			const searchResponse = await fetch(
				`${WP_API_URL}/wp/v2/tags?search=${encodeURIComponent(
					cleanTagName
				)}&per_page=1`,
				{
					headers: {
						Authorization: `Basic ${authString}`,
					},
				}
			)

			if (searchResponse.ok) {
				const existingTags = await searchResponse.json()

				if (existingTags.length > 0) {
					// Tag exists, use its ID
					console.log(
						`Found existing tag: ${cleanTagName} (ID: ${existingTags[0].id})`
					)
					tagIds.push(existingTags[0].id)
					continue
				}
			}

			// Tag doesn't exist, create it
			console.log(`Creating new tag: ${cleanTagName}`)
			const createResponse = await fetch(`${WP_API_URL}/wp/v2/tags`, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${authString}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: cleanTagName,
					slug: cleanTagName
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, '-'),
				}),
			})

			if (createResponse.ok) {
				const newTag = await createResponse.json()
				console.log(
					`Created new tag: ${cleanTagName} (ID: ${newTag.id})`
				)
				tagIds.push(newTag.id)
			} else {
				const errorText = await createResponse.text()
				console.warn(
					`Failed to create tag: ${cleanTagName} - ${errorText}`
				)
			}
		} catch (error) {
			console.error(`Error processing tag "${cleanTagName}":`, error)
		}
	}

	console.log(
		`Processed ${tags.length} tags into ${tagIds.length} tag IDs:`,
		tagIds
	)
	return tagIds
}
