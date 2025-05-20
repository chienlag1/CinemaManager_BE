// middlewares/roleMiddleware.js
const requireRole = (role) => {
  return (req, res, next) => {
    const user = req.auth?.sessionClaims;
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const userRole = user?.publicMetadata?.role;
    if (userRole !== role) {
      return res
        .status(403)
        .json({ message: 'Access denied: insufficient role' });
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireAdmin: requireRole('admin'),
  requireUser: requireRole('user'),
};
