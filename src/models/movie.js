const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A movie must have a title.'],
      trim: true,
      unique: true, // Đảm bảo tên phim là duy nhất
      // Tùy chỉnh validator để không cho phép chuỗi rỗng
      validate: {
        validator: function (v) {
          return v && v.length > 0; // Đảm bảo giá trị tồn tại và không rỗng
        },
        message: 'Movie title cannot be empty.',
      },
    },
    description: {
      type: String,
      required: [true, 'A movie must have a description.'],
      trim: true,
    },
    releaseDate: {
      type: Date,
      required: [true, 'A movie must have a release date.'],
    },
    duration: {
      type: Number,
      required: [true, 'A movie must have a duration.'],
      min: [1, 'Movie duration must be greater than 0 minutes.'], // Thời lượng tối thiểu là 1 phút
    },
    genre: {
      type: [String], // Có thể có nhiều thể loại
      required: [true, 'A movie must have at least one genre.'], // Yêu cầu có ít nhất một thể loại
      enum: {
        values: [
          'Action',
          'Adventure',
          'Animation',
          'Comedy',
          'Documentary',
          'Drama',
          'Family',
          'Horror',
          'Martial Arts',
          'Musical',
          'Mythology',
          'Romance',
          'Science Fiction',
          'Sports',
          'Suspense',
          'Thriller',
          'War',
        ],
        message: 'Invalid movie genre. Please choose from the allowed genres.',
      },
    },
    posterUrl: {
      type: String,
      required: [true, 'A movie must have a poster URL.'],
      trim: true,
    },
    trailerUrl: {
      type: String, // URL trailer phim (tùy chọn)
      trim: true,
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be 1 or higher.'],
      max: [10, 'Rating cannot be more than 10.'],
      default: 5, // Giá trị mặc định là 5 nếu không được cung cấp
    },
    isShowing: {
      type: Boolean,
      default: false, // Mặc định là 'sắp chiếu'
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    toJSON: { virtuals: true }, // Cho phép virtuals khi chuyển đổi thành JSON
    toObject: { virtuals: true }, // Cho phép virtuals khi chuyển đổi thành Object
  }
);

// Indexes để tăng tốc độ tìm kiếm
movieSchema.index({ title: 1 }); // Index cho trường title để tìm kiếm nhanh
movieSchema.index({ genre: 1 }); // Index cho trường genre
movieSchema.index({ isShowing: 1, releaseDate: -1 }); // Index để tìm phim đang chiếu/sắp chiếu

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
