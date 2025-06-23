require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const movieRouter = require('./src/routes/movieRoutes');
const authRouter = require('./src/routes/authRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const showtimeRoutes = require('./src/routes/showTimeRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');

const app = express();

// ✅ CORS an toàn + hỗ trợ credentials
const allowedOrigins = [
  'http://localhost:5173',
  'https://cinema-manager-fe.vercel.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// ✅ Xử lý preflight request (OPTIONS)
app.options('*', cors());

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/movies', movieRouter);
app.use('/api/rooms', roomRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/tickets', ticketRoutes);

// DB Connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(err));

// Export app cho Vercel
module.exports = app;
