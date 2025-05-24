const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const authRoutes = require('./src/routes/authRoutes');
const webhookRouter = require('./src/routes/webhook');
const cors = require('cors');

require('dotenv').config();

const app = express();

app.use(
  cors({
    origin: '*',
    credentials: true, // nếu frontend cần gửi cookie hoặc header Authorization
  })
);
app.use(express.json());
app.use(cookieParser());
app.use('/webhook', webhookRouter);
app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API route không tồn tại' });
});

// Kết nối MongoDB khi khởi động server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Kết nối MongoDB thành công');
  })
  .catch((err) => {
    console.error('Kết nối MongoDB thất bại:', err);
  });

module.exports = app;
