require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const path = require('path');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const User = require('./models/User');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); 
app.use(cookieParser());

// Session middleware
const sessionMiddleware = session({
    name: 'educonnect.sid', // Custom session cookie name
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, sameSite: 'Lax' }
});
app.use(sessionMiddleware);

// Test route to inspect cookies
app.get('/test-cookies', (req, res) => {
    console.log('Test Cookies Route:');
    console.log('  req.cookies:', req.cookies);
    res.json({ cookies: req.cookies });
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);

// Static files - Serve from client_old/public which contains your landing and login pages
app.use(express.static(path.join(__dirname, '../Client/dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection with better error handling
const connectDB = async () => {
    try {
        require("dotenv").config(); // Make sure this is at the top

        console.log("Attempting to connect with URI:", process.env.MONGO_URI);
        const conn = await mongoose.connect(process.env.MONGO_URI);

        
        console.log(' Connected to MongoDB:', conn.connection.host);
        console.log(' Database name:', conn.connection.name);
    } catch (error) {
        console.error(' MongoDB connection error:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 SOLUTIONS:');
            console.log('1. Run Command Prompt as Administrator');
            console.log('2. Run: net start MongoDB');
            console.log('3. Or manually start: mongod --dbpath "C:\\data\\db"');
        }
        
        console.log('⚠️ Server running without database connection');
    }
};

// Call the connection function
connectDB();
// Initialize default rooms/conversations
const initializeDefaultRooms = async () => {
    try {
        const roomMigration = {
            'Study Group A': 'Smart India Hackathone',
            'Study Group B': 'PU Code',
            'Study Group C': 'IdeaThone'
        };

        for (const oldName in roomMigration) {
            const newName = roomMigration[oldName];
            const oldRoom = await Conversation.findOne({ name: oldName });
            if (oldRoom) {
                oldRoom.name = newName;
                oldRoom.description = newName;
                await oldRoom.save();
                console.log(`✓ Migrated room "${oldName}" to "${newName}"`);
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
            { name: 'IdeaThone', description: 'IdeaThone' }
        ];

        for (const r of requiredRooms) {
            const exists = await Conversation.findOne({ name: r.name, type: 'group' });
            if (!exists) {
                await Conversation.create({ name: r.name, description: r.description, type: 'group' });
                console.log(`✓ Created default room: "${r.name}"`);
            }
        }
    } catch (error) {
        console.error('Error initializing default rooms:', error);
    }
};

// Call after DB connection is established (small delay to allow connection)
setTimeout(initializeDefaultRooms, 2000);

// Create admin account if it doesn't exist
const createAdminAccount = async () => {
    try {
        const adminEmail = 'admin@gmail.com';
        const adminExists = await User.findOne({ email: adminEmail });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin.admin', 10);
            const adminUser = new User({
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                isApproved: true,
                isProfileComplete: true
            });
            await adminUser.save();
            console.log('Admin account created successfully.');
        } else {
            // If admin exists, ensure role is 'admin' for backward compatibility
            if (adminExists.role !== 'admin') {
                adminExists.role = 'admin';
                await adminExists.save();
                console.log('Updated existing user to admin.');
            } else {
                console.log('Admin account already exists.');
            }
        }
    } catch (error) {
        console.error('Error creating/updating admin account:', error);
    }
};

setTimeout(createAdminAccount, 2500); // Give it a bit more time

// Socket.io setup with session sharing
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// UPDATED Socket.io implementation with room support
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle joining a room/section
    socket.on('join-room', async (conversationId) => {
        try {
            socket.join(conversationId.toString());
            console.log(`User ${socket.request.session?.user || 'Unknown'} joined room: ${conversationId}`);
    
            // Send recent messages for this room when user joins
            Message.find({ conversationId: conversationId })
                .sort({ timestamp: 1 })
                .limit(20)
                .populate('sender', 'username profilePhoto role')
                .then(messages => {
                    socket.emit('room-messages', {
                        room: conversationId,
                        messages: messages
                    });
                })
                .catch(err => console.error('Error loading room messages:', err));
        } catch(err) {
            console.error('Error joining room:', err);
        }
    });

    // Handle leaving a room
    socket.on('leave-room', (conversationId) => {
        socket.leave(conversationId);
        console.log(`User left room: ${conversationId}`);
    });

    // Handle messages with room information - UPDATED
    socket.on('message', async (data) => {
        if (socket.request.session.user) {
            const userId = socket.request.session.userId;
            let { conversationId, message } = data;

            try {
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) {
                    return socket.emit('error', { message: 'Conversation not found' });
                }

                if (conversation.name.toLowerCase() === 'announcements') {
                    const user = await User.findById(userId);
                    if (!user || user.role !== 'faculty') {
                        return socket.emit('error', { message: 'Only faculty can post in Announcements' });
                    }
                }

                const newMessage = new Message({
                    conversationId: conversationId,
                    sender: userId,
                    text: message
                });
                await newMessage.save();

                const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username profilePhoto role');

                // Broadcast message only to users in the same room
                io.to(conversationId.toString()).emit('message', populatedMessage);

                console.log(`Message saved and sent to room ${conversationId}:`, populatedMessage);
            } catch (error) {
                console.error('Error saving message:', error);
                socket.emit('error', { message: 'Failed to save message' });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Client/dist/index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
    console.log(` Database check: http://localhost:${PORT}/check-db`);
    console.log(` Debug users: http://localhost:${PORT}/debug/users`);
});
