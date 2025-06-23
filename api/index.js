const serverless = require('serverless-http');
const app = require('../app'); // nơi bạn export app

module.exports.handler = serverless(app);
