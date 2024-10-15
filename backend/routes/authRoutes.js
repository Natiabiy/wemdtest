// routes/authRoutes.js
const express = require('express');
const forgotPasswordController = require('../controllers/forgotPasswordController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const consultationRequestController = require('../controllers/consultationController');


const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/signup', (req, res) => {
  res.sendFile('C:/Users/Administrator/hasura_101/public/signup.html');
});

// routes for forgot password
router.post('/forgotPassword', forgotPasswordController.forgotPassword);
router.post('/resetPassword/:token', forgotPasswordController.resetPassword);



// Route to create a consultation request (patient-side)
router.post('/consultation-request', consultationRequestController.createConsultationRequest);

// Route to assign doctor to a consultation request (doctor-side)
router.put('/consultation-request/assign-doctor', consultationRequestController.assignDoctorToRequest);


// Protect this route with authMiddleware
router.get('/protected', authMiddleware, (req, res) => {
  res.status(200).json({ message: 'Access granted', user: req.user });
});

module.exports = router;
