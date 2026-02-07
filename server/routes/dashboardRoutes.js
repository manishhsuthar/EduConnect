const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');
const { getOnlineUserIds, getOnlineCount } = require('../utils/onlineUsers');

// GET /api/dashboard/stats
router.get('/stats', protect, async (_req, res) => {
  try {
    const totalUsers = await User.countDocuments({});

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const messagesToday = await Message.countDocuments({
      createdAt: { $gte: startOfDay },
    });

    const onlineIds = getOnlineUserIds();
    const onlineUsers = onlineIds.length
      ? await User.find({ _id: { $in: onlineIds } }).select(
          'username role department'
        )
      : [];

    res.json({
      totalUsers,
      messagesToday,
      activeNow: getOnlineCount(),
      onlineUsers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load dashboard stats' });
  }
});

module.exports = router;
