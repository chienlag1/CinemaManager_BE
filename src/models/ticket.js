const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User', // Liên kết với User Model (người đặt vé)
      required: [true, 'A ticket must belong to a user.'],
    },
    showtime: {
      type: mongoose.Schema.ObjectId,
      ref: 'Showtime', // Liên kết với Showtime Model
      required: [true, 'A ticket must belong to a showtime.'],
    },
    seats: {
      type: [
        {
          row: String,
          number: Number,
        },
      ],
      required: [true, 'A ticket must have at least one seat.'],
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: 'Seats array cannot be empty.',
      },
    },
    totalPrice: {
      type: Number,
      required: [true, 'A ticket must have a total price.'],
      min: [0, 'Total price cannot be negative.'],
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled', 'used', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      // Có thể thêm enum: ['Credit Card', 'Bank Transfer', 'E-wallet', 'Cash']
    },
    paymentDate: {
      type: Date,
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to set paymentDate if status becomes 'paid'
ticketSchema.pre('save', function (next) {
  if (
    this.isModified('status') &&
    this.status === 'paid' &&
    !this.paymentDate
  ) {
    this.paymentDate = Date.now();
  }
  next();
});

// Populate user and showtime details by default when finding tickets
ticketSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'username email', // Chỉ lấy các trường này từ user
  }).populate({
    path: 'showtime',
    select: 'startTime price movie room', // Chỉ lấy các trường này từ showtime
    populate: {
      path: 'movie',
      select: 'title posterUrl',
    },
  });
  next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
