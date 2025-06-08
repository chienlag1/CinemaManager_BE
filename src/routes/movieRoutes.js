const express = require('express');
const movieController = require('../controllers/movieController'); // Import movieController
const { protect, restrictTo } = require('../controllers/authController'); // Giả định authController cung cấp protect và restrictTo

const router = express.Router();

// --- Public Routes (Không yêu cầu đăng nhập hoặc vai trò cụ thể) ---

// GET /api/movies - Lấy tất cả các bộ phim
router.get('/', movieController.getAllMovies);

// GET /api/movies/showing - Lấy danh sách phim đang chiếu
router.get('/showing', movieController.getShowingMovies);

// GET /api/movies/upcoming - Lấy danh sách phim sắp chiếu
router.get('/upcoming', movieController.getUpcomingMovies);

// GET /api/movies/genre/:genre - Lấy danh sách phim theo thể loại
router.get('/genre/:genre', movieController.getMoviesByGenre);

// GET /api/movies/:id - Lấy chi tiết một bộ phim bằng ID
router.get('/:id', movieController.getMovie);

// --- Protected Routes (Yêu cầu người dùng phải được xác thực và có vai trò 'admin') ---
// Áp dụng middleware bảo vệ và giới hạn quyền cho tất cả các route bên dưới
router.use(protect, restrictTo('admin'));

// POST /api/movies - Tạo một bộ phim mới (chỉ Admin)
router.post('/', movieController.createMovie);

// PATCH /api/movies/:id - Cập nhật thông tin một bộ phim bằng ID (chỉ Admin)
router.patch('/:id', movieController.updateMovie);

// DELETE /api/movies/:id - Xóa một bộ phim bằng ID (chỉ Admin)
router.delete('/:id', movieController.deleteMovie);

module.exports = router;
