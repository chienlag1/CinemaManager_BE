const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.loginUser);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);
router.get('/profile', authController.protect, authController.getMe);
router.get('/logout', authController.logoutUser);

router.patch(
  '/update-password',
  authController.protect,
  authController.updatePassword
);
module.exports = router;
