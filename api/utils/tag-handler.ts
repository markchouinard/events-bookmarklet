export async function getOrCreateTagIds(
	tags: string[],
	wpApiUrl: string,
	authString: string
): Promise<number[]> {
	console.log(`🏷️ Processing ${tags.length} tags:`, tags)

	const tagIds: number[] = []

	for (const tagName of tags) {
		try {
			// Search for existing tag
			const searchResponse = await fetch(
				`${wpApiUrl}/wp/v2/tags?search=${encodeURIComponent(tagName)}`,
				{
					headers: {
						Authorization: `Basic ${authString}`,
					},
				}
			)

			if (searchResponse.ok) {
				const existingTags = await searchResponse.json()
				const exactMatch = existingTags.find(
					(tag) => tag.name.toLowerCase() === tagName.toLowerCase()
				)

				if (exactMatch) {
					console.log(
						`✅ Found existing tag: ${exactMatch.name} (ID: ${exactMatch.id})`
					)
					tagIds.push(exactMatch.id)
					continue
				}
			}

			// Create new tag
			console.log(`🆕 Creating new tag: ${tagName}`)
			const createResponse = await fetch(`${wpApiUrl}/wp/v2/tags`, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${authString}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: tagName,
					slug: tagName.toLowerCase().replace(/\s+/g, '-'),
				}),
			})

			if (createResponse.ok) {
				const newTag = await createResponse.json()
				console.log(
					`✅ Created new tag: ${newTag.name} (ID: ${newTag.id})`
				)
				tagIds.push(newTag.id)
			} else {
				const errorText = await createResponse.text()
				console.error(
					`❌ Failed to create tag "${tagName}": ${createResponse.status} - ${errorText}`
				)
			}
		} catch (error) {
			console.error(`❌ Error processing tag "${tagName}":`, error)
		}
	}

	console.log(
		`🏷️ Processed ${tags.length} tags into ${tagIds.length} tag IDs:`,
		tagIds
	)
	return tagIds
}
