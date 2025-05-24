const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/user');

// Đồng bộ user từ Clerk sang MongoDB
async function syncClerkUserToMongo(clerkUserId) {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if (!clerkUser) return null;

    const userData = {
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      email: clerkUser.emailAddresses[0]?.emailAddress,
      role: clerkUser.publicMetadata?.role || 'user',
      emailVerified:
        clerkUser.emailAddresses[0]?.verification?.status === 'verified',
    };

    let user = await User.findOneAndUpdate({ clerkUserId }, userData, {
      new: true,
      upsert: true,
    });

    return user;
  } catch (error) {
    console.error('Lỗi đồng bộ user:', error);
    return null;
  }
}

// Middleware xác thực chính
const protect = async (req, res, next) => {
  try {
    // 1. Kiểm tra header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    // 2. Lấy và xác thực token
    const token = authHeader.split(' ')[1];
    const { userId } = await clerkClient.verifyToken(token);
    if (!userId) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    // 3. Đồng bộ user
    const user = await syncClerkUserToMongo(userId);
    if (!user) {
      return res.status(401).json({ message: 'Không tìm thấy user' });
    }

    // 4. Gắn user vào request
    req.user = user;
    next();
  } catch (err) {
    console.error('Lỗi xác thực:', err);
    res.status(401).json({ message: 'Phiên đăng nhập hết hạn' });
  }
};

// Middleware phân quyền
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập tính năng này',
      });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
  syncClerkUserToMongo,
};
