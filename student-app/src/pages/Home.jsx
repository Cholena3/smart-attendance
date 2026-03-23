import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Home() {
  const [history, setHistory] = useState([]);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/sessions/student/history').then(({ data }) => setHistory(data.history)).catch(() => {});
  }, []);

  const startScanner = async () => {
    setScanning(true);
    // Dynamically import to avoid SSR issues
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        scanner.stop().then(() => {
          setScanning(false);
          // Extract path from URL like http://localhost:5174/mark/ABC12345?t=TOKEN
          try {
            const url = new URL(decodedText);
            navigate(url.pathname + url.search);
          } catch {
            // Fallback: treat as plain code
            const code = decodedText.split('/mark/')[1]?.split('?')[0] || decodedText;
            navigate(`/mark/${code}`);
          }
        });
      },
    ).catch((err) => {
      console.error('Scanner error:', err);
      setScanning(false);
    });
  };

  const stopScanner = () => {
    scannerRef.current?.stop().then(() => setScanning(false)).catch(() => setScanning(false));
  };

  const handleManual = (e) => {
    e.preventDefault();
    if (manualCode.trim()) navigate(`/mark/${manualCode.trim()}`);
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-green-600">Smart Attendance</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.name} ({user.rollNumber})</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </nav>

      <main className="max-w-md mx-auto p-6">
        {/* QR Scanner */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="font-semibold mb-4">Mark Attendance</h2>

          {scanning ? (
            <div>
              <div id="qr-reader" className="rounded-lg overflow-hidden mb-3"></div>
              <button onClick={stopScanner} className="w-full bg-red-500 text-white py-2 rounded-lg text-sm">
                Stop Scanner
              </button>
            </div>
          ) : (
            <button
              onClick={startScanner}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium mb-4"
            >
              📷 Scan QR Code
            </button>
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t"></div></div>
            <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-gray-400">or enter code manually</span></div>
          </div>

          <form onSubmit={handleManual} className="flex gap-2">
            <input
              type="text" placeholder="Enter session code"
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
              value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
              Go
            </button>
          </form>
        </div>

        {/* History */}
        <h2 className="font-semibold mb-3">Your History</h2>
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
      </main>
    </div>
  );
}
