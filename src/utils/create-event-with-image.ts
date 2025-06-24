import fetch from 'node-fetch'
import { uploadImageWithMetadata } from './upload-with-metadata'
import {
	EventData,
	WordPressEvent,
	WordPressMediaObject,
	ApiResponse,
} from '../types/wordpress'

interface EventWithImageResult {
	event: WordPressEvent
	featuredImage: WordPressMediaObject
}

export const createEventWithFeaturedImage = async (
	eventData: EventData,
	imagePath: string,
	baseUrl: string,
	username: string,
	password: string
): Promise<EventWithImageResult> => {
	try {
		// Step 1: Upload the image
		console.log('Uploading featured image...')
		const mediaObject: WordPressMediaObject = await uploadImageWithMetadata(
			imagePath,
			baseUrl,
			username,
			password,
			{
				filename: 'event-featured-image.jpg',
				title: `Featured image for ${eventData.title}`,
				alt_text: eventData.title,
				contentType: 'image/jpeg',
			}
		)

		console.log('Image uploaded with ID:', mediaObject.id)

		// Step 2: Create the event with the uploaded image
		const completeEventData: EventData = {
			...eventData,
			featured_media: mediaObject.id,
		}

		console.log('Creating event...')
		const eventResponse = await fetch(
			`${baseUrl}/wp-json/tribe/events/v1/events`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization:
						'Basic ' +
						Buffer.from(`${username}:${password}`).toString(
							'base64'
						),
				},
				body: JSON.stringify(completeEventData),
			}
		)

		const event: WordPressEvent = await eventResponse.json()

		if (!eventResponse.ok) {
			throw new Error(`Event creation failed: ${(event as any).message}`)
		}

		console.log('Event created successfully:', event.id)
		return {
			event: event,
			featuredImage: mediaObject,
		}
	} catch (error) {
		console.error('Error in complete workflow:', error)
		throw error
	}
}

// Usage example
const eventData: EventData = {
	title: 'Photography Workshop',
	content: 'Learn professional photography techniques',
	start_date: '2024-03-20 10:00:00',
	end_date: '2024-03-20 16:00:00',
	venue: {
		venue: 'Photo Studio',
		address: '789 Art Street',
		city: 'Los Angeles',
		state: 'CA',
	},
}

// createEventWithFeaturedImage(eventData, './images/workshop-photo.jpg', 'https://yoursite.com', 'username', 'password');
