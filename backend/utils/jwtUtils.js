const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

exports.verifyToken = (token) => jwt.verify(token, JWT_SECRET);
