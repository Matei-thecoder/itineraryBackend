const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
require('dotenv').config()

const router = express.Router()

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields required' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) return res.status(400).json({ message: 'Email already registered' })

    const passwordHash = await bcrypt.hash(password, 10)
    const user = new User({ name, email, passwordHash })
    await user.save()

    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' })
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid credentials' })

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' })

    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' })
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
