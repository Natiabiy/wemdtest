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
 
 
  // Validation check: Ensure all required fields are provided
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields (name, email, password) are required.' });
  }

  try {
    // Hash the user's password with bcrypt using 12 salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // GraphQL mutation to insert a user
    const mutation = `
      mutation ($name: String!, $email: String!, $password: String!) {
        insert_Users_one(object: {name: $name, email: $email, password: $password}) {
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
        variables: { name, email, password: hashedPassword } // Use the hashed password here
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    // Check if Hasura returned any errors
    if (response.data.errors) {
      return res.status(400).json({ message: 'Hasura error', errors: response.data.errors });
    }

    const user = response.data.data?.insert_Users_one;

    // Ensure user was successfully created
    if (!user) {
      return res.status(400).json({ message: 'Failed to create user' });
    }

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
        Users(where: {email: {_eq: $email}}) {
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

    // Check if Hasura returned any errors
    if (response.data.errors) {
      return res.status(400).json({ message: 'Hasura error', errors: response.data.errors });
    }

    const user = response.data.data?.Users[0]; // Check for the user in the response

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare password with hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password); // Compare the password correctly

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
