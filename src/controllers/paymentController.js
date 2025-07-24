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
    const { showtime, seats, totalPrice } = req.body;
    const showtimeId = showtime; 

    if (!showtimeId)
      return res.status(400).json({ message: 'Thiếu showtimeId' });
    if (!seats?.length)
      return res.status(400).json({ message: 'Chưa chọn ghế ngồi' });
    if (!totalPrice)
      return res.status(400).json({ message: 'Tổng tiền không hợp lệ' }); 
    const newTicket = await Ticket.create({
      user: req.user._id,
      showtime: showtimeId,
      seats,
      totalPrice,
      status: 'unpaid',
    });
    console.log(
      `🎫 New ticket created with ID: ${newTicket._id}, status: ${newTicket.status}`
    ); 
    const orderCode = parseInt(newTicket._id.toString().slice(-8), 16);
    const clientUrl = process.env.CLIENT_URL;
    if (!clientUrl) {
      console.error('❌ CLIENT_URL is not defined in environment variables.');
      return res
        .status(500)
        .json({ message: 'Server configuration error: CLIENT_URL not set.' });
    } 
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

    const { ticketId, status, code, orderCode } = req.query;
    console.log(
      `🔄 handlePaymentReturn received: ticketId=${ticketId}, status=${status}, code=${code}, orderCode=${orderCode}`
    );

    if (!ticketId) {
      console.log('⚠️ Missing ticketId in handlePaymentReturn query.');
      return res.status(400).json({ message: 'Missing ticketId' });
    }

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
      `${clientUrl}/payment-success?ticketId=${ticketId}&status=${status}&code=${code}&orderCode=${orderCode}`
    );
  } catch (error) {
    console.error('❌ Lỗi khi xử lý PayOS return URL:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.handlePaymentCancel = async (req, res) => {
  try {
    const { ticketId, status, code, orderCode } = req.query; 
    console.log(
      `🚫 handlePaymentCancel received: ticketId=${ticketId}, status=${status}, code=${code}, orderCode=${orderCode}`
    );

    if (ticketId) {

      await Ticket.findByIdAndDelete(ticketId);
      console.log(`🗑️ Ticket ${ticketId} deleted due to payment cancellation.`);
    } else {
      console.log('⚠️ No ticketId found in handlePaymentCancel query.');
    }

    res.redirect(
      `${clientUrl}/payment-cancel?ticketId=${ticketId || ''}&status=${
        status || 'CANCELLED'
      }&code=${code || '01'}&orderCode=${orderCode || ''}`
    );
  } catch (error) {
    console.error('❌ Lỗi khi xử lý Payment cancel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
