const express = require('express');
const {
  createShowtime,
  getAllShowtimes,
  getShowtimeById,
  updateShowtime,
  deleteShowtime,
} = require('../controllers/showtimeController');
const { protect, restrictTo } = require('../controllers/authController');
const router = express.Router();

router
  .route('/')
  .post(protect, restrictTo('admin'), createShowtime)
  .get(getAllShowtimes); // Người dùng và Admin đều có thể xem các suất chiếu

router
  .route('/:id')
  .get(getShowtimeById) // Người dùng và Admin đều có thể xem chi tiết suất chiếu
  .put(protect, restrictTo('admin'), updateShowtime)
  .delete(protect, restrictTo('admin'), deleteShowtime);

module.exports = router;
