const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/user');

// Đồng bộ Clerk user vào MongoDB
async function syncClerkUserToMongo(clerkUserId) {
  try {
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
  } catch (error) {
    console.error('❌ Error in syncClerkUserToMongo:', error);
    throw error;
  }
}

// Middleware xác thực Clerk
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Xác thực token với Clerk
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
    console.error('❌ GetMe error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// POST /api/me - Tạo/đồng bộ user từ FE (KHÔNG CẦN TOKEN)
const syncUserFromFrontend = async (req, res) => {
  try {
    console.log('📝 Sync request body:', req.body);

    const { clerkUserId, name, email, emailVerified, role } = req.body;

    // Validate dữ liệu đầu vào
    if (!clerkUserId || !email) {
      console.log('❌ Missing required fields:', { clerkUserId, email });
      return res.status(400).json({
        message: 'Thiếu thông tin user',
        required: ['clerkUserId', 'email'],
      });
    }

    // Tìm user trong database
    let user = await User.findOne({ clerkUserId });
    console.log('🔍 Existing user:', user ? 'Found' : 'Not found');

    if (!user) {
      // Tạo user mới
      user = await User.create({
        clerkUserId,
        name: name || '',
        email,
        emailVerified: emailVerified || false,
        role: role || 'user',
      });
      console.log('✅ User created:', user.email);
    } else {
      // Cập nhật user hiện có
      user.name = name || user.name;
      user.email = email;
      user.emailVerified =
        emailVerified !== undefined ? emailVerified : user.emailVerified;
      if (role) user.role = role;

      await user.save();
      console.log('✅ User updated:', user.email);
    }

    res.status(200).json({
      success: true,
      user,
      message: user.isNew
        ? 'User created successfully'
        : 'User updated successfully',
    });
  } catch (error) {
    console.error('❌ Sync error:', error);

    // Chi tiết lỗi để debug
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        errors: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {}),
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email đã tồn tại trong hệ thống',
      });
    }

    res.status(500).json({
      message: 'Lỗi máy chủ',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Internal server error',
    });
  }
};

module.exports = {
  protect,
  restrictTo,
  getMe,
  syncUserFromFrontend,
};
