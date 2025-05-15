const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

dotenv.config();

const app = express();

// Kết nối MongoDB
connectDB();

app.use(express.json());

// Sample route
app.get('/', (req, res) => {
  res.send('API is running...');
});

module.exports = app; // ✅ Phải export để www sử dụng
