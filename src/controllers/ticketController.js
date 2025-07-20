const Ticket = require('../models/ticket');

exports.createTicket = async (req, res) => {
  try {
    const { showtime, seats, totalPrice } = req.body;

    const newTicket = await Ticket.create({
      user: req.user._id,
      showtime,
      seats,
      totalPrice,
      status: 'unpaid',
    });

    res.status(201).json({ ticket: newTicket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id }).populate(
      'showtime'
    );
    res.status(200).json({ tickets });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('showtime user');
    res.status(200).json({ tickets });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate(
      'showtime user'
    );
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = ticket.user._id.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.status(200).json({ ticket });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    res.status(200).json({ ticket });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
