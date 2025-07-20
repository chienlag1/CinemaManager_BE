// src/controllers/paymentController.js

const Ticket = require('../models/ticket');
const PayOS = require('@payos/node');

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

exports.createAndPayTicket = async (req, res) => {
  try {
    console.log('📥 req.body:', req.body);

    const { showtime, seats, totalPrice, returnUrl, cancelUrl } = req.body;
    const showtimeId = showtime;

    // Kiểm tra dữ liệu bắt buộc
    if (!showtimeId)
      return res.status(400).json({ message: 'Thiếu showtimeId' });
    if (!seats?.length)
      return res.status(400).json({ message: 'Chưa chọn ghế ngồi' });
    if (!totalPrice)
      return res.status(400).json({ message: 'Tổng tiền không hợp lệ' });
    if (!returnUrl) return res.status(400).json({ message: 'Thiếu returnUrl' });

    // Tạo ticket ban đầu với trạng thái unpaid
    const newTicket = await Ticket.create({
      user: req.user._id,
      showtime: showtimeId,
      seats,
      totalPrice,
      status: 'unpaid',
    });

    // Sinh orderCode từ _id ticket
    const orderCode = parseInt(newTicket._id.toString().slice(-8), 16);

    // Tạo link thanh toán
    const paymentLinkRes = await payos.createPaymentLink({
      orderCode,
      amount: totalPrice,
      description: `VeXemPhim-${orderCode}`,
      // Khi khách thanh toán xong, PayOS redirect về đây kèm status=PAID&code=00
      returnUrl: `${returnUrl}?ticketId=${newTicket._id}&status=PAID&code=00&orderCode=${orderCode}`,
      // Khi khách huỷ hoặc lỗi, redirect về đây với status=CANCELLED&code=01
      cancelUrl: `${cancelUrl || returnUrl}?ticketId=${
        newTicket._id
      }&status=CANCELLED&code=01&orderCode=${orderCode}`,
    });

    return res.status(201).json({
      ticket: newTicket,
      checkoutUrl: paymentLinkRes.checkoutUrl,
    });
  } catch (error) {
    console.error(
      '❌ Error in createAndPayTicket:',
      error?.response?.data || error
    );
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.handlePaymentReturn = async (req, res) => {
  try {
    // Lấy TẤT CẢ các tham số mà PayOS gửi về từ returnUrl đã cấu hình
    const { ticketId, status, code, orderCode } = req.query;

    if (!ticketId) {
      // Giữ kiểm tra này để đảm bảo có ticketId
      return res.status(400).json({ message: 'Missing ticketId' });
    }

    // Chỉ cập nhật trạng thái vé là 'paid' nếu thanh toán thành công (status=PAID và code=00)
    if (status === 'PAID' && code === '00') {
      await Ticket.findByIdAndUpdate(ticketId, { status: 'paid' });
    }

    // Chuyển hướng về frontend, đảm bảo truyền ĐẦY ĐỦ tất cả các tham số
    res.redirect(
      `/payment-success?ticketId=${ticketId}&status=${status}&code=${code}&orderCode=${orderCode}`
    );
  } catch (error) {
    console.error('Lỗi khi xử lý PayOS return URL:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.handlePaymentCancel = async (req, res) => {
  try {
    const { ticketId } = req.query;
    if (ticketId) {
      // Xoá ticket nếu huỷ thanh toán
      await Ticket.findByIdAndDelete(ticketId);
    }
    // Redirect sang front-end
    res.redirect(
      `/payment-cancel?ticketId=${ticketId || ''}&status=CANCELLED&code=01`
    );
  } catch (error) {
    console.error('Payment cancel error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
