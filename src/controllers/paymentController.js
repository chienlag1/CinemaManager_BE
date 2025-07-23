const Ticket = require('../models/ticket');
const PayOS = require('@payos/node');

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

exports.createAndPayTicket = async (req, res) => {
  try {
    console.log('📥 req.body (createAndPayTicket):', req.body);

    // Bạn không cần nhận returnUrl và cancelUrl từ req.body nữa
    // vì chúng ta sẽ lấy CLIENT_URL từ biến môi trường
    const { showtime, seats, totalPrice } = req.body;
    const showtimeId = showtime; // Kiểm tra dữ liệu bắt buộc

    if (!showtimeId)
      return res.status(400).json({ message: 'Thiếu showtimeId' });
    if (!seats?.length)
      return res.status(400).json({ message: 'Chưa chọn ghế ngồi' });
    if (!totalPrice)
      return res.status(400).json({ message: 'Tổng tiền không hợp lệ' }); // Tạo ticket ban đầu với trạng thái unpaid
    // if (!returnUrl) return res.status(400).json({ message: 'Thiếu returnUrl' }); // Không cần kiểm tra này nữa

    const newTicket = await Ticket.create({
      user: req.user._id,
      showtime: showtimeId,
      seats,
      totalPrice,
      status: 'unpaid',
    });
    console.log(
      `🎫 New ticket created with ID: ${newTicket._id}, status: ${newTicket.status}`
    ); // Sinh orderCode từ _id ticket

    const orderCode = parseInt(newTicket._id.toString().slice(-8), 16);

    // Lấy CLIENT_URL từ biến môi trường
    const clientUrl = process.env.CLIENT_URL;

    // Đảm bảo CLIENT_URL được định nghĩa
    if (!clientUrl) {
      console.error('❌ CLIENT_URL is not defined in environment variables.');
      return res
        .status(500)
        .json({ message: 'Server configuration error: CLIENT_URL not set.' });
    } // Tạo link thanh toán

    const paymentLinkRes = await payos.createPaymentLink({
      orderCode,
      amount: totalPrice,
      description: `VeXemPhim-${orderCode}`, 
      returnUrl: `${clientUrl}/payment-success?ticketId=${newTicket._id}&status=PAID&code=00&orderCode=${orderCode}`, 
      cancelUrl: `${clientUrl}/payment-cancel?ticketId=${newTicket._id}&status=CANCELLED&code=01&orderCode=${orderCode}`,
    });
    console.log(
      `🔗 PayOS payment link generated: ${paymentLinkRes.checkoutUrl}`
    );

    return res.status(201).json({
      ticket: newTicket,
      checkoutUrl: paymentLinkRes.checkoutUrl,
    });
  } catch (error) {
    console.error(
      '❌ Error in createAndPayTicket:',
      error?.response?.data || error.message || error
    );
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.handlePaymentReturn = async (req, res) => {
  try {
    // Lấy TẤT CẢ các tham số mà PayOS gửi về từ returnUrl đã cấu hình
    const { ticketId, status, code, orderCode } = req.query;
    console.log(
      `🔄 handlePaymentReturn received: ticketId=${ticketId}, status=${status}, code=${code}, orderCode=${orderCode}`
    );

    if (!ticketId) {
      console.log('⚠️ Missing ticketId in handlePaymentReturn query.');
      return res.status(400).json({ message: 'Missing ticketId' });
    }

    // Chỉ cập nhật trạng thái vé là 'paid' nếu thanh toán thành công (status=PAID và code=00)
    if (status === 'PAID' && code === '00') {
      const updatedTicket = await Ticket.findByIdAndUpdate(
        ticketId,
        { status: 'paid' },
        { new: true }
      );
      if (updatedTicket) {
        console.log(
          `✅ Ticket ${ticketId} status updated to 'paid'. Current status: ${updatedTicket.status}`
        );
      } else {
        console.log(`⚠️ Ticket ${ticketId} not found or not updated.`);
      }
    } else {
      console.log(
        `❌ Payment status not 'PAID' (actual: ${status}) or code not '00' (actual: ${code}) for ticket ${ticketId}. Status not updated.`
      );
    }
    res.redirect(
      `/payment-success?ticketId=${ticketId}&status=${status}&code=${code}&orderCode=${orderCode}`
    );
  } catch (error) {
    console.error('❌ Lỗi khi xử lý PayOS return URL:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.handlePaymentCancel = async (req, res) => {
  try {
    const { ticketId, status, code, orderCode } = req.query; // Lấy thêm status, code, orderCode
    console.log(
      `🚫 handlePaymentCancel received: ticketId=${ticketId}, status=${status}, code=${code}, orderCode=${orderCode}`
    );

    if (ticketId) {
      // Xoá ticket nếu huỷ thanh toán
      await Ticket.findByIdAndDelete(ticketId);
      console.log(`🗑️ Ticket ${ticketId} deleted due to payment cancellation.`);
    } else {
      console.log('⚠️ No ticketId found in handlePaymentCancel query.');
    }
    // Redirect sang front-end
    res.redirect(
      `/payment-cancel?ticketId=${ticketId || ''}&status=${
        status || 'CANCELLED'
      }&code=${code || '01'}&orderCode=${orderCode || ''}`
    );
  } catch (error) {
    console.error('❌ Lỗi khi xử lý Payment cancel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
