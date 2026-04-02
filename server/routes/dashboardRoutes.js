const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { toPublicUser, toIntId } = require('../utils/dbTransform');
const { protect } = require('../middleware/authMiddleware');
const { getOnlineUserIds } = require('../utils/onlineUsers');

router.get('/stats', protect, async (_req, res) => {
  try {
    const totalUsers = await prisma.user.count();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const messagesToday = await prisma.message.count({
      where: {
        createdAt: { gte: startOfDay },
      },
    });

    const onlineIds = getOnlineUserIds().map((id) => toIntId(id)).filter((id) => Number.isInteger(id));
    const onlineUsers = onlineIds.length
      ? await prisma.user.findMany({
          where: {
            id: { in: onlineIds },
            role: { not: 'admin' },
          },
        })
      : [];

    return res.json({
      totalUsers,
      messagesToday,
      activeNow: onlineUsers.length,
      onlineUsers: onlineUsers.map((u) => toPublicUser(u)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load dashboard stats' });
  }
});

module.exports = router;
