const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.protect = async (req, res, next) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

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
