const mongoose = require('mongoose');

const showtimeSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.ObjectId,
      ref: 'Movie', // Liên kết với Movie Model
      required: [true, 'A showtime must belong to a movie.'],
    },
    room: {
      type: mongoose.Schema.ObjectId,
      ref: 'Room', // Liên kết với Room Model
      required: [true, 'A showtime must take place in a room.'],
    },
    startTime: {
      type: Date,
      required: [true, 'A showtime must have a start time.'],
    },
    endTime: {
      type: Date,
      // Calculate endTime based on movie duration
    },
    price: {
      type: Number,
      required: [true, 'A showtime must have a ticket price.'],
      min: [0, 'Price cannot be negative.'],
    },
    availableSeats: {
      type: Number,
      default: 0, // Sẽ được cập nhật khi tạo suất chiếu
    },
    bookedSeats: [
      {
        row: String,
        number: Number,
      },
    ], // Lưu trữ các ghế đã được đặt cho suất chiếu này
    isActive: {
      type: Boolean,
      default: true, // Suất chiếu có đang hoạt động hay không
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to calculate `endTime`
showtimeSchema.pre('save', async function (next) {
  if (this.isModified('movie') || this.isNew) {
    const Movie = mongoose.model('Movie');
    const movie = await Movie.findById(this.movie);
    if (movie && this.startTime) {
      this.endTime = new Date(
        this.startTime.getTime() + movie.duration * 60 * 1000
      );
    }
  }
  // Update availableSeats based on room capacity if new showtime
  if (this.isNew) {
    const Room = mongoose.model('Room');
    const room = await Room.findById(this.room);
    if (room) {
      this.availableSeats = room.capacity;
    }
  }
  next();
});

// Index to quickly find showtimes by movie and room
showtimeSchema.index({ movie: 1, room: 1, startTime: 1 });

const Showtime = mongoose.model('Showtime', showtimeSchema);

module.exports = Showtime;
