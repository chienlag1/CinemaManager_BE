const Room = require('../models/room');

// Tạo phòng mới (Admin)
const createRoom = async (req, res) => {
  try {
    const { name, capacity, type } = req.body;

    // Tạo danh sách ghế mặc định dựa trên capacity
    // Ví dụ: 10 hàng, mỗi hàng 10 ghế (tổng 100 ghế)
    // Đây là ví dụ đơn giản, trong thực tế cần logic phức tạp hơn cho bố cục ghế
    const seats = [];
    const numRows = Math.ceil(capacity / 10); // Chia thành các hàng, mỗi hàng tối đa 10 ghế
    for (let i = 0; i < numRows; i++) {
      const rowChar = String.fromCharCode(65 + i); // 'A', 'B', 'C', ...
      for (let j = 1; j <= Math.min(10, capacity - seats.length); j++) {
        seats.push({ row: rowChar, number: j });
      }
    }

    const room = await Room.create({ name, capacity, type, seats });
    res.status(201).json({
      status: 'success',
      data: {
        room,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Room name already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả phòng (Admin)
const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json({
      status: 'success',
      results: rooms.length,
      data: {
        rooms,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy thông tin phòng theo ID (Admin)
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    res.status(200).json({
      status: 'success',
      data: {
        room,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật thông tin phòng (Admin)
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Trả về tài liệu đã cập nhật
      runValidators: true, // Chạy các validator đã định nghĩa trong schema
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    res.status(200).json({
      status: 'success',
      data: {
        room,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa phòng (Admin)
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    res.status(204).json({
      status: 'success',
      data: null,
    }); // 204 No Content for successful deletion
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
};
