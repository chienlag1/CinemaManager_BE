const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user');
const sendEmail = require('../utils/sendEmail'); // Giả sử bạn có helper gửi mail

// Tạo token JWT
const signToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Middleware bảo vệ route, kiểm tra token và user
const protect = async (req, res, next) => {
  let token;

  // Lấy token từ header Authorization hoặc cookie
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
    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User không tồn tại' });
    }

    // Kiểm tra user có đổi mật khẩu sau khi token được tạo không
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10
      );
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu đã được thay đổi, vui lòng đăng nhập lại',
        });
      }
    }

    req.user = user; // gán user vào request để dùng ở middleware tiếp theo
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: 'Token không hợp lệ' });
  }
};

// Đăng ký user
const register = async (req, res) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    if (!name || !email || !password || !passwordConfirm) {
      return res
        .status(400)
        .json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    if (password !== passwordConfirm) {
      return res
        .status(400)
        .json({ success: false, message: 'Mật khẩu xác nhận không khớp' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: 'Email đã được đăng ký' });
    }

    // Tạo token xác thực email
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

    // Hash mật khẩu trước khi lưu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password,
      passwordConfirm,
      emailVerifyToken,
      emailVerifyExpires,
      emailVerified: false,
      role: 'user',
    });

    await newUser.save();

    // Gửi email xác thực
    const verifyURL = `${req.protocol}://${req.get(
      'host'
    )}/api/auth/verify-email/${emailVerifyToken}`;

    const message = `Vui lòng xác thực email bằng cách nhấn vào link sau:\n\n${verifyURL}\n\nLink có hiệu lực trong 24 giờ.`;

    try {
      await sendEmail({
        to: newUser.email,
        subject: 'Xác thực email của bạn',
        text: message,
      });

      res.status(201).json({
        success: true,
        message:
          'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
      });
    } catch (err) {
      console.error('Send email error:', err); // Log chi tiết lỗi gửi mail
      // Nếu gửi email thất bại, xóa user vừa tạo
      await User.findByIdAndDelete(newUser._id);
      return res
        .status(500)
        .json({
          success: false,
          message: 'Không thể gửi email xác thực',
          error: err.message,
        });
    }
  } catch (error) {
    console.error('Register error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Đã có lỗi xảy ra khi đăng ký' });
  }
};

// Xác thực email
const verifyEmail = async (req, res) => {
  try {
    const token = req.params.token;

    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token xác thực không hợp lệ hoặc đã hết hạn',
      });
    }

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;

    await user.save();

    res
      .status(200)
      .json({ success: true, message: 'Xác thực email thành công' });
  } catch (error) {
    console.error('Verify email error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Đã có lỗi xảy ra khi xác thực email' });
  }
};

// Đăng nhập user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
    }

    const user = await User.findOne({ email }).select(
      '+password +emailVerified'
    );
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác',
      });
    }

    if (!user.emailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng xác thực email trước khi đăng nhập',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác',
      });
    }

    const token = signToken(user._id, user.role);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Đã có lỗi xảy ra khi đăng nhập' });
  }
};

// Đăng xuất
const logoutUser = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
};

// Quên mật khẩu - gửi email reset
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: 'Vui lòng nhập email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy user với email này' });
    }

    // Tạo token reset mật khẩu
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 phút
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/auth/reset-password/${resetToken}`;
    const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu của tài khoản.\n\n
    Vui lòng nhấn vào link sau để đặt lại mật khẩu (link có hiệu lực trong 10 phút):\n\n${resetURL}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Đặt lại mật khẩu',
        text: message,
      });

      res.status(200).json({
        success: true,
        message: 'Email đặt lại mật khẩu đã được gửi.',
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi email đặt lại mật khẩu',
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra' });
  }
};

// Reset mật khẩu
const resetPassword = async (req, res) => {
  try {
    const resetToken = req.params.token;
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      });
    }

    const { password, passwordConfirm } = req.body;
    if (!password || !passwordConfirm) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu mới và xác nhận',
      });
    }
    if (password !== passwordConfirm) {
      return res
        .status(400)
        .json({ success: false, message: 'Mật khẩu xác nhận không khớp' });
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();

    await user.save();

    res
      .status(200)
      .json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra' });
  }
};

// Cập nhật mật khẩu (user đang login)
const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    const { currentPassword, newPassword, newPasswordConfirm } = req.body;

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      return res
        .status(400)
        .json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    if (newPassword !== newPasswordConfirm) {
      return res
        .status(400)
        .json({ success: false, message: 'Mật khẩu mới xác nhận không khớp' });
    }

    user.passwordChangedAt = Date.now();

    await user.save();

    res
      .status(200)
      .json({ success: true, message: 'Cập nhật mật khẩu thành công' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra' });
  }
};

// Lấy thông tin user đang login
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy user' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra' });
  }
};

module.exports = {
  register,
  loginUser,
  logoutUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
  getMe,
};
