// routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protect this route with authMiddleware
router.get('/protected', authMiddleware, (req, res) => {
  res.status(200).json({ message: 'Access granted', user: req.user });
});

module.exports = router;
