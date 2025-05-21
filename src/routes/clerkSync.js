const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/sync-user', async (req, res) => {
  const { clerkId, email, firstName, lastName } = req.body;

  if (!clerkId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Kiểm tra user đã tồn tại
    const existingUser = await User.findOne({ clerkId });

    if (!existingUser) {
      // Tạo user mới nếu chưa có
      await User.create({ clerkId, email, firstName, lastName });
    }

    return res.status(200).json({ message: 'User synced successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to sync user' });
  }
});

module.exports = router;
