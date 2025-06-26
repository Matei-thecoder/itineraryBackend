const mongoose = require('mongoose')

const singleCityItinerarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cityName: { type: String, required: true },
  numberOfLocations: { type: Number, required: true },
  organizedGeographically: { type: Boolean, required: true },
  locations: [
    {
      name: String,
      description: String,
    },
  ],
}, { timestamps: true })

// Prevent OverwriteModelError in dev
const SingleCityItinerary = mongoose.models.SingleCityItinerary || mongoose.model('SingleCityItinerary', singleCityItinerarySchema)

module.exports = SingleCityItinerary
