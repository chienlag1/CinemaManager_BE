const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/clerk', async (req, res) => {
  try {
    const { id, first_name, email_addresses, public_metadata } = req.body.data;

    // Kiểm tra đã có user chưa
    let user = await User.findOne({ clerkUserId: id });
    if (!user) {
      user = await User.create({
        clerkUserId: id,
        name: first_name || '',
        email: email_addresses[0]?.email_address,
        role: public_metadata?.role || 'user',
        emailVerified: email_addresses[0]?.verification?.status === 'verified',
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook Clerk error:', err);
    res.status(500).json({ success: false, message: 'Webhook error' });
  }
});

module.exports = router;