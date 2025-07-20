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

    const newTicket = await Ticket.create({
      user: req.user._id,
      showtime: showtimeId,
      seats,
      totalPrice,
      status: 'unpaid',
    });

    const orderCode = parseInt(newTicket._id.toString().slice(-8), 16);

    const paymentLinkRes = await payos.createPaymentLink({
      orderCode,
      amount: totalPrice,
      description: `VeXemPhim-${orderCode}`,
      returnUrl: `${returnUrl}?ticketId=${newTicket._id}&status=success&orderCode=${orderCode}`,
      cancelUrl: `${cancelUrl || returnUrl}?ticketId=${
        newTicket._id
      }&status=failed`,
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
    const { ticketId } = req.query;

    if (!ticketId) {
      return res.status(400).json({ message: 'Missing ticketId' });
    }

    await Ticket.findByIdAndUpdate(ticketId, { status: 'paid' });

    res.redirect(`/payment-success?ticketId=${ticketId}`);
  } catch (error) {
    console.error('Payment return error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.handlePaymentCancel = async (req, res) => {
  try {
    const { ticketId } = req.query;

    if (ticketId) {
      await Ticket.findByIdAndDelete(ticketId);
    }

    res.redirect(`/payment-cancel?ticketId=${ticketId || ''}`);
  } catch (error) {
    console.error('Payment cancel error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
