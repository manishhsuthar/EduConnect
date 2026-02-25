const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

const requireAdminOrFaculty = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'faculty')) {
        return res.status(403).json({ message: 'Admin or faculty access required' });
    }
    return next();
};

// Middleware to check if user is faculty
const isFaculty = (req, res, next) => {
    if (req.user && req.user.role === 'faculty') {
        return next();
    }
    return res.status(403).json({ message: 'Only faculty can post announcements.' });
};

const { protect } = require('../middleware/authMiddleware');

// Multer setup for chat uploads
const uploadStorage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (_req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/', 'video/'];
        const isAllowed = allowed.some(prefix => file.mimetype.startsWith(prefix));
        if (!isAllowed) {
            return cb(new Error('Only image or video files are allowed'));
        }
        cb(null, true);
    }
});

const isGlobalRoom = (roomName = '') => {
    const lower = roomName.toLowerCase();
    return lower === 'general' || lower === 'announcements' || lower.includes('help');
};

const isDepartmentRoomAllowedForFaculty = (roomName = '', department = '') => {
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
        return matchedDepartment.terms.some((term) => room.includes(term));
    }

    return room.includes(dept);
};

const canAccessRoom = (user, room) => {
    if (!user || !room || room.type !== 'group') return false;
    if (user.role === 'admin') return true;
    if (user.role === 'faculty') {
        return isGlobalRoom(room.name) || isDepartmentRoomAllowedForFaculty(room.name, user.department);
    }
    return true;
};

// GET all DM conversations for the current user
router.get('/dms', protect, async (req, res) => {
    try {
        const dms = await Conversation.find({ type: 'dm', participants: req.user.id })
            .populate('participants', 'username profilePhoto');
        res.json(dms);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching DMs.' });
    }
});

// GET users available for direct messages
router.get('/users', protect, async (req, res) => {
    try {
        const search = String(req.query.search || '').trim();
        const query = {
            _id: { $ne: req.user.id },
            isApproved: true,
        };

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } },
            ];
        }

        const users = await User.find(query)
            .select('username profilePhoto role department email')
            .sort({ username: 1 })
            .limit(100);

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users.' });
    }
});

// GET messages for a specific DM conversation
router.get('/dms/:id/messages', protect, async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }
        // Ensure the user is a participant of the conversation
        const isParticipant = conversation.participants.some(
            (p) => p.toString() === req.user.id.toString()
        );
        if (!isParticipant) {
            return res.status(403).json({ message: 'Not authorized to view this conversation.' });
        }
        const messages = await Message.find({ conversationId: req.params.id }).populate('sender', 'username profilePhoto');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages.' });
    }
});

// GET all rooms
router.get('/rooms', protect, async (req, res) => {
    try {
        const rooms = await Conversation.find({ type: 'group' }).sort({ name: 1 });
        const filteredRooms = rooms.filter((room) => canAccessRoom(req.user, room));
        console.log(`Fetched ${filteredRooms.length} rooms for ${req.user.role}:`, filteredRooms.map(r => r.name));
        res.json(filteredRooms);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching rooms.' });
    }
});

// POST create a new room
router.post('/rooms', protect, requireAdminOrFaculty, async (req, res) => {
    const { name, description, participants } = req.body;
    try {
        const newRoom = new Conversation({
            name,
            description,
            participants,
            type: 'group'
        });
        const savedRoom = await newRoom.save();
        res.status(201).json(savedRoom);
    } catch (error) {
        res.status(500).json({ message: 'Error creating room.' });
    }
});

// GET messages for a specific room
router.get('/rooms/:name/messages', protect, async (req, res) => {
    try {
        const room = await Conversation.findOne({ name: req.params.name });
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        if (!canAccessRoom(req.user, room)) {
            return res.status(403).json({ message: 'Not authorized to access this room.' });
        }
        const messages = await Message.find({ conversationId: room._id }).populate('sender', 'username');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages.' });
    }
});

// POST a message to a room
router.post('/rooms/:name/messages', protect, async (req, res, next) => {
    if (req.params.name.toLowerCase() === 'announcements') {
        return isFaculty(req, res, next);
    }
    return next();
}, async (req, res) => {
    const { text } = req.body;
    try {
        const room = await Conversation.findOne({ name: req.params.name });
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        if (!canAccessRoom(req.user, room)) {
            return res.status(403).json({ message: 'Not authorized to access this room.' });
        }
        if (!text || !text.trim()) {
            return res.status(400).json({ message: 'Message text is required.' });
        }
        const newMessage = new Message({
            conversationId: room._id,
            sender: req.user.id,
            text
        });
        const savedMessage = await newMessage.save();
        res.status(201).json(savedMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error posting message.' });
    }
});


router.post("/", protect, async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user.id;
  if (!receiverId) {
    return res.status(400).json({ message: 'receiverId is required' });
  }
  if (receiverId.toString() === senderId.toString()) {
    return res.status(400).json({ message: 'Cannot create DM with yourself' });
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
    type: 'dm'
  });

  if (!conversation) {
    conversation = new Conversation({ participants: [senderId, receiverId], type: 'dm' });
    await conversation.save();
  }

  res.json(conversation);
});

// POST upload file for chat
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            url: fileUrl,
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
        });
    } catch (error) {
        res.status(500).json({ message: 'File upload failed' });
    }
});

module.exports = router;


