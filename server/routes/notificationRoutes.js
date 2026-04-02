const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { toIntId, toPublicNotification } = require('../utils/dbTransform');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const userId = toIntId(req.user.id);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return res.json({
      notifications: notifications.map((n) => toPublicNotification(n)),
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load notifications' });
  }
});

router.patch('/:id/read', protect, async (req, res) => {
  try {
    const userId = toIntId(req.user.id);
    const notificationId = toIntId(req.params.id);

    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    return res.json(toPublicNotification(notification));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update notification' });
  }
});

router.patch('/read-all', protect, async (req, res) => {
  try {
    const userId = toIntId(req.user.id);
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return res.json({ modifiedCount: result.count || 0 });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
