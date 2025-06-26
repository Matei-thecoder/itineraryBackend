const express = require('express')
const SingleCityItinerary = require('../models/SingleCityItinerary')
const MultiCityItinerary = require('../models/MultiCityItinerary')
const authMiddleware = require('../middleware/authMiddleware')
const mongoose = require('mongoose')

const router = express.Router()
const { OpenAI } = require('openai') // ✅ top of the file

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Use auth middleware on all itinerary routes
router.use(authMiddleware)

router.get('/x/:id', async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
  console.warn('Invalid itinerary ID received:', id)
  return res.status(400).json({ message: 'Invalid itinerary ID' })
}

  try {
    let itinerary = await SingleCityItinerary.findById(id)
    if (itinerary) {
      return res.json({
        ...itinerary._doc,
        type: 'single',
      })
    }

    itinerary = await MultiCityItinerary.findById(id)
    if (itinerary) {
      return res.json({
        ...itinerary._doc,
        type: 'multi',
      })
    }

    res.status(404).json({ message: 'Itinerary not found' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/getall', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ message: 'Missing userId' })

  try {
    const single = await SingleCityItinerary.find({ userId })
    const multi = await MultiCityItinerary.find({ userId })

    // Mark type and unify schema a bit
    const formatted = [
      ...single.map((i) => ({ ...i._doc, type: 'single' })),
      
    ]

    res.status(200).json(formatted)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create Single City Itinerary
router.post('/single-city', async (req, res) => {
  try {
    const { cityName, numberOfLocations, organizedGeographically } = req.body

    if (typeof cityName !== 'string') console.log('cityName is not a string:', cityName)
    if (typeof numberOfLocations !== 'number') console.log('numberOfLocations is not a number:', numberOfLocations)
    if (typeof organizedGeographically !== 'boolean') console.log('organizedGeographically is not a boolean:', organizedGeographically)

    if (
      typeof cityName !== 'string' ||
      typeof numberOfLocations !== 'number' ||
      typeof organizedGeographically !== 'boolean'
    ) return res.status(400).json({ message: 'Invalid data' })

    const itinerary = new SingleCityItinerary({
      userId: req.user.id,
      cityName,
      numberOfLocations,
      organizedGeographically,
    })

    await itinerary.save()

    // Build dynamic prompt
    const basePrompt = `You are a travel planner. Generate a list of ${numberOfLocations} interesting locations in ${cityName} with a short one-sentence description each.`

    const organizationNote = organizedGeographically
      ? ' The list should be organized geographically from one side of the city to the other to minimize travel time.'
      : ''

    const formatInstruction = ` Format your response as a JSON array like this:
[
  { "name": "Colosseum", "description": "An ancient Roman amphitheatre known for gladiator fights." },
  ...
]
`

    const prompt = basePrompt + organizationNote + formatInstruction

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })

    const rawResponse = completion.choices[0]?.message?.content

    let parsedLocations
    try {
      parsedLocations = JSON.parse(rawResponse)
    } catch (jsonErr) {
      console.error('OpenAI JSON parse error:', jsonErr)
      return res.status(500).json({ message: 'Failed to parse AI response', rawResponse })
    }

    // Step 3: Update itinerary with location data
    itinerary.locations = parsedLocations
    await itinerary.save()

    res.status(201).json(itinerary)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
    console.log(err)
  }
})


// Get all itineraries for user (both single and multi)
router.get('/', async (req, res) => {
  try {
    const singleCityItineraries = await SingleCityItinerary.find({ userId: req.user.id })
    const multiCityItineraries = await MultiCityItinerary.find({ userId: req.user.id })
    res.json({ singleCityItineraries, multiCityItineraries })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Create Multi City Itinerary
router.post('/multi-city', async (req, res) => {
  try {
    const { cities } = req.body
    if (!Array.isArray(cities) || cities.length === 0) return res.status(400).json({ message: 'Cities array required' })

    for (const city of cities) {
      if (
        typeof city.cityName !== 'string' ||
        typeof city.numberOfLocations !== 'number' ||
        typeof city.organizedGeographically !== 'boolean'
      ) return res.status(400).json({ message: 'Invalid city data' })
    }

    const itinerary = new MultiCityItinerary({
      userId: req.user.id,
      cities,
    })

    await itinerary.save()
    res.status(201).json(itinerary)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})
router.delete('/:itineraryId/locations/:locationId', async (req, res) => {
  const { itineraryId, locationId } = req.params

  if (!mongoose.Types.ObjectId.isValid(itineraryId) || !mongoose.Types.ObjectId.isValid(locationId)) {
    return res.status(400).json({ message: 'Invalid itinerary or location ID' })
  }

  try {
    const itinerary = await SingleCityItinerary.findById(itineraryId)

    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' })
    }

    // Optional: ensure only the owner can delete
    if (req.user.id !== itinerary.userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Remove the location
    const updatedLocations = itinerary.locations.filter(
      (loc) => loc._id.toString() !== locationId
    )

    if (updatedLocations.length === itinerary.locations.length) {
      return res.status(404).json({ message: 'Location not found in itinerary' })
    }

    itinerary.locations = updatedLocations
    itinerary.numberOfLocations = updatedLocations.length // optional: update count

    await itinerary.save()

    res.status(200).json({ message: 'Location removed', updatedItinerary: itinerary })
  } catch (err) {
    console.error('Error deleting location:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
