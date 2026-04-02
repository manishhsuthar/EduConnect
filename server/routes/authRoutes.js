require('dotenv').config();
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const prisma = require('../utils/prisma');
const { toIntId, toPublicUser } = require('../utils/dbTransform');
const { protect } = require('../middleware/authMiddleware');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const sendResetEmail = async (email, link) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const sendSmtpEmail = {
    to: [{ email }],
    sender: { email: process.env.SENDER_EMAIL, name: 'EduConnect' },
    subject: 'Reset your EduConnect password',
    htmlContent: `<p>Click <a href="${link}">here</a> to reset your password. This link expires in 15 minutes.</p>`,
  };
  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

const sanitizeProfileData = (data) => {
  const updateData = {};

  if (typeof data.username === 'string' && data.username.trim()) {
    updateData.username = data.username.trim();
  }
  if (typeof data.department === 'string') updateData.department = data.department.trim() || null;
  if (typeof data.year === 'string') updateData.year = data.year.trim() || null;
  if (typeof data.college === 'string') updateData.college = data.college.trim() || null;
  if (typeof data.division === 'string') updateData.division = data.division.trim() || null;
  if (typeof data.enrollmentNumber === 'string') updateData.enrollmentNumber = data.enrollmentNumber.trim() || null;
  if (typeof data.semester === 'string') updateData.semester = data.semester.trim() || null;

  if (typeof data.subjects === 'string') {
    updateData.subjects = data.subjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(data.subjects)) {
    updateData.subjects = data.subjects.map((s) => String(s).trim()).filter(Boolean);
  }

  return updateData;
};

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (_req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email: String(email || '').trim().toLowerCase() },
      select: { id: true, email: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = jwt.sign({ id: String(user.id) }, process.env.RESET_TOKEN_SECRET, { expiresIn: '15m' });
    const link = `${process.env.CLIENT_URL}/reset-password.html?token=${token}`;
    await sendResetEmail(user.email, link);
    return res.json({ message: 'Reset email sent' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
    const userId = toIntId(decoded.id);
    if (!userId) return res.status(400).json({ message: 'Invalid or expired token' });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: String(username || '').trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: String(role || 'student').toLowerCase(),
        isApproved: String(role || '').toLowerCase() === 'student',
      },
    });

    const requiresApproval = newUser.role === 'faculty';

    if (!requiresApproval) {
      const token = jwt.sign({ userId: String(newUser.id) }, process.env.JWT_SECRET || 'your_default_secret', {
        expiresIn: '1h',
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      req.session.user = {
        id: String(newUser.id),
        username: newUser.username,
        role: newUser.role,
      };
      req.session.userId = String(newUser.id);
    } else {
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

    return res.status(201).json({
      success: true,
      message: requiresApproval
        ? 'Registration successful. Your faculty account is pending admin approval.'
        : 'User registered successfully',
      requiresApproval,
      user: toPublicUser(newUser),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/profile-setup', protect, upload.single('profilePhoto'), async (req, res) => {
  try {
    const userId = toIntId(req.user.id);
    if (!userId) return res.status(404).json({ message: 'User not found' });

    const profileData = sanitizeProfileData(req.body);
    if (req.file) {
      profileData.profilePhoto = `/uploads/${req.file.filename}`;
    }
    profileData.isProfileComplete = true;

    const user = await prisma.user.update({
      where: { id: userId },
      data: profileData,
    });

    await prisma.notification.create({
      data: {
        userId,
        title: 'Profile completed',
        body: 'Your profile setup is complete. Welcome to EduConnect.',
        type: 'system',
        link: '/dashboard',
      },
    });

    return res.json({ message: 'Profile setup successful', user: toPublicUser(user) });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const userId = toIntId(req.user.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(toPublicUser(user));
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/account', protect, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const userId = toIntId(req.user.id);
    if (!userId) return res.status(404).json({ message: 'User not found' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updateData = {};

    if (typeof username === 'string' && username.trim()) {
      updateData.username = username.trim();
    }

    if (typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email.toLowerCase()) {
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing && existing.id !== user.id) {
          return res.status(400).json({ message: 'Email is already in use' });
        }
        updateData.email = normalizedEmail;
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
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Account settings updated',
        body: 'Your account information was updated successfully.',
        type: 'system',
        link: '/dashboard',
      },
    });

    return res.json({
      message: 'Account updated successfully',
      user: toPublicUser(updatedUser),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: String(email || '').trim().toLowerCase() },
    });

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

    const token = jwt.sign({ userId: String(user.id) }, process.env.JWT_SECRET || 'your_default_secret', {
      expiresIn: '1h',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    req.session.user = {
      id: String(user.id),
      username: user.username,
      role: user.role,
    };
    req.session.userId = String(user.id);

    return res.json({ message: 'Logged in successfully', user: toPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
