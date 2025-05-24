// controllers/authController.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/user');
const sendEmail = require('../utils/sendEmail');

// Tạo token JWT
const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

// Đồng bộ user Clerk vào MongoDB (dùng ở mọi nơi cần user)
async function syncClerkUserToMongo(clerkUserId) {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  if (!clerkUser) return null;

  let user = await User.findOne({ clerkUserId });
  if (!user) {
    user = await User.create({
      clerkUserId,
      name: clerkUser.firstName || '',
      email: clerkUser.emailAddresses[0]?.emailAddress,
      role: clerkUser.publicMetadata?.role || 'user',
      emailVerified:
        clerkUser.emailAddresses[0]?.verification?.status === 'verified',
    });
  } else {
    // Optionally update info if changed
    user.name = clerkUser.firstName || '';
    user.email = clerkUser.emailAddresses[0]?.emailAddress;
    user.role = clerkUser.publicMetadata?.role || 'user';
    user.emailVerified =
      clerkUser.emailAddresses[0]?.verification?.status === 'verified';
    await user.save();
  }
  return user;
}

// Middleware bảo vệ route, xác thực Clerk JWT
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const { userId } = await clerkClient.verifyToken(token);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    // Đồng bộ user Clerk vào MongoDB
    const user = await syncClerkUserToMongo(userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Clerk protect error:', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// Lấy thông tin user đang đăng nhập (dùng cho /me)
const getMe = async (req, res) => {
  try {
    // req.user đã được attach từ middleware protect
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra' });
  }
};

// Đăng xuất (xoá cookie phía FE, hoặc FE tự xoá token)
const logoutUser = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
};

// Nếu cần phân quyền:
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
  getMe,
  logoutUser,
  restrictTo,
};
