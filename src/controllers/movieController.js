const Movie = require('../models/movie'); // Đảm bảo import đúng tên file mới
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync'); // Hàm tiện ích để bắt lỗi async

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

exports.getShowingMovies = catchAsync(async (req, res, next) => {
  const movies = await Movie.find({
    isShowing: true,
    releaseDate: { $lte: new Date() },
  }).sort('-releaseDate');

  res.status(200).json({
    status: 'success',
    results: movies.length,
    data: {
      movies,
    },
  });
});

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

exports.getMoviesByGenre = catchAsync(async (req, res, next) => {
  const genre = req.params.genre;
  const movies = await Movie.find({ genre: { $in: [genre] } });

  res.status(200).json({
    status: 'success',
    results: movies.length,
    data: {
      movies,
    },
  });
});

exports.createMovie = catchAsync(async (req, res, next) => {
  const newMovie = await Movie.create(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Movie created successfully!',
    data: {
      movie: newMovie,
    },
  });
});

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

exports.deleteMovie = catchAsync(async (req, res, next) => {
  const movie = await Movie.findByIdAndDelete(req.params.id);

  if (!movie) {
    return next(new AppError('No movie found with that ID to delete.', 404));
  }

  res.status(204).json({
    status: 'success',
    message: 'Movie deleted successfully!',
    data: null,
  });
});
