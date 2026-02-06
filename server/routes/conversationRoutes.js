const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Middleware to check if user is faculty
const isFaculty = async (req, res, next) => {
    const userId = req.body.sender; // Assuming sender's ID is passed in the request body
    try {
        const user = await User.findById(userId);
        if (user && user.role === 'faculty') {
            next();
        } else {
            res.status(403).json({ message: 'Only faculty can post announcements.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error verifying user role.' });
    }
};

const { protect } = require('../middleware/authMiddleware');

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

// GET messages for a specific DM conversation
router.get('/dms/:id/messages', protect, async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }
        // Ensure the user is a participant of the conversation
        if (!conversation.participants.includes(req.user.id)) {
            return res.status(403).json({ message: 'Not authorized to view this conversation.' });
        }
        const messages = await Message.find({ conversationId: req.params.id }).populate('sender', 'username profilePhoto');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages.' });
    }
});

// GET all rooms
router.get('/rooms', async (req, res) => {
    try {
        const rooms = await Conversation.find({ type: 'group' }).sort({ name: 1 });
        console.log(`Fetched ${rooms.length} rooms:`, rooms.map(r => r.name));
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching rooms.' });
    }
});

// POST create a new room
router.post('/rooms', async (req, res) => {
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
router.get('/rooms/:name/messages', async (req, res) => {
    try {
        const room = await Conversation.findOne({ name: req.params.name });
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        const messages = await Message.find({ conversationId: room._id }).populate('sender', 'username');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages.' });
    }
});

// POST a message to a room
router.post('/rooms/:name/messages', async (req, res, next) => {
    if (req.params.name.toLowerCase() === 'announcements') {
        isFaculty(req, res, next);
    } else {
        next();
    }
}, async (req, res) => {
    const { sender, text } = req.body;
    try {
        const room = await Conversation.findOne({ name: req.params.name });
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        const newMessage = new Message({
            conversationId: room._id,
            sender,
            text
        });
        const savedMessage = await newMessage.save();
        res.status(201).json(savedMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error posting message.' });
    }
});


router.post("/", async (req, res) => {
  const { senderId, receiverId } = req.body;

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

module.exports = router;


