const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { protect } = require('../middleware/authMiddleware');

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// GET /api/admin/users
router.get('/users', protect, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// GET /api/admin/faculty/pending
router.get('/faculty/pending', protect, requireAdmin, async (req, res) => {
  try {
    const pending = await User.find({ role: 'faculty', isApproved: false })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending faculty' });
  }
});

// POST /api/admin/faculty/:id/approve
router.post('/faculty/:id/approve', protect, requireAdmin, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).select('-password');
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve faculty' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id).select('-password');
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted', user: deleted });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// GET /api/admin/messages
router.get('/messages', protect, requireAdmin, async (req, res) => {
  try {
    const messages = await Message.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('sender', 'username email role')
      .populate('conversationId', 'name type');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

module.exports = router;
