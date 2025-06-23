require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const movieRouter = require('./src/routes/movieRoutes');
const authRouter = require('./src/routes/authRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const showtimeRoutes = require('./src/routes/showTimeRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');

const app = express();

// Danh sách origin được phép truy cập
const allowedOrigins = [
  'http://localhost:5173',
  'https://cinema-manager-fe.vercel.app',
];

// Middleware xử lý CORS & preflight OPTIONS
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] ||
        'Content-Type,Authorization'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Middleware parse JSON body
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/movies', movieRouter);
app.use('/api/rooms', roomRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/tickets', ticketRoutes);

// Connect DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(err));

module.exports = app;
