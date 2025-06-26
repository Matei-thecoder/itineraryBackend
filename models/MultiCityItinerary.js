const mongoose = require('mongoose')

const multiCityItinerarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cities: [{
    cityName: { type: String, required: true },
    numberOfLocations: { type: Number, required: true },
    organizedGeographically: { type: Boolean, required: true },
  }],
}, { timestamps: true })

const MultiCityItinerary = mongoose.models.MultiCityItinerary || mongoose.model('MultiCityItinerary', multiCityItinerarySchema)

module.exports = MultiCityItinerary
