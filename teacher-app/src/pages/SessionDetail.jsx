import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [liveQr, setLiveQr] = useState(null);
  const [liveToken, setLiveToken] = useState('');
  const [showQr, setShowQr] = useState(false);
  const qrIntervalRef = useRef(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await api.get(`/sessions/${id}`);
        setSession(data.session);
      } catch {
        setError('Failed to load session');
      }
    };
    fetchSession();

    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socket.emit('session:join', id);
    socket.on('attendance:new', (attendee) => {
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, attendees: [...prev.attendees, attendee] };
      });
    });

    return () => {
      socket.disconnect();
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    };
  }, [id]);

  const toggleQr = () => {
    if (showQr) {
      setShowQr(false);
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
      return;
    }
    setShowQr(true);
    const fetchQr = async () => {
      try {
        const { data } = await api.get(`/sessions/${id}/qr`);
        setLiveQr(data.qrDataUrl);
        setLiveToken(data.token);
      } catch {
        clearInterval(qrIntervalRef.current);
        setShowQr(false);
      }
    };
    fetchQr();
    qrIntervalRef.current = setInterval(fetchQr, 15000);
  };

  const handleClose = async () => {
    try {
      await api.patch(`/sessions/${id}/close`);
      setSession((prev) => ({ ...prev, active: false }));
      setShowQr(false);
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    } catch {
      setError('Failed to close session');
    }
  };

  const handleExport = () => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.open(`${base}/sessions/${id}/export?token=${localStorage.getItem('token')}`, '_blank');
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!session) return <div className="p-6 text-gray-400">Loading...</div>;

  const flaggedCount = session.attendees?.filter((a) => a.flagged).length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-blue-600 hover:underline text-sm">&larr; Back to Dashboard</Link>
        <div className="flex gap-2">
          {session.active && (
            <>
              <button onClick={toggleQr} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
                {showQr ? 'Hide QR' : '📱 Show Live QR'}
              </button>
              <button onClick={handleClose} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">
                Close Session
              </button>
            </>
          )}
          <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            📥 Export CSV
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {/* Live Rotating QR */}
        {showQr && liveQr && (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6 text-center">
            <h3 className="font-semibold text-lg mb-1 text-blue-600">Live QR — Rotating Every 30s</h3>
            <p className="text-xs text-orange-500 mb-3">Screenshots won't work</p>
            <img src={liveQr} alt="Live QR" className="mx-auto w-72 h-72" />
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{liveToken}</span>
              <span className="animate-pulse text-green-500 text-xs">● Live</span>
            </div>
          </div>
        )}

        {/* Session Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{session.subject}</h2>
              <p className="text-sm text-gray-500 mt-1">Code: <span className="font-mono">{session.code}</span></p>
              <p className="text-sm text-gray-500">Radius: {session.radiusMeters}m</p>
              <p className="text-sm text-gray-500">Created: {new Date(session.createdAt).toLocaleString()}</p>
              <p className="text-sm text-gray-500">Expires: {new Date(session.expiresAt).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className={`text-sm px-3 py-1 rounded-full ${session.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {session.active ? 'Active' : 'Closed'}
              </span>
              {flaggedCount > 0 && (
                <p className="text-sm text-orange-500 mt-2">⚠️ {flaggedCount} flagged</p>
              )}
            </div>
          </div>
        </div>

        {/* Attendees Table */}
        <h3 className="font-semibold mb-3">Attendees ({session.attendees?.length || 0})</h3>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {session.attendees?.length === 0 ? (
            <p className="p-6 text-gray-400 text-center">No students yet. Waiting for scans...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">#</th>
                  <th className="text-left p-3 font-medium text-gray-600">Name</th>
                  <th className="text-left p-3 font-medium text-gray-600">Roll No.</th>
                  <th className="text-left p-3 font-medium text-gray-600">Distance</th>
                  <th className="text-left p-3 font-medium text-gray-600">Time</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {session.attendees.map((a, i) => (
                  <tr key={i} className={`border-t ${a.flagged ? 'bg-orange-50' : ''}`}>
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3">{a.student?.name || a.student?.id}</td>
                    <td className="p-3">{a.student?.rollNumber || '—'}</td>
                    <td className="p-3">{a.distanceMeters}m</td>
                    <td className="p-3">{new Date(a.markedAt).toLocaleTimeString()}</td>
                    <td className="p-3">
                      {a.flagged ? (
                        <span className="text-orange-600 text-xs" title={a.flagReason}>⚠️ {a.flagReason}</span>
                      ) : (
                        <span className="text-green-600 text-xs">✓ Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
