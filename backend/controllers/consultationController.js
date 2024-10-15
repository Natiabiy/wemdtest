const axios = require('axios');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

const HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN_SECRET = 'myadminsecretkey';

// Create Consultation Request
exports.createConsultationRequest = async (req, res) => {
  const { images, additional_info, chief_complaint } = req.body;

  // Decode the patient ID from the JWT token
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  const patient_id = decoded.id;

  // Validation check: Ensure all required fields are provided
  if (!images || !chief_complaint) {
    return res.status(400).json({ message: 'Images and chief complaint are required.' });
  }

  try {
    // GraphQL mutation to insert a new consultation request (without doctor_id initially)
    const mutation = `
      mutation ($patient_id: Int!, $images: String!, $additional_info: String, $chief_complaint: String!) {
        insert_consultation_request_one(object: {
          patient_id: $patient_id, 
          images: $images, 
          additional_info: $additional_info,
          chief_complaint: $chief_complaint,
          request_date: "now()",
          status: "pending"
        }) {
          CR_id
          patient_id
          images
          chief_complaint
        }
      }
    `;

    // Send GraphQL mutation to Hasura
    const response = await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: mutation,
        variables: { patient_id, images, additional_info, chief_complaint }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    const consultationRequest = response.data.data?.insert_consultation_request_one;

    // Ensure consultation request was successfully created
    if (!consultationRequest) {
      return res.status(400).json({ message: 'Failed to create consultation request' });
    }

    res.status(201).json({ consultationRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating consultation request' });
  }
};

// Update Doctor ID when a request is accepted
exports.assignDoctorToRequest = async (req, res) => {
  const { CR_id, doctor_id } = req.body;

  try {
    // Validation: Ensure both CR_id and doctor_id are provided
    if (!CR_id || !doctor_id) {
      return res.status(400).json({ message: 'CR_id and doctor_id are required.' });
    }

    // GraphQL mutation to update the consultation request with the doctor_id
    const mutation = `
      mutation ($CR_id: Int!, $doctor_id: Int!) {
        update_consultation_request_by_pk(pk_columns: {CR_id: $CR_id}, _set: {doctor_id: $doctor_id, status: "accepted"}) {
          CR_id
          doctor_id
          status
        }
      }
    `;

    // Send GraphQL mutation to Hasura
    const response = await axios.post(
      HASURA_GRAPHQL_URL,
      {
        query: mutation,
        variables: { CR_id, doctor_id }
      },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        }
      }
    );

    const updatedRequest = response.data.data?.update_consultation_request_by_pk;

    // Ensure consultation request was successfully updated
    if (!updatedRequest) {
      return res.status(400).json({ message: 'Failed to assign doctor to request' });
    }

    res.status(200).json({ updatedRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error assigning doctor to request' });
  }
};
