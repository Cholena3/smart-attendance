import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true }, // short code for QR
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radiusMeters: { type: Number, default: 100 },
  expiresAt: { type: Date, required: true },
  active: { type: Boolean, default: true },
  attendees: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedAt: { type: Date, default: Date.now },
    latitude: Number,
    longitude: Number,
    distanceMeters: Number,
    deviceFingerprint: String,
    flagged: { type: Boolean, default: false }, // suspicious activity
    flagReason: String,
  }],
}, { timestamps: true });

// Virtual to check if session is still valid
sessionSchema.virtual('isExpired').get(function () {
  return new Date() > this.expiresAt;
});

export default mongoose.model('Session', sessionSchema);
