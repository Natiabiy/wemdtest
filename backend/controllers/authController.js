// controllers/authController.js

const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

const HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN_SECRET = 'myadminsecretkey';

const createdAt = new Date().toISOString();


// SIGNUP CONTROLLER
exports.signup = async (req, res) => {
  const { first_name, middle_name, last_name, email, password, phone_no, gender, dob, country, city, user_type } = req.body;

  // Validation check: Ensure all required fields are provided
  if (!first_name || !last_name || !email || !password || !phone_no || !gender || !dob || !country || !city || !user_type) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Check if a user with the given email already exists
    const checkUserQuery = `
      query ($email: String!) {
        user(where: {email: {_eq: $email}}) {
          user_id
          email
        }
      }
    `;

    const checkUserResponse = await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: checkUserQuery,
        variables: { email }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    const existingUser = checkUserResponse.data.data?.user[0];

    // If a user with the given email exists, return an error
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    // Hash the user's password with bcrypt using 12 salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

   // GraphQL mutation to insert a new user, sending created_at explicitly
   const mutation = `
   mutation ($first_name: String!, $middle_name: String, $last_name: String!, $email: String!, $password: String!, $phone_no: String!, $gender: String!, $dob: date!, $country: String!, $city: String!, $user_type: String!) {
     insert_user_one(object: {
       first_name: $first_name,
       middle_name: $middle_name,
       last_name: $last_name,
       email: $email,
       password: $password,
       phone_no: $phone_no,
       gender: $gender,
       dob: $dob,
       country: $country,
       city: $city,
       user_type: $user_type
     }) {
       user_id
       first_name
       last_name
       email
       created_at
     }
   }
 `;
 

// In the variables passed to the mutation, include created_at
const variables = {
first_name,
middle_name,
last_name,
email,
password: hashedPassword,
phone_no,
gender,
dob,
country,
city,
user_type,
created_at: createdAt // Send the generated timestamp
};

    // Log the mutation and variables for debugging
    console.log("GraphQL Mutation:", mutation);
    console.log("Variables:", { 
      first_name, 
      middle_name, 
      last_name, 
      email, 
      password: hashedPassword, 
      phone_no, 
      gender, 
      dob, 
      country, 
      city, 
      user_type 
    });

    // Send GraphQL mutation to Hasura
    const response = await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: mutation,
        variables: { 
          first_name, 
          middle_name, 
          last_name, 
          email, 
          password: hashedPassword, 
          phone_no, 
          gender, 
          dob, 
          country, 
          city, 
          user_type,
          
        }
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

    const user = response.data.data?.insert_user_one;

    // Ensure user was successfully created
    if (!user) {
      return res.status(400).json({ message: 'Failed to create user' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// LOGIN CONTROLLER (no changes)
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // GraphQL query to fetch user by email
    const query = `
      query ($email: String!) {
        user(where: {email: {_eq: $email}}) {
          user_id
          first_name
          last_name
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

    const user = response.data.data?.user[0]; // Check for the user in the response

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
    const token = jwt.sign({ id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error logging in' });
  }
};
