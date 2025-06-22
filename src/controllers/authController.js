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
      console.log('✅ User created in MongoDB:', user.email); // Giữ lại log này vì nó là thông báo thành công quan trọng
    } else {
      Object.assign(user, userData);
      await user.save();
      console.log('✅ User updated in MongoDB:', user.email); // Giữ lại log này vì nó là thông báo thành công quan trọng
    }

    return user;
  } catch (error) {
    console.error(
      '❌ Error in syncClerkUserToMongo:',
      error.message,
      error.stack
    );
    throw error;
  }
}

// Middleware xác thực Clerk
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ message: 'No token provided or invalid format' });
    }

    const token = authHeader.split(' ')[1];

    let userId;
    try {
      const verifiedToken = await clerkClient.verifyToken(token);
      // Lấy userId từ claim 'sub' (subject) của JWT
      userId = verifiedToken.sub;
    } catch (verifyError) {
      console.error('❌ Clerk Token Verification Failed:', verifyError.message);
      return res.status(401).json({
        message: 'Invalid or expired token',
        details: verifyError.message,
      });
    }

    if (!userId) {
      // Log này được giữ lại vì nó chỉ ra một trường hợp bất thường
      console.error(
        'userId is null/undefined after verification but no error was thrown.'
      );
      return res
        .status(401)
        .json({ message: 'Invalid token (userId missing)' });
    }

    const user = await syncClerkUserToMongo(userId);

    if (!user) {
      return res
        .status(401)
        .json({ message: 'User not found in database after sync' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('❌ General Auth Error:', err.message, err.stack);
    res.status(401).json({
      message: 'Unauthorized',
      details:
        err.message || 'An unknown error occurred during authentication.',
    });
  }
};

// Middleware phân quyền
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          message: 'Access denied: You do not have the necessary permissions.',
        });
    }
    next();
  };
};

// GET /api/me - Lấy thông tin user hiện tại
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(404)
        .json({
          success: false,
          message: 'User data not found in request context.',
        });
    }
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('❌ GetMe Handler Error:', error.message, error.stack);
    res.status(500).json({
      message: 'Server error retrieving user data',
      details: error.message,
    });
  }
};

// POST /api/me - Tạo/đồng bộ user từ FE (KHÔNG CẦN TOKEN)
const syncUserFromFrontend = async (req, res) => {
  try {
    const { clerkUserId, name, email, emailVerified, role } = req.body;

    if (!clerkUserId || !email) {
      return res.status(400).json({
        message: 'Thiếu thông tin user',
        required: ['clerkUserId', 'email'],
      });
    }

    let user = await User.findOne({ clerkUserId });

    if (!user) {
      user = await User.create({
        clerkUserId,
        name: name || '',
        email,
        emailVerified: emailVerified || false,
        role: role || 'user',
      });
      console.log('✅ User created:', user.email); // Giữ lại log này
    } else {
      user.name = name || user.name;
      user.email = email;
      user.emailVerified =
        emailVerified !== undefined ? emailVerified : user.emailVerified;
      if (role) user.role = role;

      await user.save();
      console.log('✅ User updated:', user.email); // Giữ lại log này
    }

    res.status(200).json({
      success: true,
      user,
      message: user.isNew
        ? 'User created successfully'
        : 'User updated successfully',
    });
  } catch (error) {
    console.error('❌ Sync error:', error.message, error.stack);

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
