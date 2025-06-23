const serverless = require('serverless-http');
const app = require('../app');

module.exports = serverless(app); // ✅ Export đúng format Vercel yêu cầu
