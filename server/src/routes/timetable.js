import { Router } from 'express';
import Timetable from '../models/Timetable.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Teacher: set/update timetable for a day
router.put('/:day', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const { slots } = req.body;
    const timetable = await Timetable.findOneAndUpdate(
      { teacher: req.user._id, day: req.params.day },
      { slots },
      { new: true, upsert: true }
    );
    res.json({ timetable });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Teacher: get their full weekly timetable
router.get('/', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const timetables = await Timetable.find({ teacher: req.user._id })
      .populate('slots.subject', 'name code')
      .sort({ day: 1 });
    res.json({ timetables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student: get timetable for all their teachers (based on sessions they've attended)
router.get('/student', authenticate, requireRole('student'), async (req, res) => {
  try {
    // Find all teachers whose sessions this student has attended
    const Session = (await import('../models/Session.js')).default;
    const sessions = await Session.find({ 'attendees.student': req.user._id }).distinct('teacher');

    const timetables = await Timetable.find({ teacher: { $in: sessions } })
      .populate('slots.subject', 'name code')
      .sort({ day: 1 });
    res.json({ timetables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
