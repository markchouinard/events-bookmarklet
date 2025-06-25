export async function setFeaturedImage(
	eventId: number,
	imageUrl: string,
	wpApiUrl: string,
	authString: string
): Promise<boolean> {
	try {
		console.log(
			`🖼️ Setting featured image for event ${eventId} from: ${imageUrl}`
		)

		// Download the image
		const imageResponse = await fetch(imageUrl)
		if (!imageResponse.ok) {
			throw new Error(
				`Failed to fetch image: ${imageResponse.statusText}`
			)
		}

		const imageBuffer = await imageResponse.arrayBuffer()
		const contentType =
			imageResponse.headers.get('content-type') || 'image/jpeg'
		const extension = contentType.includes('png') ? 'png' : 'jpg'
		const filename = `event-${eventId}-featured.${extension}`

		console.log(
			`📤 Uploading: ${filename}, ${contentType}, ${imageBuffer.byteLength} bytes`
		)

		// Upload to WordPress media library
		const formData = new FormData()
		formData.append(
			'file',
			new Blob([imageBuffer], { type: contentType }),
			filename
		)
		formData.append('title', `Featured image for event ${eventId}`)
		formData.append('alt_text', `Featured image for event ${eventId}`)

		const uploadResponse = await fetch(`${wpApiUrl}/wp/v2/media`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${authString}`,
			},
			body: formData,
		})

		if (!uploadResponse.ok) {
			const errorText = await uploadResponse.text()
			console.error(
				`❌ Failed to upload image: ${uploadResponse.status} - ${errorText}`
			)
			return false
		}

		const mediaObject = await uploadResponse.json()
		console.log(`✅ Image uploaded successfully: ${mediaObject.id}`)

		// Set as featured image
		const updateResponse = await fetch(
			`${wpApiUrl}/wp/v2/tribe_events/${eventId}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Basic ${authString}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					featured_media: mediaObject.id,
				}),
			}
		)

		if (!updateResponse.ok) {
			const errorText = await updateResponse.text()
			console.error(
				`❌ Failed to set featured image: ${updateResponse.status} - ${errorText}`
			)
			return false
		}

		console.log('✅ Featured image set successfully')
		return true
	} catch (error) {
		console.error('❌ Error with featured image:', error)
		return false
	}
}
