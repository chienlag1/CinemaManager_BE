const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { Clerk } = require('@clerk/clerk-sdk-node'); // Bỏ comment dòng này

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'Bạn chưa đăng nhập' });
  }

  try {
    // Giải mã token Clerk (không cần secret nếu chỉ decode)
    const decoded = jwt.decode(token);

    // Lấy userId từ token Clerk
    const clerkUserId = decoded.sub; // hoặc decoded.id tùy cấu trúc token Clerk

    // Lấy thông tin user từ Clerk
    const clerkUser = await Clerk.users.getUser(clerkUserId);

    // Tìm user trong MongoDB
    let currentUser = await User.findOne({ clerkUserId });

    // Nếu chưa có thì tạo mới
    if (!currentUser && clerkUser) {
      currentUser = await User.create({
        clerkUserId,
        name: clerkUser.firstName || '',
        email: clerkUser.emailAddresses[0]?.emailAddress,
        role: clerkUser.publicMetadata?.role || 'user',
        emailVerified: clerkUser.emailAddresses[0]?.verified,
      });
    }

    if (!currentUser) {
      return res
        .status(401)
        .json({ success: false, message: 'Người dùng không tồn tại' });
    }

    req.user = currentUser;
    next();
  } catch (err) {
    res
      .status(401)
      .json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chức năng này',
      });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
