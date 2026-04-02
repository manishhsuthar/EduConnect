const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { toIntId, toPublicUser, toPublicMessage } = require('../utils/dbTransform');
const { protect } = require('../middleware/authMiddleware');

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

router.get('/users', protect, requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users.map((u) => toPublicUser(u)));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.get('/faculty/pending', protect, requireAdmin, async (_req, res) => {
  try {
    const pending = await prisma.user.findMany({
      where: { role: 'faculty', isApproved: false },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(pending.map((u) => toPublicUser(u)));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch pending faculty' });
  }
});

router.post('/faculty/:id/approve', protect, requireAdmin, async (req, res) => {
  try {
    const userId = toIntId(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isApproved: true },
    });

    await prisma.notification.create({
      data: {
        userId: updated.id,
        title: 'Faculty account approved',
        body: 'Your account has been approved by admin. You can now access all faculty features.',
        type: 'approval',
        link: '/dashboard',
      },
    });

    return res.json(toPublicUser(updated));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve faculty' });
  }
});

router.delete('/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    const userId = toIntId(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.message.deleteMany({ where: { senderId: userId } }),
      prisma.conversationParticipant.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return res.json({ message: 'User deleted', user: toPublicUser(existing) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user' });
  }
});

router.get('/messages', protect, requireAdmin, async (_req, res) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        sender: true,
        conversation: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    const payload = messages.map((message) => {
      const mapped = toPublicMessage({
        ...message,
        sender: toPublicUser(message.sender),
      });
      return {
        ...mapped,
        conversationId: message.conversation,
      };
    });

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

module.exports = router;
