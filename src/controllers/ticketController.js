const Ticket = require('../models/ticket');
const Showtime = require('../models/showTime');
const Room = require('../models/room'); // Cần Room để cập nhật trạng thái ghế trong Showtime

// Đặt vé (User)
const createTicket = async (req, res) => {
  try {
    const { showtimeId, seats } = req.body;
    const userId = req.user._id; // Lấy ID người dùng từ token đã xác thực

    if (!Array.isArray(seats) || seats.length === 0) {
      return res
        .status(400)
        .json({ message: 'Please select at least one seat.' });
    }

    const showtime = await Showtime.findById(showtimeId).populate('room');

    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found.' });
    }

    // Kiểm tra xem suất chiếu đã bắt đầu hoặc kết thúc chưa
    if (new Date() > showtime.startTime) {
      return res.status(400).json({
        message: 'Cannot book tickets for a showtime that has already started.',
      });
    }

    // Kiểm tra xem ghế đã được đặt chưa
    const bookedSeats = showtime.bookedSeats.map((s) => `${s.row}${s.number}`);
    const requestedSeats = seats.map((s) => `${s.row}${s.number}`);

    const conflictSeats = requestedSeats.filter((seat) =>
      bookedSeats.includes(seat)
    );

    if (conflictSeats.length > 0) {
      return res.status(400).json({
        message: `Seats ${conflictSeats.join(', ')} are already booked.`,
      });
    }

    // Kiểm tra xem ghế có tồn tại trong phòng không
    const roomSeats = showtime.room.seats.map((s) => `${s.row}${s.number}`);
    const invalidSeats = requestedSeats.filter(
      (seat) => !roomSeats.includes(seat)
    );
    if (invalidSeats.length > 0) {
      return res.status(400).json({
        message: `Seats ${invalidSeats.join(', ')} do not exist in this room.`,
      });
    }

    const totalPrice = showtime.price * seats.length;

    const ticket = await Ticket.create({
      user: userId,
      showtime: showtimeId,
      seats,
      totalPrice,
      status: 'pending', // Mặc định là pending, chờ thanh toán
    });

    // Cập nhật trạng thái ghế trong showtime
    showtime.bookedSeats.push(...seats);
    showtime.availableSeats -= seats.length;
    await showtime.save();

    res.status(201).json({
      status: 'success',
      message: 'Ticket booked successfully. Please proceed to payment.',
      data: {
        ticket,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả vé (Admin)
const getAllTickets = async (req, res) => {
  try {
    let query = {};
    if (req.query.user) query.user = req.query.user;
    if (req.query.showtime) query.showtime = req.query.showtime;
    if (req.query.status) query.status = req.query.status;

    const tickets = await Ticket.find(query); // Đã có populate trong model pre-find hook

    res.status(200).json({
      status: 'success',
      results: tickets.length,
      data: {
        tickets,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy vé của một người dùng (User)
const getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id });
    res.status(200).json({
      status: 'success',
      results: tickets.length,
      data: {
        tickets,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy chi tiết vé theo ID (Admin/User - nếu là vé của họ)
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    // Nếu là người dùng, chỉ cho phép xem vé của chính họ
    if (
      req.user.role === 'user' &&
      ticket.user._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to view this ticket.' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        ticket,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật trạng thái vé (Admin)
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    // Logic xử lý khi thay đổi trạng thái (ví dụ: hoàn tiền, hủy vé)
    if (status === 'cancelled' && ticket.status !== 'cancelled') {
      // Hoàn lại ghế vào availableSeats của suất chiếu
      const showtime = await Showtime.findById(ticket.showtime);
      if (showtime) {
        showtime.bookedSeats = showtime.bookedSeats.filter(
          (s) =>
            !ticket.seats.some(
              (ts) => ts.row === s.row && ts.number === s.number
            )
        );
        showtime.availableSeats += ticket.seats.length;
        await showtime.save();
      }
    }
    // Thêm logic cho 'paid', 'used', 'refunded' nếu cần

    ticket.status = status;
    const updatedTicket = await ticket.save();

    res.status(200).json({
      status: 'success',
      data: {
        ticket: updatedTicket,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa vé (Admin - thường là update status hơn là xóa hẳn)
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    // Hoàn lại ghế vào availableSeats của suất chiếu khi xóa vé
    const showtime = await Showtime.findById(ticket.showtime);
    if (showtime) {
      showtime.bookedSeats = showtime.bookedSeats.filter(
        (s) =>
          !ticket.seats.some((ts) => ts.row === s.row && ts.number === s.number)
      );
      showtime.availableSeats += ticket.seats.length;
      await showtime.save();
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getUserTickets,
  getTicketById,
  updateTicketStatus,
  deleteTicket,
};
