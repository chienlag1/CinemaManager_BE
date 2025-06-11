require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const movieRouter = require('./src/routes/movieRoutes');
const authRouter = require('./src/routes/authRoutes');

const roomRoutes = require('./src/routes/roomRoutes'); // Thêm roomRoutes
const showtimeRoutes = require('./src/routes/showTimeRoutes'); // Thêm showtimeRoutes
const ticketRoutes = require('./src/routes/ticketRoutes'); // Thêm ticketRoutes

const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/movies', movieRouter);
app.use('/api/rooms', roomRoutes); // Sử dụng roomRoutes
app.use('/api/showtimes', showtimeRoutes); // Sử dụng showtimeRoutes
app.use('/api/tickets', ticketRoutes); // Sử dụng ticketRoutes

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => console.error(err));
module.exports = app;
