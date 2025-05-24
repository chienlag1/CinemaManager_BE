const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/user');

async function syncClerkUserToMongo(clerkUserId) {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  if (!clerkUser) return null;

  let user = await User.findOne({ clerkUserId });

  // Lấy role từ publicMetadata Clerk, nếu không có thì giữ nguyên role cũ hoặc mặc định là 'user'
  const roleFromClerk = clerkUser.publicMetadata?.role;
  const userData = {
    clerkUserId,
    name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim(),
    email: clerkUser.emailAddresses[0]?.emailAddress,
    role: roleFromClerk || (user ? user.role : 'user'),
    emailVerified:
      clerkUser.emailAddresses[0]?.verification?.status === 'verified',
  };

  if (!user) {
    user = await User.create(userData);
  } else {
    Object.assign(user, userData);
    await user.save();
  }

  return user;
}

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Received token:', token);

    const { userId } = await clerkClient.verifyToken(token);
    console.log('Verified Clerk userId:', userId);

    if (!userId) {
      console.log('Invalid token');
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await syncClerkUserToMongo(userId);
    console.log('Synced user:', user);

    if (!user) {
      console.log('User not found after sync');
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Error in protect middleware:', err);
    res.status(401).json({ message: 'Unauthorized' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
