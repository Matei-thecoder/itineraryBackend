require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const itineraryRoutes = require('./routes/itineraries')

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/itineraries', itineraryRoutes)

// Connect to MongoDB & start server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected')
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
  })
})
.catch(err => {
  console.error('MongoDB connection error:', err)
})
