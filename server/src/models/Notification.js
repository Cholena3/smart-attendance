import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['session_started', 'low_attendance', 'flagged_entry', 'session_expired', 'attendance_marked'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed }, // extra data like sessionId, subject, etc.
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

export default mongoose.model('Notification', notificationSchema);
