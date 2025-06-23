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

// Danh sách domain được phép gọi API
const allowedOrigins = [
  'http://localhost:5173',
  'https://cinema-manager-fe.vercel.app',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  } else {
    res.status(403).send('Not allowed by CORS');
  }
});

// Middleware
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

// Export app cho serverless
module.exports = app;
