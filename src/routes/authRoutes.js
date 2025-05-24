const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { getMe, logout } = require('../controllers/authController');

// Public routes (nếu có)

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Admin-only routes
router.get('/admin', protect, restrictTo('admin'), (req, res) => {
  res.json({ message: 'Khu vực quản trị' });
});

// User routes
router.get('/dashboard', protect, restrictTo('user', 'admin'), (req, res) => {
  res.json({ message: `Xin chào ${req.user.name}` });
});

module.exports = router;
