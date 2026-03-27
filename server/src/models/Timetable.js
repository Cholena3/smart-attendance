import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "10:00"
  isLab: { type: Boolean, default: false },
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  slots: [slotSchema],
}, { timestamps: true });

timetableSchema.index({ teacher: 1, day: 1 }, { unique: true });

export default mongoose.model('Timetable', timetableSchema);
