import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/session.js';
import subjectRoutes from './routes/subject.js';
import timetableRoutes from './routes/timetable.js';
import notificationRoutes from './routes/notification.js';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  ...(process.env.CLIENT_URLS?.split(',').map(u => u.trim()) || []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any vercel.app or onrender.com subdomain, plus explicit list
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com')
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Socket.IO for real-time attendance updates
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

io.on('connection', (socket) => {
  // Teachers join a room for their session to get live updates
  socket.on('session:join', (sessionId) => {
    socket.join(`session:${sessionId}`);
  });

  // Users join their personal room for notifications
  socket.on('user:join', (userId) => {
    socket.join(`user:${userId}`);
  });
});

app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
