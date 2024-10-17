const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { JWT_SECRET } = require('../config/config');
const crypto = require('crypto'); // To generate OTPs

const HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN_SECRET = 'myadminsecretkey';
const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes

// Create a transporter for sending emails using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'natiabiy869@gmail.com',
    pass: 'nana@6554',
  },
});

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

    // GraphQL mutation to insert a new user
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
        }
      }
    `;

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
    };

    // Send GraphQL mutation to Hasura
    const response = await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: mutation,
        variables
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

    // Generate OTP
    const otp_code = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
    const expiration_date = new Date(Date.now() + OTP_EXPIRATION_TIME).toISOString();

    // Insert OTP into database
    const insertOTP = `
      mutation ($user_id: Int!, $otp_code: String!, $expiration_date: timestamptz!, $generated_at: timestamptz!) {
        insert_otp_one(object: {
          user_id: $user_id,
          otp_code: $otp_code,
          expiration_date: $expiration_date,
          generated_at: $generated_at
        }) {
          otp_id
        }
      }
    `;

    await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: insertOTP,
        variables: {
          user_id: user.user_id,
          otp_code,
          expiration_date,
          generated_at: new Date().toISOString()
        }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    // Send OTP via email using NodeMailer
    const mailOptions = {
      from: 'natiabiy869@gmail.com',
      to: email,
      subject: 'Your OTP for Account Verification',
      text: `Dear ${first_name},\n\nYour OTP code for verifying your account is ${otp_code}. The OTP will expire in 10 minutes.\n\nBest regards,\nYour App Team`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending OTP email:', error);
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
      console.log('OTP email sent:', info.response);
    });

    res.status(201).json({ message: 'User registered successfully. OTP sent to email.', user_id: user.user_id });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// LOGIN CONTROLLER
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

    const user = response.data.data?.user[0];

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare password with hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);

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
