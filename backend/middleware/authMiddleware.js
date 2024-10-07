// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Get token from the headers
  const token = req.headers['authorization']?.split(' ')[1]; // Authorization: Bearer <token>

  // If no token, return an error
  if (!token) {
    return res.status(401).json({ message: 'No token provided. Access denied.' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token. Access denied.' });
    }

    // If token is valid, save user info to request for use in other routes
    req.user = decoded;
    next(); // Proceed to the next middleware or route handler
  });
};

module.exports = authMiddleware;
