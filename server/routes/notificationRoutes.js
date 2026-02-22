const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(limit),
      Notification.countDocuments({ user: req.user.id, isRead: false }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json(notification);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update notification' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', protect, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ modifiedCount: result.modifiedCount || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
