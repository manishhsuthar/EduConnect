require('dotenv').config();
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');


// Import Brevo SDK
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Configure Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const sendResetEmail = async (email, link) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const sendSmtpEmail = {
    to: [{ email }],
    sender: { email: process.env.SENDER_EMAIL, name: 'EduConnect' },
    subject: 'Reset your EduConnect password',
    htmlContent: `<p>Click <a href="${link}">here</a> to reset your password. This link expires in 15 minutes.</p>`
  };

  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

// POST /forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log("➡️ Forgot Password request received");
  console.log("Email:", email);

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    console.log("process.env.RESET_TOKEN_SECRET:", process.env.RESET_TOKEN_SECRET);
    console.log("RESET_TOKEN_SECRET:", process.env.RESET_TOKEN_SECRET);

    const token = jwt.sign({ id: user._id }, process.env.RESET_TOKEN_SECRET, { expiresIn: '15m' });
    const link = `${process.env.CLIENT_URL}/reset-password.html?token=${token}`;

    console.log("Sending reset to:", email);
    console.log("Reset Link:", link);

    await sendResetEmail(email, link);

  } catch (err) {
    console.error('Error sending email:', err.message);
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
});

// POST /reset-password/:token
router.post('/reset-password/:token', async (req, res) =>  {
  const { token } = req.params;
  const { password } = req.body;

  try {
    console.log("Received token param:", token);
    // Debug log
    console.log("RESET_TOKEN_SECRET:", process.env.RESET_TOKEN_SECRET);

    const decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
    console.log("Decoded token:", decoded);
    const userId = decoded.id;
    console.log("User ID from token:", userId);

    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log("User found:", user.email);

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    console.log("User password updated and saved:", user.email);

    console.log('Password reset successful for user:', user.email);
    res.json({ message: 'Password reset successful' });
  } catch (err)  {
    console.error('Error in reset-password:', err && err.stack ? err.stack : err);

    res.status(400).json({ message: 'Invalid or expired token' });
  }
});

// POST /register
router.post("/register", async (req, res) => {
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
        const newUser = new User({ username, email, password: hashedPassword, role, isApproved: role === 'student' });
        await newUser.save();

        const requiresApproval = role === 'faculty';

        if (!requiresApproval) {
            const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET || 'your_default_secret', {
                expiresIn: '1h',
            });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });

            // Replace any previous session with the newly registered user.
            req.session.user = {
                id: newUser._id,
                username: newUser.username,
                role: newUser.role,
            };
            req.session.userId = newUser._id;
        } else {
            // Faculty must wait for admin approval before they can authenticate.
            res.cookie('token', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                expires: new Date(0),
            });
            if (req.session) {
                req.session.user = null;
                req.session.userId = null;
            }
        }
        
        res.status(201).json({
            success: true,
            message: requiresApproval
                ? "Registration successful. Your faculty account is pending admin approval."
                : "User registered successfully",
            requiresApproval,
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                isApproved: newUser.isApproved,
                isProfileComplete: newUser.isProfileComplete,
                department: newUser.department,
                year: newUser.year,
                subjects: newUser.subjects,
                profilePhoto: newUser.profilePhoto,
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});


const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// POST /profile-setup
router.post('/profile-setup', protect, upload.single('profilePhoto'), async (req, res) => {
  const { userId: _ignoredUserId, ...profileData } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.file) {
      user.profilePhoto = `/uploads/${req.file.filename}`;
    }

    // Update user with all the data sent from the frontend
    Object.assign(user, profileData);
    user.isProfileComplete = true;

    await user.save();

    await Notification.create({
      user: user._id,
      title: 'Profile completed',
      body: 'Your profile setup is complete. Welcome to EduConnect.',
      type: 'system',
      link: '/dashboard',
    });

    res.json({ message: 'Profile setup successful' });
  } catch (err) {
    console.error('Error in profile-setup:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /me
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /account
router.put('/account', protect, async (req, res) => {
    try {
        const { username, email, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (typeof username === 'string' && username.trim()) {
            user.username = username.trim();
        }

        if (typeof email === 'string' && email.trim()) {
            const normalizedEmail = email.trim().toLowerCase();
            if (normalizedEmail !== user.email?.toLowerCase()) {
                const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
                if (existing) {
                    return res.status(400).json({ message: 'Email is already in use' });
                }
                user.email = normalizedEmail;
            }
        }

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
            if (String(newPassword).length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters' });
            }
            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();

        await Notification.create({
            user: user._id,
            title: 'Account settings updated',
            body: 'Your account information was updated successfully.',
            type: 'system',
            link: '/dashboard',
        });

        return res.json({
            message: 'Account updated successfully',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isApproved: user.isApproved,
                isProfileComplete: user.isProfileComplete,
                department: user.department,
                year: user.year,
                subjects: user.subjects,
                profilePhoto: user.profilePhoto,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update account' });
    }
});

// POST /login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.role === 'faculty' && !user.isApproved) {
            return res.status(403).json({ message: 'Your faculty account is pending admin approval.' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your_default_secret', {
            expiresIn: '1h',
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        // Set user session
        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role,
        };
        req.session.userId = user._id;


        res.json({ message: 'Logged in successfully', user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /logout
router.post('/logout', (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
