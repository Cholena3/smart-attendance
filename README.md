# Smart Attendance — QR + Geofencing

Classroom attendance system where teachers generate time-limited, location-bound QR codes and students can only mark attendance if they're physically present in the classroom.

## Tech Stack
- **Backend:** Node.js, Express, Socket.IO, MongoDB, JWT
- **Teacher Dashboard:** React + Vite + Tailwind CSS
- **Student App:** React PWA + QR Scanner + Geolocation API

## Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

## Quick Start

```bash
# 1. Install all dependencies
cd server && npm install && cd ..
cd teacher-app && npm install && cd ..
cd student-app && npm install && cd ..

# 2. Start MongoDB (if local)
mongod

# 3. Start the server
cd server && npm run dev

# 4. In a new terminal — start teacher dashboard
cd teacher-app && npm run dev

# 5. In another terminal — start student app
cd student-app && npm run dev
```

- Teacher dashboard: http://localhost:5173
- Student app: http://localhost:5174
- API server: http://localhost:5000

## How It Works
1. Teacher logs in, creates an attendance session (picks subject, radius, duration)
2. System captures teacher's GPS location and generates a QR code
3. Teacher displays QR code on projector/screen
4. Students scan QR with their phone (or enter the code manually)
5. System checks if the student is within the allowed radius using Haversine formula
6. If inside the geofence → attendance marked. If outside → rejected with distance info
7. Teacher sees students appearing in real-time via Socket.IO
