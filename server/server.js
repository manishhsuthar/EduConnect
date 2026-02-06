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
app.use(cors()); // Keep CORS here if needed for other routes

app.use(cookieParser()); // Add cookie-parser middleware

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
app.use(express.static(path.join(__dirname, '../client_old/public')));
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

// Check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log('isAuthenticated middleware:');
    console.log('  req.session:', req.session);
    console.log('  req.session.user:', req.session.user);
    console.log('  req.cookies:', req.cookies);
    if (req.session.user) {
        next();
    } else {
        console.log('  User not authenticated, redirecting to login.html');
        res.redirect('/login.html');
    }
}

// Create user schema


// Updated message schema with room field
// const messageSchema = new mongoose.Schema({
//     sender: String,
//     message: String,
//     room: String, // Added room field for sections
//     timestamp: { type: Date, default: Date.now },
// });

// const Message = mongoose.model("Message", messageSchema);

// Dashboard route with authentication - Updated path
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, './Client/dashboard'));
});

app.get('/profile', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, './Client/profile'));
});

// NEW: Get messages for specific room/section
app.get('/messages/:room', isAuthenticated, async (req, res) => {
    try {
        const { room } = req.params;
        const messages = await Message.find({ room: room })
            .sort({ timestamp: 1 }) // Sort by oldest first
            .limit(50); // Limit to last 50 messages
        
        res.json({
            success: true,
            room: room,
            messages: messages
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Get all available rooms/sections
app.get('/rooms', isAuthenticated, async (req, res) => {
    try {
        const rooms = await Message.distinct('room');
        res.json({
            success: true,
            rooms: rooms.length > 0 ? rooms : ['general']
        });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: error.message });
    }
});

// DATABASE CHECK ROUTES

app.get('/check-db', async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        const userCount = await User.countDocuments();
        
        res.json({
            status: 'success',
            database: {
                state: states[dbState],
                connection: dbState === 1 ? 'Connected' : 'Not Connected'
            },
            collections: {
                users: userCount
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// View all users (for debugging)
app.get('/debug/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Exclude passwords
        res.json({
            status: 'success',
            count: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// View all messages (for debugging) - Updated with room filtering
app.get('/debug/messages', async (req, res) => {
    try {
        const { room } = req.query; // Optional room filter
        const query = room ? { room: room } : {};
        
        const messages = await Message.find(query)
            .sort({ timestamp: -1 })
            .limit(50);
            
        res.json({
            status: 'success',
            room: room || 'all',
            count: messages.length,
            messages: messages
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Signup route
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            return res.status(400).json({ 
                message: "User already exists with this email" 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, role, isApproved: role === 'student' || email === 'manish@gmail.com', isProfileComplete: false });
        await newUser.save();
        
        if (role === 'faculty') {
            return res.status(201).json({
                success: true,
                message: "Faculty registration successful. Awaiting approval."
            });
        } else {
            req.session.user = newUser.username;
            req.session.userId = newUser._id;
            console.log('User registered and session created:', newUser.username);
            res.status(201).json({
                success: true,
                profileSetupRequired: true,
                message: "User registered successfully",
                username: newUser.username
            });
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);
        
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch for user:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.role === 'faculty' && !user.isApproved) {
            console.log('Faculty account not approved:', email);
            return res.status(401).json({ message: 'Your account has not been approved yet.' });
        }

        req.session.user = user.username;
        req.session.userId = user._id;
        req.session.role = user.role; // Store role in session
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session after login:', err);
                return res.status(500).json({ error: 'Failed to save session' });
            }
            console.log('Login successful, session created and saved:', req.session.user);
            
            if (user.role === 'admin') {
                return res.json({
                    success: true,
                    isAdmin: true,
                    message: "Admin login successful"
                });
            }

            if (!user.isProfileComplete) {
                return res.json({
                    success: true,
                    profileSetupRequired: true,
                    message: "Profile setup required"
                });
            }

            res.json({ 
                success: true, 
                profileSetupRequired: false,
                username: user.username,
                message: "Login successful"
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});



app.get('/unapproved-faculty', async (req, res) => {
    try {
        const unapprovedFaculty = await User.find({ role: 'faculty', isApproved: false });
        res.json(unapprovedFaculty);
    } catch (error) {
        console.error('Error getting unapproved faculty:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/approve-faculty', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'faculty') {
            return res.status(400).json({ message: 'User is not a faculty member' });
        }

        user.isApproved = true;
        await user.save();

        res.json({ success: true, message: 'Faculty member approved' });
    } catch (error) {
        console.error('Error approving faculty:', error);
        res.status(500).json({ error: error.message });
    }
});

function isAdmin(req, res, next) {
    if (req.session.user && req.session.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Admins only' });
    }
}

app.get('/api/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/users/:id', isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        await User.findByIdAndDelete(userId);
        // Also delete user's messages
        await Message.deleteMany({ sender: userId });
        res.json({ success: true, message: 'User and their messages deleted.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/messages', isAdmin, async (req, res) => {
    try {
        const messages = await Message.find().populate('sender', 'username');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/messages/:id', isAdmin, async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Message deleted.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/user", async (req, res) => {
    console.log('User route accessed. Session user:', req.session.user);
    if (req.session.user) {
        try {
            const user = await User.findOne({ username: req.session.user });
            if (user) {
                console.log('User found in DB:', user.username);
                res.json(user);
            } else {
                console.log('User not found in DB for session user:', req.session.user);
                req.session.destroy(() => {
                    res.status(401).json({ error: 'Unauthorized - User not found' });
                });
            }
        } catch (error) {
            console.error('Error fetching user in /user route:', error);
            res.status(500).json({ error: error.message });
        }
    } else {
        console.log('No session user found. Unauthorized.');
        res.status(401).json({ error: 'Unauthorized' });
    }
});

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

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true });
    });
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
