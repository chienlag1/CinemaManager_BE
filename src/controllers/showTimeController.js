const Showtime = require('../models/showTime');
const Movie = require('../models/movie');
const Room = require('../models/room');

// Tạo suất chiếu mới (Admin)
const createShowtime = async (req, res) => {
  try {
    const { movie, room, startTime, price } = req.body;

    // Kiểm tra xem phim và phòng có tồn tại không
    const existingMovie = await Movie.findById(movie);
    if (!existingMovie) {
      return res.status(404).json({ message: 'Movie not found.' });
    }
    const existingRoom = await Room.findById(room);
    if (!existingRoom) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    // Kiểm tra xung đột thời gian (tùy chọn, cần logic phức tạp hơn)
    // Đảm bảo không có suất chiếu nào khác trong cùng phòng chiếu tại thời điểm đó

    const showtime = await Showtime.create({
      movie,
      room,
      startTime,
      price,
    });

    res.status(201).json({
      status: 'success',
      data: {
        showtime,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả suất chiếu (Admin/User)
const getAllShowtimes = async (req, res) => {
  try {
    // Có thể thêm query params để lọc theo phim, phòng, ngày
    let query = {};
    if (req.query.movie) query.movie = req.query.movie;
    if (req.query.room) query.room = req.query.room;
    if (req.query.date) {
      const startDate = new Date(req.query.date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1); // Đến cuối ngày
      query.startTime = { $gte: startDate, $lt: endDate };
    }

    const showtimes = await Showtime.find(query)
      .populate('movie', 'title posterUrl duration') // Lấy thông tin phim
      .populate('room', 'name type capacity'); // Lấy thông tin phòng

    res.status(200).json({
      status: 'success',
      results: showtimes.length,
      data: {
        showtimes,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy thông tin suất chiếu theo ID (Admin/User)
const getShowtimeById = async (req, res) => {
  try {
    const showtime = await Showtime.findById(req.params.id)
      .populate('movie', 'title posterUrl description duration')
      .populate('room', 'name type capacity seats'); // Lấy cả thông tin ghế của phòng

    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found.' });
    }
    res.status(200).json({
      status: 'success',
      data: {
        showtime,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật thông tin suất chiếu (Admin)
const updateShowtime = async (req, res) => {
  try {
    const showtime = await Showtime.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found.' });
    }
    res.status(200).json({
      status: 'success',
      data: {
        showtime,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa suất chiếu (Admin)
const deleteShowtime = async (req, res) => {
  try {
    const showtime = await Showtime.findByIdAndDelete(req.params.id);
    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found.' });
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
  createShowtime,
  getAllShowtimes,
  getShowtimeById,
  updateShowtime,
  deleteShowtime,
};
