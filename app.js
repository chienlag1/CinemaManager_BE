require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const movieRouter = require('./src/routes/movieRoutes');
const authRouter = require('./src/routes/authRoutes');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/movies', movieRouter);
app.use('/api/auth', authRouter);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => console.error(err));
module.exports = app;
