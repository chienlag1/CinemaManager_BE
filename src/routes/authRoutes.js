const express = require('express');
const {
  protect,
  restrictTo,
  getMe,
  syncUserFromFrontend,
} = require('../controllers/authController');

const router = express.Router();

// ✅ Cho phép preflight OPTIONS cho route /me
router.options('/me', (req, res) => {
  res.sendStatus(200); // Trả về OK cho preflight từ browser hoặc Clerk
});

// ✅ Lấy thông tin user hiện tại (cần xác thực)
router.get('/me', protect, getMe);

// ✅ Tạo hoặc cập nhật user từ frontend (không cần token)
router.post('/me', syncUserFromFrontend);

module.exports = router;
