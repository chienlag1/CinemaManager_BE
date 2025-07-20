const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { protect, restrictTo } = require('../controllers/authController');
const paymentController = require('../controllers/paymentController');
// CRUD ticket
router.post('/', protect, ticketController.createTicket);
router.get('/my', protect, ticketController.getUserTickets);
router.get('/:id', protect, ticketController.getTicketById);
router.get('/', protect, restrictTo('admin'), ticketController.getAllTickets);
router.patch(
  '/:id',
  protect,
  restrictTo('admin'),
  ticketController.updateTicketStatus
);
router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  ticketController.deleteTicket
);
router.post('/create-and-pay', protect, paymentController.createAndPayTicket);

module.exports = router;
