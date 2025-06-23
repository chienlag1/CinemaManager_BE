require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // ✅ Thêm thư viện cors

// Import routes
const movieRouter = require('./src/routes/movieRoutes');
const authRouter = require('./src/routes/authRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const showtimeRoutes = require('./src/routes/showTimeRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');

const app = express();

// ✅ Danh sách origin được phép truy cập
const allowedOrigins = [
  'http://localhost:5173',
  'https://cinema-manager-fe.vercel.app',
];

// ✅ CORS middleware dùng chính thống cho serverless
app.use(
  cors({
    origin: function (origin, callback) {
      // Cho phép cả request không có origin (như từ server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// ✅ Middleware parse JSON
app.use(express.json());

// ✅ Các route chính
app.use('/api/auth', authRouter);
app.use('/api/movies', movieRouter);
app.use('/api/rooms', roomRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/tickets', ticketRoutes);

// ✅ Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

module.exports = app;
