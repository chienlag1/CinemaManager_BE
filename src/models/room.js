const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  row: {
    type: String,
    required: true,
    uppercase: true, // Ví dụ: 'A', 'B', 'C'
  },
  number: {
    type: Number,
    required: true,
    min: 1,
  },
  isBooked: {
    type: Boolean,
    default: false,
  },
  // Trạng thái ghế có thể là: available, booked, selected (tạm thời)
  status: {
    type: String,
    enum: ['available', 'booked', 'selected'],
    default: 'available',
  },
});

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A room must have a name.'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'Room name cannot be empty.',
      },
    },
    capacity: {
      type: Number,
      required: [true, 'A room must have a capacity.'],
      min: [1, 'Room capacity must be at least 1.'],
    },
    seats: [seatSchema], // Lưu danh sách ghế trong phòng
    // Có thể thêm loại phòng: 2D, 3D, IMAX, VIP, v.v.
    type: {
      type: String,
      enum: ['2D', '3D', 'IMAX', 'VIP', 'Standard'],
      default: 'Standard',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Tạo virtual for `totalSeats` if needed
// roomSchema.virtual('totalSeats').get(function() {
//     return this.seats.length;
// });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
