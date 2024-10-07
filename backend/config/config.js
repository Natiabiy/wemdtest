// config/config.js

require('dotenv').config();  // Load environment variables from .env file

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'VERY SECRET',  // Secret key for JWT
  HASURA_GRAPHQL_URL: process.env.HASURA_GRAPHQL_URL || 'http://localhost:8080/v1/graphql',  // Hasura GraphQL endpoint
  HASURA_ADMIN_SECRET: process.env.HASURA_ADMIN_SECRET || 'myadminsecretkey',  // Hasura Admin Secret
};
