const express = require('express');
const {
  createTicket,
  getAllTickets,
  getUserTickets,
  getTicketById,
  updateTicketStatus,
  deleteTicket,
} = require('../controllers/ticketController');
const { protect, restrictTo } = require('../controllers/authController');
const router = express.Router();

// Routes cho người dùng đặt vé và xem vé của họ
router
  .route('/')
  .post(protect, createTicket) // Người dùng đặt vé
  .get(protect, getUserTickets); // Người dùng xem vé của họ

// Admin có thể xem tất cả vé và quản lý vé
router.route('/admin').get(protect, restrictTo('admin'), getAllTickets);

router
  .route('/:id')
  .get(protect, getTicketById) // Người dùng xem vé của mình, Admin xem bất kỳ vé nào
  .put(protect, restrictTo('admin'), updateTicketStatus) // Admin cập nhật trạng thái vé
  .delete(protect, restrictTo('admin'), deleteTicket); // Admin xóa vé

module.exports = router;
