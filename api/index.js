const serverless = require('serverless-http');
const app = require('../server'); // nơi bạn export app

module.exports.handler = serverless(app);
