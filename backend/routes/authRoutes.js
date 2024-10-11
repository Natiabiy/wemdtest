// routes/authRoutes.js
const express = require('express');
const forgotPasswordController = require('../controllers/forgotPasswordController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/signup', (req, res) => {
  res.sendFile('C:/Users/Administrator/hasura_101/public/signup.html');
});

// routes for forgot password
router.post('/forgotPassword', forgotPasswordController.forgotPassword);
router.post('/resetPassword/:token', forgotPasswordController.resetPassword);



// Protect this route with authMiddleware
router.get('/protected', authMiddleware, (req, res) => {
  res.status(200).json({ message: 'Access granted', user: req.user });
});

module.exports = router;
