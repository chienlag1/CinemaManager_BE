const express = require('express');
const {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
} = require('../controllers/roomController');
const { protect, restrictTo } = require('../controllers/authController');
const router = express.Router();

router
  .route('/')
  .post(protect, restrictTo('admin'), createRoom)
  .get(protect, restrictTo('admin'), getAllRooms); // Chỉ admin mới được xem tất cả phòng

router
  .route('/:id')
  .get(protect, restrictTo('admin'), getRoomById)
  .put(protect, restrictTo('admin'), updateRoom)
  .delete(protect, restrictTo('admin'), deleteRoom);

module.exports = router;
