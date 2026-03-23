import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import Session from '../models/Session.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getDistanceMeters } from '../utils/geo.js';
import { generateRotatingToken, validateRotatingToken } from '../utils/token.js';

const router = Router();
const QR_SECRET = process.env.JWT_SECRET || 'qr-rotation-secret';

// Teacher: create attendance session
router.post('/', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const { subject, latitude, longitude, radiusMeters = 100, durationMinutes = 10 } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const code = uuidv4().slice(0, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const session = await Session.create({
      teacher: req.user._id, subject, code, latitude, longitude, radiusMeters, expiresAt,
    });

    // Generate initial rotating QR
    const token = generateRotatingToken(code, QR_SECRET);
    const studentUrl = `${process.env.CLIENT_URLS?.split(',')[1] || 'http://localhost:5174'}/mark/${code}?t=${token}`;
    const qrDataUrl = await QRCode.toDataURL(studentUrl, { width: 400 });

    res.status(201).json({ session, qrDataUrl, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Teacher: get current rotating QR for an active session
router.get('/:id/qr', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.active || new Date() > session.expiresAt) {
      return res.status(410).json({ error: 'Session expired' });
    }

    const token = generateRotatingToken(session.code, QR_SECRET);
    const studentUrl = `${process.env.CLIENT_URLS?.split(',')[1] || 'http://localhost:5174'}/mark/${session.code}?t=${token}`;
    const qrDataUrl = await QRCode.toDataURL(studentUrl, { width: 400 });

    res.json({ qrDataUrl, token, code: session.code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student: mark attendance (with rotating token + device fingerprint + anti-spoof)
router.post('/:code/attend', authenticate, requireRole('student'), async (req, res) => {
  try {
    const { latitude, longitude, token, deviceFingerprint, locationMeta } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const session = await Session.findOne({ code: req.params.code, active: true });
    if (!session) return res.status(404).json({ error: 'Session not found or expired' });

    if (new Date() > session.expiresAt) {
      session.active = false;
      await session.save();
      return res.status(410).json({ error: 'Session has expired' });
    }

    // Validate rotating token
    if (!token || !validateRotatingToken(token, session.code, QR_SECRET)) {
      return res.status(403).json({ error: 'Invalid or expired QR code. Please scan the latest QR.' });
    }

    // Check if already marked
    const alreadyMarked = session.attendees.some(
      (a) => a.student.toString() === req.user._id.toString()
    );
    if (alreadyMarked) return res.status(409).json({ error: 'Attendance already marked' });

    // Geofence check
    const distance = getDistanceMeters(session.latitude, session.longitude, latitude, longitude);
    if (distance > session.radiusMeters) {
      return res.status(403).json({
        error: 'You are outside the allowed area',
        distance: Math.round(distance),
        maxAllowed: session.radiusMeters,
      });
    }

    // Anti-spoofing checks
    let flagged = false;
    let flagReason = '';

    // Check if same device fingerprint used by another student in this session
    if (deviceFingerprint) {
      const duplicateDevice = session.attendees.find(
        (a) => a.deviceFingerprint === deviceFingerprint &&
               a.student.toString() !== req.user._id.toString()
      );
      if (duplicateDevice) {
        flagged = true;
        flagReason = 'Same device used by another student';
      }
    }

    // Check for mock location indicators
    if (locationMeta) {
      if (locationMeta.isMocked === true) {
        return res.status(403).json({ error: 'Mock location detected. Please disable mock locations.' });
      }
      // Very low accuracy can indicate spoofing
      if (locationMeta.accuracy && locationMeta.accuracy > 500) {
        flagged = true;
        flagReason = (flagReason ? flagReason + '; ' : '') + `Low GPS accuracy: ${locationMeta.accuracy}m`;
      }
    }

    session.attendees.push({
      student: req.user._id,
      latitude, longitude,
      distanceMeters: Math.round(distance),
      deviceFingerprint: deviceFingerprint || null,
      flagged,
      flagReason: flagReason || undefined,
    });
    await session.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`session:${session._id}`).emit('attendance:new', {
        student: { id: req.user._id, name: req.user.name, rollNumber: req.user.rollNumber },
        distanceMeters: Math.round(distance),
        markedAt: new Date(),
        flagged,
        flagReason,
      });
    }

    res.json({
      message: flagged ? 'Attendance marked (flagged for review)' : 'Attendance marked',
      distance: Math.round(distance),
      flagged,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: get their sessions
router.get('/my-sessions', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const { subject, from, to, status } = req.query;
    const filter = { teacher: req.user._id };
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    if (status === 'active') filter.active = true;
    if (status === 'closed') filter.active = false;

    const sessions = await Session.find(filter)
      .populate('attendees.student', 'name email rollNumber')
      .sort({ createdAt: -1 });
    const allSubjects = await Session.distinct('subject', { teacher: req.user._id });
    res.json({ sessions, subjects: allSubjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: get single session details
router.get('/:id', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, teacher: req.user._id })
      .populate('attendees.student', 'name email rollNumber');
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: manually close a session
router.patch('/:id/close', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { active: false },
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: delete a session
router.delete('/:id', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: export session as CSV
router.get('/:id/export', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, teacher: req.user._id })
      .populate('attendees.student', 'name email rollNumber');
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const header = 'S.No,Name,Roll Number,Email,Distance (m),Time,Flagged,Flag Reason\n';
    const rows = session.attendees.map((a, i) =>
      `${i + 1},"${a.student?.name || ''}","${a.student?.rollNumber || ''}","${a.student?.email || ''}",${a.distanceMeters},${new Date(a.markedAt).toLocaleString()},${a.flagged ? 'Yes' : 'No'},"${a.flagReason || ''}"`
    ).join('\n');

    const csv = header + rows;
    const filename = `${session.subject.replace(/\s+/g, '_')}_${new Date(session.createdAt).toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: analytics data
router.get('/analytics/overview', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const sessions = await Session.find({ teacher: req.user._id })
      .populate('attendees.student', 'name rollNumber')
      .sort({ createdAt: -1 });

    const totalSessions = sessions.length;
    const totalAttendances = sessions.reduce((sum, s) => sum + s.attendees.length, 0);
    const avgAttendance = totalSessions > 0 ? Math.round(totalAttendances / totalSessions) : 0;
    const flaggedCount = sessions.reduce(
      (sum, s) => sum + s.attendees.filter((a) => a.flagged).length, 0
    );

    // Attendance per session (for chart)
    const sessionTrend = sessions.slice(0, 20).reverse().map((s) => ({
      subject: s.subject,
      date: new Date(s.createdAt).toLocaleDateString(),
      count: s.attendees.length,
      flagged: s.attendees.filter((a) => a.flagged).length,
    }));

    // Per-subject breakdown
    const subjectMap = {};
    sessions.forEach((s) => {
      if (!subjectMap[s.subject]) subjectMap[s.subject] = { sessions: 0, totalAttendees: 0 };
      subjectMap[s.subject].sessions++;
      subjectMap[s.subject].totalAttendees += s.attendees.length;
    });
    const subjectBreakdown = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      sessions: data.sessions,
      avgAttendance: Math.round(data.totalAttendees / data.sessions),
    }));

    // Per-student frequency (top 20 most frequent)
    const studentMap = {};
    sessions.forEach((s) => {
      s.attendees.forEach((a) => {
        const key = a.student?._id?.toString() || 'unknown';
        if (!studentMap[key]) {
          studentMap[key] = { name: a.student?.name || 'Unknown', rollNumber: a.student?.rollNumber || '', count: 0, flagged: 0 };
        }
        studentMap[key].count++;
        if (a.flagged) studentMap[key].flagged++;
      });
    });
    const studentFrequency = Object.values(studentMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.json({
      totalSessions,
      totalAttendances,
      avgAttendance,
      flaggedCount,
      sessionTrend,
      subjectBreakdown,
      studentFrequency,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student: get their attendance history
router.get('/student/history', authenticate, requireRole('student'), async (req, res) => {
  try {
    const sessions = await Session.find({ 'attendees.student': req.user._id })
      .populate('teacher', 'name')
      .select('subject teacher createdAt attendees')
      .sort({ createdAt: -1 });

    const history = sessions.map((s) => {
      const myAttendance = s.attendees.find((a) => a.student.toString() === req.user._id.toString());
      return {
        id: s._id, subject: s.subject, teacher: s.teacher?.name,
        date: s.createdAt, markedAt: myAttendance?.markedAt, distance: myAttendance?.distanceMeters,
      };
    });
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
