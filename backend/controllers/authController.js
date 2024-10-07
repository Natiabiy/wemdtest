// controllers/authController.js

const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

const HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN_SECRET = 'myadminsecretkey';

// SIGNUP CONTROLLER
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Hash the user's password
    const hashedPassword = await bcrypt.hash(password, 12);

    // GraphQL mutation to insert a user
    const mutation = `
      mutation ($name: String!, $email: String!, $password: String!) {
        insert_users_one(object: {name: $name, email: $email, password: $password}) {
          id
          name
          email
        }
      }
    `;

    // Send GraphQL mutation to Hasura
    const response = await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: mutation,
        variables: { name, email, password: hashedPassword }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    const user = response.data.data.insert_users_one;

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// LOGIN CONTROLLER
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // GraphQL query to fetch user by email
    const query = `
      query ($email: String!) {
        users(where: {email: {_eq: $email}}) {
          id
          name
          email
          password
        }
      }
    `;

    const response = await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query,
        variables: { email }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    const user = response.data.data.users[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare password with hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error logging in' });
  }
};
