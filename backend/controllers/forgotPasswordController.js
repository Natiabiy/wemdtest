const crypto = require('crypto');
const nodemailer = require('nodemailer'); // For sending emails

// FORGOT PASSWORD CONTROLLER
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const query = `
      query ($email: String!) {
        Users(where: {email: {_eq: $email}}) {
          id
          email
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

    const user = response.data.data?.Users[0];

    // If user doesn't exist
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Save token to the database (store hashed token for security)
    const mutation = `
      mutation ($userId: uuid!, $resetToken: String!) {
        update_Users_by_pk(pk_columns: {id: $userId}, _set: {reset_token: $resetToken, reset_token_expiry: ${Date.now() + 3600000}}) {
          id
        }
      }
    `;

    await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: mutation,
        variables: { userId: user.id, resetToken: resetToken }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    // Send the reset token via email (using nodemailer)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password',
      },
    });

    const resetUrl = `http://localhost:5000/api/auth/resetPassword/${resetToken}`;

    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click here to reset your password: ${resetUrl}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: 'Error sending email' });
      }
      res.status(200).json({ message: 'Password reset link sent to your email' });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing password reset' });
  }
};

// RESET PASSWORD CONTROLLER
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // GraphQL query to get user by reset token and check if it's expired
    const query = `
      query ($resetToken: String!) {
        Users(where: {reset_token: {_eq: $resetToken}, reset_token_expiry: {_gte: "${Date.now()}"}}) {
          id
          reset_token_expiry
        }
      }
    `;

    const response = await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query,
        variables: { resetToken: token }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    const user = response.data.data?.Users[0];

    // If token is invalid or expired
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update the user's password
    const mutation = `
      mutation ($userId: uuid!, $password: String!) {
        update_Users_by_pk(pk_columns: {id: $userId}, _set: {password: $password, reset_token: null, reset_token_expiry: null}) {
          id
        }
      }
    `;

    await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: mutation,
        variables: { userId: user.id, password: hashedPassword }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

