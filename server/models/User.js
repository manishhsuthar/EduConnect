const mongoose = require('mongoose');

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
  enrollmentNumber: String,
  semester: String,
  year: String,
  division: String,
  college: String,
  areasOfInterest: [String],
  skills: [String],
  profilePhoto: String,

  // Faculty-specific fields
  employeeId: String,
  designation: String,
  subjectsTaught: [String],
  subjects: [String],
  officeLocation: String,

  // Common fields
  department: String,
  
  // Profile completion status
  isProfileComplete: { type: Boolean, default: false },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
