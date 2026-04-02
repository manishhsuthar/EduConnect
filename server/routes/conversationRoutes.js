const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const prisma = require('../utils/prisma');
const { toIntId, toPublicUser, toPublicConversation, toPublicMessage } = require('../utils/dbTransform');
const { protect } = require('../middleware/authMiddleware');

const isFaculty = (req, res, next) => {
  if (req.user && req.user.role === 'faculty') {
    return next();
  }
  return res.status(403).json({ message: 'Only faculty can post announcements.' });
};

const uploadStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (_req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const isGlobalRoom = (roomName = '') => {
  const lower = roomName.toLowerCase();
  return lower === 'general' || lower === 'announcements' || lower.includes('help');
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsWord = (text = '', word = '') => {
  const normalizedWord = String(word || '').toLowerCase().trim();
  if (!normalizedWord) return false;
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedWord)}([^a-z0-9]|$)`, 'i');
  return re.test(String(text || ''));
};

const isDepartmentRoomAllowed = (roomName = '', department = '') => {
  const dept = String(department || '').toLowerCase().trim();
  const room = String(roomName || '').toLowerCase();
  if (!dept) return false;

  const departmentKeywords = [
    { key: 'computer', terms: ['computer', 'code'] },
    { key: 'civil', terms: ['civil'] },
    { key: 'electrical', terms: ['electrical'] },
    { key: 'mechanical', terms: ['mechanical'] },
    { key: 'electronics', terms: ['electronics', 'communication'] },
    { key: 'information', terms: ['information', 'it'] },
  ];

  const matchedDepartment = departmentKeywords.find((group) => dept.includes(group.key));
  if (matchedDepartment) {
    return matchedDepartment.terms.some((term) => containsWord(room, term));
  }

  const stopWords = new Set(['department', 'dept', 'engineering', 'science', 'and', 'of']);
  const departmentTokens = dept
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !stopWords.has(t));

  return departmentTokens.some((token) => containsWord(room, token));
};

const conversationParticipantIds = (conversation) =>
  Array.isArray(conversation?.participants) ? conversation.participants.map((entry) => Number(entry.userId)) : [];

const canAccessRoom = (user, room) => {
  if (!user || !room || room.type !== 'group') return false;
  if (user.role === 'admin') return true;
  const roomParticipants = conversationParticipantIds(room);
  const isPrivateRoom = roomParticipants.length > 0;
  if (isPrivateRoom) {
    return roomParticipants.includes(Number(user.id));
  }
  return isGlobalRoom(room.name) || isDepartmentRoomAllowed(room.name, user.department);
};

router.get('/dms', protect, async (req, res) => {
  try {
    const userId = toIntId(req.user.id);
    const dms = await prisma.conversation.findMany({
      where: {
        type: 'dm',
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const payload = dms.map((dm) => ({
      ...toPublicConversation(dm),
      participants: dm.participants.map((p) => toPublicUser(p.user)),
    }));

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching DMs.' });
  }
});

router.get('/users', protect, async (req, res) => {
  try {
    const currentUserId = toIntId(req.user.id);
    const search = String(req.query.search || '').trim();

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isApproved: true,
        role: { not: 'admin' },
        ...(search
          ? {
              OR: [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { department: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { username: 'asc' },
      take: 100,
    });

    return res.json(users.map((u) => toPublicUser(u)));
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching users.' });
  }
});

router.get('/dms/:id/messages', protect, async (req, res) => {
  try {
    const conversationId = toIntId(req.params.id);
    const userId = toIntId(req.user.id);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view this conversation.' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(messages.map((m) => toPublicMessage({ ...m, sender: toPublicUser(m.sender) })));
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching messages.' });
  }
});

router.get('/rooms', protect, async (req, res) => {
  try {
    const rooms = await prisma.conversation.findMany({
      where: { type: 'group' },
      include: { participants: true },
      orderBy: { name: 'asc' },
    });
    const filteredRooms = rooms.filter((room) => canAccessRoom(req.user, room));
    return res.json(filteredRooms.map((room) => toPublicConversation(room)));
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching rooms.' });
  }
});

router.post('/rooms', protect, async (req, res) => {
  const { name, participantIds } = req.body;
  const roomName = String(name || '').trim();
  const requestedParticipants = Array.isArray(participantIds) ? participantIds : [];

  if (!roomName) {
    return res.status(400).json({ message: 'Room name is required.' });
  }

  try {
    const currentUserId = toIntId(req.user.id);
    const normalizedParticipantIds = [
      ...new Set(
        requestedParticipants
          .map((id) => toIntId(id))
          .filter((id) => Number.isInteger(id))
      ),
    ];

    const allowedUsers =
      normalizedParticipantIds.length > 0
        ? await prisma.user.findMany({
            where: {
              id: { in: normalizedParticipantIds, not: currentUserId },
              role: { not: 'admin' },
            },
            select: { id: true },
          })
        : [];

    const participants = [...new Set([currentUserId, ...allowedUsers.map((u) => u.id)])];

    const exists = await prisma.conversation.findFirst({
      where: {
        type: 'group',
        name: roomName,
      },
      select: { id: true },
    });
    if (exists) {
      return res.status(409).json({ message: 'A channel with this name already exists.' });
    }

    const newRoom = await prisma.conversation.create({
      data: {
        name: roomName,
        description: '',
        type: 'group',
        participants: {
          create: participants.map((userId) => ({ userId })),
        },
      },
      include: { participants: true },
    });

    return res.status(201).json(toPublicConversation(newRoom));
  } catch (error) {
    return res.status(500).json({ message: 'Error creating room.' });
  }
});

router.get('/rooms/:name/messages', protect, async (req, res) => {
  try {
    const room = await prisma.conversation.findFirst({
      where: { name: req.params.name, type: 'group' },
      include: { participants: true },
    });
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    if (!canAccessRoom(req.user, room)) {
      return res.status(403).json({ message: 'Not authorized to access this room.' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: room.id },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(messages.map((m) => toPublicMessage({ ...m, sender: toPublicUser(m.sender) })));
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching messages.' });
  }
});

router.post(
  '/rooms/:name/messages',
  protect,
  async (req, res, next) => {
    if (req.params.name.toLowerCase() === 'announcements') {
      return isFaculty(req, res, next);
    }
    return next();
  },
  async (req, res) => {
    const { text } = req.body;
    try {
      const userId = toIntId(req.user.id);
      const room = await prisma.conversation.findFirst({
        where: { name: req.params.name, type: 'group' },
        include: { participants: true },
      });
      if (!room) {
        return res.status(404).json({ message: 'Room not found.' });
      }
      if (!canAccessRoom(req.user, room)) {
        return res.status(403).json({ message: 'Not authorized to access this room.' });
      }
      if (!text || !String(text).trim()) {
        return res.status(400).json({ message: 'Message text is required.' });
      }

      const savedMessage = await prisma.message.create({
        data: {
          conversationId: room.id,
          senderId: userId,
          text: String(text),
        },
        include: { sender: true },
      });

      return res.status(201).json(toPublicMessage({ ...savedMessage, sender: toPublicUser(savedMessage.sender) }));
    } catch (error) {
      return res.status(500).json({ message: 'Error posting message.' });
    }
  }
);

router.post('/', protect, async (req, res) => {
  try {
    const receiverId = toIntId(req.body.receiverId);
    const senderId = toIntId(req.user.id);
    if (!receiverId) {
      return res.status(400).json({ message: 'receiverId is required' });
    }
    if (receiverId === senderId) {
      return res.status(400).json({ message: 'Cannot create DM with yourself' });
    }

    const sortedIds = [senderId, receiverId].sort((a, b) => a - b);
    const dmName = `dm-${sortedIds[0]}-${sortedIds[1]}`;

    let conversation = await prisma.conversation.findFirst({
      where: {
        type: 'dm',
        name: dmName,
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          name: dmName,
          type: 'dm',
          participants: {
            create: sortedIds.map((id) => ({ userId: id })),
          },
        },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
        },
      });
    }

    const payload = {
      ...toPublicConversation(conversation),
      participants: conversation.participants.map((p) => toPublicUser(p.user)),
    };
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create direct message.' });
  }
});

router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      url: `${fileUrl}?download=1`,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    return res.status(500).json({ message: 'File upload failed' });
  }
});

module.exports = router;
