const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Lấy thông tin user hiện tại
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin user:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Đăng xuất
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Đăng xuất thành công',
  });
};

module.exports = {
  getMe,
  logout,
  protect, // Re-export middleware nếu cần
  restrictTo,
};
