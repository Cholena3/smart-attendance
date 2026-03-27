import { Router } from 'express';
import Subject from '../models/Subject.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Teacher: create a subject
router.post('/', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const { name, code, minAttendancePct } = req.body;
    const subject = await Subject.create({
      name, code, teacher: req.user._id, minAttendancePct,
    });
    res.status(201).json({ subject });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Subject code already exists' });
    res.status(400).json({ error: err.message });
  }
});

// Teacher: get their subjects
router.get('/', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const subjects = await Subject.find({ teacher: req.user._id }).sort({ name: 1 });
    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: update a subject
router.patch('/:id', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true }
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json({ subject });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Teacher: delete a subject
router.delete('/:id', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
