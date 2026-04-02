require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const prisma = require('./utils/prisma');
const { toIntId, toPublicUser, toPublicMessage } = require('./utils/dbTransform');
const authRoutes = require('./routes/authRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { addOnlineUser, removeOnlineUser } = require('./utils/onlineUsers');

const app = express();
const server = http.createServer(app);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },
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

const canAccessGroupRoom = (user, conversation) => {
  if (!user || !conversation || conversation.type !== 'group') return false;
  if (user.role === 'admin') return true;
  const roomParticipants = Array.isArray(conversation.participants)
    ? conversation.participants.map((p) => Number(p.userId))
    : [];
  const isPrivateRoom = roomParticipants.length > 0;
  if (isPrivateRoom) {
    return roomParticipants.includes(Number(user.id));
  }
  return isGlobalRoom(conversation.name) || isDepartmentRoomAllowed(conversation.name, user.department);
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());

const sessionMiddleware = session({
  name: 'educonnect.sid',
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, httpOnly: true, sameSite: 'Lax' },
});
app.use(sessionMiddleware);

app.get('/test-cookies', (req, res) => {
  res.json({ cookies: req.cookies });
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(express.static(path.join(__dirname, '../Client/dist')));
app.get('/uploads/:filename', (req, res, next) => {
  if (String(req.query.download || '') !== '1') {
    return next();
  }

  const safeFilename = path.basename(req.params.filename || '');
  const filePath = path.join(__dirname, 'uploads', safeFilename);
  return res.download(filePath);
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const verifyDatabase = async () => {
  await prisma.$queryRaw`SELECT 1`;
  console.log('Connected to PostgreSQL via Prisma');
};

const initializeDefaultRooms = async () => {
  try {
    const roomMigration = {
      'Study Group A': 'Smart India Hackathone',
      'Study Group B': 'PU Code',
      'Study Group C': 'IdeaThone',
    };

    for (const oldName in roomMigration) {
      const newName = roomMigration[oldName];
      const oldRoom = await prisma.conversation.findFirst({
        where: { name: oldName, type: 'group' },
      });
      if (oldRoom) {
        await prisma.conversation.update({
          where: { id: oldRoom.id },
          data: { name: newName, description: newName },
        });
        console.log(`Migrated room "${oldName}" to "${newName}"`);
      }
    }

    const requiredRooms = [
      { name: 'general', description: 'General discussion channel' },
      { name: 'announcements', description: 'Faculty announcements (faculty-only)' },
      { name: 'Help & Support', description: 'Get help and support' },
      { name: 'Computer Department', description: 'Department: Computer' },
      { name: 'Civil Department', description: 'Department: Civil' },
      { name: 'Project Alpha', description: 'Project Alpha channel' },
      { name: 'Project Beta', description: 'Project Beta channel' },
      { name: 'Project Gamma', description: 'Project Gamma channel' },
      { name: 'Smart India Hackathone', description: 'Smart India Hackathone' },
      { name: 'PU Code', description: 'PU Code' },
      { name: 'IdeaThone', description: 'IdeaThone' },
    ];

    for (const room of requiredRooms) {
      const exists = await prisma.conversation.findFirst({
        where: { name: room.name, type: 'group' },
        select: { id: true },
      });
      if (!exists) {
        await prisma.conversation.create({
          data: { name: room.name, description: room.description, type: 'group' },
        });
      }
    }
  } catch (error) {
    console.error('Error initializing default rooms:', error);
  }
};

const createAdminAccount = async () => {
  try {
    const adminEmail = 'admin@gmail.com';
    const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin.admin', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          isApproved: true,
          isProfileComplete: true,
        },
      });
      console.log('Admin account created successfully.');
    } else if (adminExists.role !== 'admin') {
      await prisma.user.update({
        where: { id: adminExists.id },
        data: { role: 'admin' },
      });
      console.log('Updated existing user to admin.');
    } else {
      console.log('Admin account already exists.');
    }
  } catch (error) {
    console.error('Error creating/updating admin account:', error);
  }
};

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, () => {
    if (!socket.request.session?.userId && socket.handshake.auth?.userId) {
      socket.userId = String(socket.handshake.auth.userId);
    }
    next();
  });
});

io.on('connection', (socket) => {
  const sessionUserId = socket.request.session?.userId;
  if (sessionUserId) {
    addOnlineUser(sessionUserId);
  }

  socket.on('join-room', async (conversationIdRaw) => {
    try {
      const conversationId = toIntId(conversationIdRaw);
      const userId = toIntId(socket.request.session?.userId || socket.userId);

      const [user, conversation] = await Promise.all([
        userId ? prisma.user.findUnique({ where: { id: userId } }) : null,
        prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { participants: true },
        }),
      ]);

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }

      if (conversation.type === 'group' && !canAccessGroupRoom(user, conversation)) {
        return socket.emit('error', { message: 'Not authorized to join this room' });
      }

      socket.join(String(conversation.id));

      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        include: { sender: true },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      return socket.emit('room-messages', {
        room: String(conversation.id),
        messages: messages.map((m) => toPublicMessage({ ...m, sender: toPublicUser(m.sender) })),
      });
    } catch (err) {
      console.error('Error joining room:', err);
    }
  });

  socket.on('leave-room', (conversationId) => {
    socket.leave(String(conversationId));
  });

  socket.on('message', async (data) => {
    const userId = toIntId(socket.request.session?.userId || socket.userId);
    if (!userId) return;

    const conversationId = toIntId(data?.conversationId);
    const messageText = String(data?.message || '').trim();
    const attachment = data?.attachment ? String(data.attachment) : null;

    try {
      const [conversation, user] = await Promise.all([
        prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { participants: true },
        }),
        prisma.user.findUnique({ where: { id: userId } }),
      ]);

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }
      if (!user) {
        return socket.emit('error', { message: 'User not found' });
      }
      if (conversation.type === 'group' && !canAccessGroupRoom(user, conversation)) {
        return socket.emit('error', { message: 'Not authorized to post in this room' });
      }
      if (String(conversation.name || '').toLowerCase() === 'announcements' && user.role !== 'faculty') {
        return socket.emit('error', { message: 'Only faculty can post in Announcements' });
      }
      if (!messageText && !attachment) {
        return socket.emit('error', { message: 'Message text is required' });
      }

      const newMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          text: messageText || '[Attachment]',
          ...(attachment ? { attachment } : {}),
        },
        include: { sender: true },
      });

      const payload = toPublicMessage({
        ...newMessage,
        sender: toPublicUser(newMessage.sender),
      });
      io.to(String(conversation.id)).emit('message', payload);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Failed to save message' });
    }
  });

  socket.on('disconnect', () => {
    if (sessionUserId) {
      removeOnlineUser(sessionUserId);
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Client/dist/index.html'));
});

app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  try {
    await verifyDatabase();
    await initializeDefaultRooms();
    await createAdminAccount();
  } catch (error) {
    console.error('Database bootstrap error:', error.message);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});
