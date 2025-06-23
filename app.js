require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const movieRouter = require('./src/routes/movieRoutes');
const authRouter = require('./src/routes/authRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const showtimeRoutes = require('./src/routes/showTimeRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');

// 1. Khởi tạo app
const app = express();

// 2. CORS config (chỉ giữ cái này thôi, đừng gọi lại `app.use(cors())` nữa)
app.use(cors({ origin: '*', credentials: true }));

// 3. Middleware
app.use(express.json());

// 4. Routes
app.use('/api/auth', authRouter);
app.use('/api/movies', movieRouter);
app.use('/api/rooms', roomRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/tickets', ticketRoutes);

// 5. MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => console.error(err));

// 6. Export app cho serverless / vercel
module.exports = app;
