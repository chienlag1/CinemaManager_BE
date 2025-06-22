const express = require('express');
const {
  protect,
  restrictTo,
  getMe,
  syncUserFromFrontend,
} = require('../controllers/authController');

const router = express.Router();

// ✅ Lấy thông tin user hiện tại (xác thực cần token)
router.get('/me', protect, getMe);

// ✅ Tạo hoặc cập nhật user từ frontend (không cần token)
router.post('/me', syncUserFromFrontend);

module.exports = router;
