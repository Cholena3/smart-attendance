import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import NotificationBell from '../components/NotificationBell';

export default function Home() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState([]);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [futurePresent, setFuturePresent] = useState(0);
  const [futureAbsent, setFutureAbsent] = useState(0);

  useEffect(() => {
    api.get('/sessions/student/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
    api.get('/sessions/student/history').then(({ data }) => setHistory(data.history)).catch(() => {});
  }, []);

  const startScanner = async () => {
    setScanning(true);
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        scanner.stop().then(() => {
          setScanning(false);
          try {
            const url = new URL(decodedText);
            navigate(url.pathname + url.search);
          } catch {
            const code = decodedText.split('/mark/')[1]?.split('?')[0] || decodedText;
            navigate(`/mark/${code}`);
          }
        });
      },
    ).catch(() => setScanning(false));
  };

  const stopScanner = () => {
    scannerRef.current?.stop().then(() => setScanning(false)).catch(() => setScanning(false));
  };

  const handleManual = (e) => {
    e.preventDefault();
    if (manualCode.trim()) navigate(`/mark/${manualCode.trim()}`);
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const projectedPct = () => {
    if (!selectedSubject) return 0;
    const attended = selectedSubject.attended + (parseInt(futurePresent) || 0);
    const total = selectedSubject.total + (parseInt(futurePresent) || 0) + (parseInt(futureAbsent) || 0);
    return total === 0 ? 0 : ((attended / total) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-green-600">Smart Attendance</h1>
        <div className="flex items-center gap-4">
          <Link to="/timetable" className="text-sm text-green-600 hover:underline">📅 Timetable</Link>
          <NotificationBell />
          <span className="text-sm text-gray-600">{user.name} ({user.rollNumber})</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </nav>

      <div className="bg-white border-b flex justify-center gap-1 px-4 py-2">
        {[
          { key: 'dashboard', label: '📊 Dashboard' },
          { key: 'scan', label: '📷 Scan QR' },
          { key: 'history', label: '📋 History' },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab.key ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <main className="max-w-md mx-auto p-6">
        {activeTab === 'dashboard' && (
          <>
            <h2 className="font-semibold mb-3">Your Attendance</h2>
            {stats.length === 0 && <p className="text-gray-400 text-center py-6">No attendance data yet. Scan a QR to get started.</p>}
            <div className="space-y-3 mb-6">
              {stats.map((s) => (
                <div key={s.subject} className="bg-white p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-medium">{s.subject}</p>
                      <p className="text-xs text-gray-500">{s.attended}/{s.total} classes</p>
                    </div>
                    <p className={`text-lg font-bold ${s.percentage >= 75 ? 'text-green-600' : 'text-red-500'}`}>{s.percentage}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all ${s.percentage >= 75 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                  </div>
                  <p className={`text-xs ${s.status === 'safe' ? 'text-green-600' : s.status === 'low' ? 'text-red-500' : 'text-gray-500'}`}>
                    {s.advice}
                  </p>
                </div>
              ))}
            </div>
            {stats.length > 0 && (
              <div className="bg-white p-5 rounded-xl shadow-sm">
                <h3 className="font-semibold mb-3">🔮 What-If Predictor</h3>
                <select onChange={(e) => { setSelectedSubject(stats.find((st) => st.subject === e.target.value) || null); setFuturePresent(0); setFutureAbsent(0); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm mb-3 outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select a subject...</option>
                  {stats.map((s) => <option key={s.subject} value={s.subject}>{s.subject}</option>)}
                </select>
                {selectedSubject && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500">Future Present</label>
                        <input type="number" min="0" value={futurePresent} onChange={(e) => setFuturePresent(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Future Absent</label>
                        <input type="number" min="0" value={futureAbsent} onChange={(e) => setFutureAbsent(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                    </div>
                    <div className="text-center py-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Projected Attendance</p>
                      <p className={`text-2xl font-bold ${projectedPct() >= 75 ? 'text-green-600' : 'text-red-500'}`}>{projectedPct()}%</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'scan' && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">Mark Attendance</h2>
            {scanning ? (
              <div>
                <div id="qr-reader" className="rounded-lg overflow-hidden mb-3"></div>
                <button onClick={stopScanner} className="w-full bg-red-500 text-white py-2 rounded-lg text-sm">Stop Scanner</button>
              </div>
            ) : (
              <button onClick={startScanner} className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium mb-4">
                📷 Scan QR Code
              </button>
            )}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t"></div></div>
              <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-gray-400">or enter code manually</span></div>
            </div>
            <form onSubmit={handleManual} className="flex gap-2">
              <input type="text" placeholder="Enter session code"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} maxLength={8} />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Go</button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <>
            <h2 className="font-semibold mb-3">Attendance History</h2>
            <div className="space-y-2">
              {history.length === 0 && <p className="text-gray-400 text-center py-4">No attendance records yet</p>}
              {history.map((h) => (
                <div key={h.id} className="bg-white p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{h.subject}</p>
                      <p className="text-xs text-gray-500">by {h.teacher}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString()}</p>
                      <p className="text-xs text-green-600">{h.distance}m away</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
