const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    body: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ['general', 'approval', 'message', 'system'],
      default: 'general',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    link: {
      type: String,
      default: '',
      trim: true,
      maxlength: 255,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
