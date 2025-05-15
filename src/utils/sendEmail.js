const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // filepath: e:\FPT project\CinemaManager_BE\src\utils\sendEmail.js
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true nếu port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Cấu hình email gửi đi
  const mailOptions = {
    from: `"Cinema Manager" <${process.env.EMAIL_FROM}>`, // tên + email gửi đi
    to: options.to,
    subject: options.subject,
    text: options.text,
  };

  // Gửi mail
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
