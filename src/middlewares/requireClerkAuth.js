// middleware/requireClerkAuth.ts

const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/user');

const requireClerkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token and get Clerk user
    const { userId } = await clerkClient.verifyToken(token);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const clerkUser = await clerkClient.users.getUser(userId);

    // Check if user exists in MongoDB
    let localUser = await User.findOne({ clerkUserId: userId });

    if (!localUser) {
      // Optional: Only create user if they are verified
      if (
        !clerkUser.emailAddresses?.[0]?.verification ||
        clerkUser.emailAddresses[0].verification.status !== 'verified'
      ) {
        return res.status(403).json({ message: 'Email not verified' });
      }

      // Create user in MongoDB
      localUser = await User.create({
        clerkUserId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: clerkUser.firstName || '',
        role: 'user', // Or default role
        emailVerified: true,
      });
    }

    // Attach user to request
    req.user = localUser;

    next();
  } catch (err) {
    console.error('Clerk Auth Error:', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = { requireClerkAuth };
