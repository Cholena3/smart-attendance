import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: '', radiusMeters: 100, durationMinutes: 10 });
  const [createdSession, setCreatedSession] = useState(null);
  const [liveQr, setLiveQr] = useState(null);
  const [liveToken, setLiveToken] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const qrIntervalRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [filterSubject, filterStatus, filterFrom, filterTo]);

  // Cleanup QR rotation on unmount
  useEffect(() => () => { if (qrIntervalRef.current) clearInterval(qrIntervalRef.current); }, []);

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSubject) params.set('subject', filterSubject);
      if (filterStatus) params.set('status', filterStatus);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      const { data } = await api.get(`/sessions/my-sessions?${params}`);
      setSessions(data.sessions);
      if (data.subjects) setSubjects(data.subjects);
    } catch {
      setError('Failed to load sessions');
    }
  };

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true }
      );
    });

  const startQrRotation = (sessionId) => {
    if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    const fetchQr = async () => {
      try {
        const { data } = await api.get(`/sessions/${sessionId}/qr`);
        setLiveQr(data.qrDataUrl);
        setLiveToken(data.token);
      } catch {
        // Session expired or closed — stop rotating
        clearInterval(qrIntervalRef.current);
      }
    };
    fetchQr();
    qrIntervalRef.current = setInterval(fetchQr, 15000); // refresh every 15s (token valid 30s + grace)
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loc = await getLocation();
      setLocation(loc);
      const { data } = await api.post('/sessions', { ...form, ...loc });
      setCreatedSession(data.session);
      setLiveQr(data.qrDataUrl);
      setLiveToken(data.token);
      setSessions((prev) => [data.session, ...prev]);
      // Start rotating QR
      startQrRotation(data.session._id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, sessionId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    try {
      await api.delete(`/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch {
      setError('Failed to delete session');
    }
  };

  const clearFilters = () => { setFilterSubject(''); setFilterStatus(''); setFilterFrom(''); setFilterTo(''); };
  const hasFilters = filterSubject || filterStatus || filterFrom || filterTo;
  const logout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Smart Attendance</h1>
        <div className="flex items-center gap-4">
          <Link to="/analytics" className="text-sm text-blue-600 hover:underline">📊 Analytics</Link>
          <span className="text-sm text-gray-600">Hi, {user.name}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {error && <p className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</p>}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Your Sessions</h2>
          <button
            onClick={() => { setShowCreate(!showCreate); setCreatedSession(null); setLiveQr(null); if (qrIntervalRef.current) clearInterval(qrIntervalRef.current); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            {showCreate ? 'Cancel' : '+ New Session'}
          </button>
        </div>

        {showCreate && (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            {createdSession ? (
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2 text-green-600">Session Active — QR Rotating Every 30s</h3>
                <p className="text-sm text-gray-500 mb-1">Show this on the projector. It auto-refreshes.</p>
                <p className="text-xs text-orange-500 mb-4">Screenshots won't work — QR changes every 30 seconds</p>
                {liveQr && <img src={liveQr} alt="QR Code" className="mx-auto w-72 h-72" />}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-xs text-gray-400">Current token:</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{liveToken}</span>
                  <span className="animate-pulse text-green-500 text-xs">● Live</span>
                </div>
                <div className="mt-3 bg-gray-50 p-3 rounded-lg inline-block">
                  <p className="text-sm text-gray-500">Session Code</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-blue-700">{createdSession.code}</p>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Location: {location?.latitude.toFixed(4)}, {location?.longitude.toFixed(4)}
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  type="text" placeholder="Subject (e.g. Data Structures)" required
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Radius (meters)</label>
                    <input type="number" min="10" max="500"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: +e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Duration (minutes)</label>
                    <input type="number" min="1" max="120"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50">
                  {loading ? 'Getting location & creating...' : 'Create Session (uses your current location)'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {hasFilters && <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline mt-2">Clear all filters</button>}
        </div>

        {/* Session List */}
        <div className="space-y-3">
          {sessions.length === 0 && (
            <p className="text-gray-400 text-center py-8">{hasFilters ? 'No sessions match your filters' : 'No sessions yet. Create one!'}</p>
          )}
          {sessions.map((s) => (
            <div key={s._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition">
              <Link to={`/session/${s._id}`} className="block p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{s.subject}</h3>
                    <p className="text-xs text-gray-400 font-mono">Code: {s.code}</p>
                    <p className="text-sm text-gray-500">{new Date(s.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active ? 'Active' : 'Closed'}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {s.attendees?.length || 0} students
                        {s.attendees?.some((a) => a.flagged) && <span className="text-orange-500 ml-1">⚠️</span>}
                      </p>
                    </div>
                    <button onClick={(e) => handleDelete(e, s._id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition" title="Delete session">
                      🗑️
                    </button>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
