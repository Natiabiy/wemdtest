const axios = require('axios');
const HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN_SECRET = 'myadminsecretkey';

// OTP VERIFICATION CONTROLLER
exports.verifyOTP = async (req, res) => {
  const { user_id, otp_code } = req.body;

  if (!user_id || !otp_code) {
    return res.status(400).json({ message: 'User ID and OTP are required.' });
  }

  try {
    // Query to fetch OTP details from the database
    const checkOTPQuery = `
      query ($user_id: Int!, $otp_code: String!) {
        otp(where: {user_id: {_eq: $user_id}, otp_code: {_eq: $otp_code}}) {
          otp_id
          expiration_date
          verified
        }
      }
    `;

    const otpResponse = await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: checkOTPQuery,
        variables: { user_id, otp_code }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    const otpRecord = otpResponse.data.data?.otp[0];

    // If OTP is not found
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // Check if OTP is already verified
    if (otpRecord.verified) {
      return res.status(400).json({ message: 'OTP has already been used.' });
    }

    // Check if OTP has expired
    const currentTime = new Date().toISOString();
    if (currentTime > otpRecord.expiration_date) {
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    // Mark OTP as verified
    const updateOTPMutation = `
      mutation ($otp_id: Int!) {
        update_otp_by_pk(pk_columns: {otp_id: $otp_id}, _set: {verified: true}) {
          otp_id
          verified
        }
      }
    `;

    await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: updateOTPMutation,
        variables: { otp_id: otpRecord.otp_id }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    // Optional: Update user status to 'verified' if needed

    res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};
