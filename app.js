require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./src/routes/authRoutes.js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => console.error(err));
module.exports = app;
