import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  minAttendancePct: { type: Number, default: 75 },
}, { timestamps: true });

// One teacher can't have duplicate subject codes
subjectSchema.index({ teacher: 1, code: 1 }, { unique: true });

export default mongoose.model('Subject', subjectSchema);
