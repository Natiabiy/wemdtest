require('dotenv').config();
const express = require('express');
const authRoutes = require('./backend/routes/authRoutes');

const app = express();

app.use(express.json());

process.on('uncaughtException', function (err) {
    console.log(err);
  });
  
app.use(express.static('public'));

// Serve the signup form
app.get('/signup', (req, res) => {
  res.sendFile('/public/signup.html');
});

// Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
