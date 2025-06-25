export async function getOrCreateVenue(
	locationName: string,
	wpApiUrl: string,
	authString: string
): Promise<number> {
	try {
		console.log(`🏢 Processing venue: ${locationName}`)

		// First, check if venue already exists
		const searchResponse = await fetch(
			`${wpApiUrl}/wp/v2/tribe_venue?search=${encodeURIComponent(
				locationName
			)}`,
			{
				headers: {
					Authorization: `Basic ${authString}`,
				},
			}
		)

		if (searchResponse.ok) {
			const venues = await searchResponse.json()
			if (venues.length > 0) {
				console.log(
					`✅ Found existing venue: ${venues[0].title.rendered} (ID: ${venues[0].id})`
				)
				return venues[0].id
			}
		}

		// Create new venue
		console.log(`🆕 Creating new venue: ${locationName}`)

		// Basic location parsing
		let venueAddress = ''
		let venueCity = ''
		let venueState = ''
		let venueZip = ''

		if (locationName.includes(',')) {
			const parts = locationName.split(',').map((p) => p.trim())
			if (parts.length >= 2) {
				venueAddress = parts[0]
				venueCity = parts[1]

				if (parts.length >= 3) {
					const stateZipMatch = parts[2].match(/([A-Z]{2})\s+(\d{5})/)
					if (stateZipMatch) {
						venueState = stateZipMatch[1]
						venueZip = stateZipMatch[2]
					} else {
						venueState = parts[2]
					}
				}
			}
		}

		const venuePayload = {
			title: locationName,
			status: 'publish',
			meta: {
				_VenueAddress: venueAddress,
				_VenueCity: venueCity,
				_VenueStateProvince: venueState,
				_VenueZip: venueZip,
				_VenueCountry: 'United States',
				_VenuePhone: '',
				_VenueURL: '',
				_VenueShowMap: true,
				_VenueShowMapLink: true,
			},
		}

		const createResponse = await fetch(`${wpApiUrl}/wp/v2/tribe_venue`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${authString}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(venuePayload),
		})

		if (!createResponse.ok) {
			const errorText = await createResponse.text()
			console.error(
				`❌ Failed to create venue: ${createResponse.status} - ${errorText}`
			)
			return 0
		}

		const newVenue = await createResponse.json()
		console.log(`✅ Created new venue with ID: ${newVenue.id}`)
		return newVenue.id
	} catch (error) {
		console.error('❌ Error with venue:', error)
		return 0
	}
}
