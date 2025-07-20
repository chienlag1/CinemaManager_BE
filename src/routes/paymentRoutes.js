const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../controllers/authController');

// Thanh toán
router.post('/create-and-pay', protect, paymentController.createAndPayTicket);
router.get('/return', paymentController.handlePaymentReturn);
router.get('/cancel', paymentController.handlePaymentCancel);

module.exports = router;
