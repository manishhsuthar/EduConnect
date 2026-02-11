const mongoose = require('mongoose');
const { encryptValue, decryptValue } = require('../utils/fieldEncryption');

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Student-specific fields
  enrollmentNumber: {
    type: String,
    set: encryptValue,
    get: decryptValue,
  },
  semester: String,
  year: String,
  division: String,
  college: String,
  areasOfInterest: [String],
  skills: [String],
  profilePhoto: String,

  // Faculty-specific fields
  employeeId: {
    type: String,
    set: encryptValue,
    get: decryptValue,
  },
  designation: String,
  subjectsTaught: [String],
  subjects: [String],
  officeLocation: {
    type: String,
    set: encryptValue,
    get: decryptValue,
  },

  // Common fields
  department: String,
  
  // Profile completion status
  isProfileComplete: { type: Boolean, default: false },
}, {
  toJSON: { getters: true },
  toObject: { getters: true },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
