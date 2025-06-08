const Movie = require('../models/movie'); // Đảm bảo import đúng tên file mới
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync'); // Hàm tiện ích để bắt lỗi async

// --- Public Access Controllers ---

/**
 * Lấy tất cả các bộ phim.
 * GET /api/movies
 */
exports.getAllMovies = catchAsync(async (req, res, next) => {
  const movies = await Movie.find();

  res.status(200).json({
    status: 'success',
    results: movies.length,
    data: {
      movies,
    },
  });
});

/**
 * Lấy chi tiết một bộ phim bằng ID.
 * GET /api/movies/:id
 */
exports.getMovie = catchAsync(async (req, res, next) => {
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    return next(new AppError('No movie found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      movie,
    },
  });
});

/**
 * Lấy danh sách phim đang chiếu.
 * Phim được coi là đang chiếu nếu `isShowing` là `true` và `releaseDate` nhỏ hơn hoặc bằng ngày hiện tại.
 * GET /api/movies/showing
 */
exports.getShowingMovies = catchAsync(async (req, res, next) => {
  const movies = await Movie.find({
    isShowing: true,
    releaseDate: { $lte: new Date() },
  }).sort('-releaseDate'); // Sắp xếp theo ngày phát hành giảm dần

  res.status(200).json({
    status: 'success',
    results: movies.length,
    data: {
      movies,
    },
  });
});

/**
 * Lấy danh sách phim sắp chiếu.
 * Phim được coi là sắp chiếu nếu `isShowing` là `false` HOẶC `releaseDate` lớn hơn ngày hiện tại.
 * GET /api/movies/upcoming
 */
exports.getUpcomingMovies = catchAsync(async (req, res, next) => {
  const movies = await Movie.find({
    $or: [{ isShowing: false }, { releaseDate: { $gt: new Date() } }],
  }).sort('releaseDate'); // Sắp xếp theo ngày phát hành tăng dần

  res.status(200).json({
    status: 'success',
    results: movies.length,
    data: {
      movies,
    },
  });
});

/**
 * Lấy danh sách phim theo thể loại.
 * GET /api/movies/genre/:genre
 */
exports.getMoviesByGenre = catchAsync(async (req, res, next) => {
  const genre = req.params.genre;
  // Tìm các bộ phim có chứa thể loại được yêu cầu trong mảng genre của chúng
  const movies = await Movie.find({ genre: { $in: [genre] } });

  res.status(200).json({
    status: 'success',
    results: movies.length,
    data: {
      movies,
    },
  });
});

// --- Admin Only Controllers (requires authentication and 'admin' role) ---

/**
 * Tạo một bộ phim mới.
 * POST /api/movies (Chỉ Admin)
 */
exports.createMovie = catchAsync(async (req, res, next) => {
  // console.log('DEBUG BODY:', req.body); // Giữ lại để debug nếu cần

  const newMovie = await Movie.create(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Movie created successfully!',
    data: {
      movie: newMovie,
    },
  });
});

/**
 * Cập nhật thông tin một bộ phim bằng ID.
 * PATCH /api/movies/:id (Chỉ Admin)
 */
exports.updateMovie = catchAsync(async (req, res, next) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Trả về tài liệu đã cập nhật
    runValidators: true, // Chạy các validator đã định nghĩa trong schema
  });

  if (!movie) {
    return next(new AppError('No movie found with that ID to update.', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Movie updated successfully!',
    data: {
      movie,
    },
  });
});

/**
 * Xóa một bộ phim bằng ID.
 * DELETE /api/movies/:id (Chỉ Admin)
 */
exports.deleteMovie = catchAsync(async (req, res, next) => {
  const movie = await Movie.findByIdAndDelete(req.params.id);

  if (!movie) {
    return next(new AppError('No movie found with that ID to delete.', 404));
  }

  // HTTP status 204 No Content thường được dùng cho DELETE thành công
  res.status(204).json({
    status: 'success',
    message: 'Movie deleted successfully!', // Thông báo này có thể không hiển thị với 204
    data: null,
  });
});
