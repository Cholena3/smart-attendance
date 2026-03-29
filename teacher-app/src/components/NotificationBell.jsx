import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time notifications via Socket.IO
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    if (user.id) {
      socket.emit('user:join', user.id);
      socket.on('notification:new', (notif) => {
        setNotifications((prev) => [notif, ...prev].slice(0, 50));
        setUnreadCount((prev) => prev + 1);
      });
    }

    return () => socket.disconnect();
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const iconForType = (type) => {
    switch (type) {
      case 'session_started': return '🟢';
      case 'flagged_entry': return '⚠️';
      case 'low_attendance': return '🔴';
      case 'session_expired': return '⏰';
      case 'attendance_marked': return '✅';
      default: return '🔔';
    }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-600 hover:text-blue-600 transition"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center px-4 py-3 border-b">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div key={n._id}
                  onClick={() => !n.read && markRead(n._id)}
                  className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition ${!n.read ? 'bg-blue-50' : ''}`}>
                  <div className="flex gap-2 items-start">
                    <span className="text-lg">{iconForType(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-semibold' : 'text-gray-700'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
