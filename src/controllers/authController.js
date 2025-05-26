const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/user');

// Đồng bộ Clerk user vào MongoDB
async function syncClerkUserToMongo(clerkUserId) {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  if (!clerkUser) return null;

  let user = await User.findOne({ clerkUserId });

  const userData = {
    clerkUserId,
    name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim(),
    email: clerkUser.emailAddresses[0]?.emailAddress,
    role: clerkUser.publicMetadata?.role || user?.role || 'user',
    emailVerified:
      clerkUser.emailAddresses[0]?.verification?.status === 'verified',
  };

  if (!user) {
    user = await User.create(userData);
    console.log('✅ User created in MongoDB:', user.email);
  } else {
    Object.assign(user, userData);
    await user.save();
    console.log('✅ User updated in MongoDB:', user.email);
  }

  return user;
}

// Middleware xác thực Clerk
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { userId } = await clerkClient.verifyToken(token);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await syncClerkUserToMongo(userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Auth error:', err);
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Middleware phân quyền
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

// GET /api/me - Lấy thông tin user hiện tại
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// POST /api/me - Tạo/đồng bộ user từ FE (dành cho frontend sync)
const syncUserFromFrontend = async (req, res) => {
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
        role: role || 'user',
      });
    } else {
      user.name = name;
      user.email = email;
      user.emailVerified = emailVerified;
      if (role) user.role = role;
      await user.save();
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

module.exports = {
  protect,
  restrictTo,
  getMe,
  syncUserFromFrontend,
};
