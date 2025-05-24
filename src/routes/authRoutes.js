const express = require('express');
const { protect, restrictTo, getMe } = require('../controllers/authController');
const router = express.Router();

// Route GET để lấy thông tin user (đã có)
router.get('/me', protect, getMe);

// ✅ Route POST để đồng bộ user từ FE gửi lên (dành cho SyncClerkUser.tsx)
router.post('/me', async (req, res) => {
  try {
    const { clerkUserId, name, email, emailVerified, role } = req.body;
    if (!clerkUserId || !email) {
      return res.status(400).json({ message: 'Thiếu thông tin user' });
    }

    let user = await User.findOne({ clerkUserId });

    if (!user) {
      user = await User.create({
        clerkUserId,
        name,
        email,
        emailVerified,
        role: role || 'user', // Ưu tiên role từ FE nếu có
      });
    } else {
      user.name = name;
      user.email = email;
      user.emailVerified = emailVerified;
      if (role) user.role = role; // Cập nhật role nếu có
      await user.save();
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

module.exports = router;
