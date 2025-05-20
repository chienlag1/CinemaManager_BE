const express = require('express');
const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.loginUser);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// Dùng xác thực nội bộ với JWT
router.get('/profile', authController.protect, authController.getMe);
router.get('/logout', authController.logoutUser);
router.patch(
  '/update-password',
  authController.protect,
  authController.updatePassword
);

// Dùng xác thực Clerk + phân quyền admin
router.get('/admin/dashboard', protect, restrictTo('admin'), (req, res) => {
  res.json({ message: 'Welcome admin!' });
});

module.exports = router;
