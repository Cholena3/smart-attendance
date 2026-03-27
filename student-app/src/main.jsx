import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import MarkAttendance from './pages/MarkAttendance.jsx';
import Timetable from './pages/Timetable.jsx';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/mark/:code" element={<ProtectedRoute><MarkAttendance /></ProtectedRoute>} />
        <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
