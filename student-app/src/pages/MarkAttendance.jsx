import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import { getDeviceFingerprint } from '../utils/fingerprint';

export default function MarkAttendance() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t') || ''; // rotating token from QR
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [distance, setDistance] = useState(null);
  const [flagged, setFlagged] = useState(false);

  // If no token in URL, show manual token input
  const [manualToken, setManualToken] = useState(token);

  useEffect(() => {
    setManualToken(token);
  }, [token]);

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          locationMeta: {
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            // Some browsers expose this on Android
            isMocked: pos.coords.isMocked || false,
          },
        }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });

  const markAttendance = async () => {
    const activeToken = manualToken || token;
    if (!activeToken) {
      setStatus('error');
      setMessage('No QR token found. Please scan the live QR code from the projector.');
      return;
    }

    setStatus('loading');
    try {
      const { latitude, longitude, locationMeta } = await getLocation();
      const deviceFingerprint = await getDeviceFingerprint();

      const { data } = await api.post(`/sessions/${code}/attend`, {
        latitude, longitude, token: activeToken, deviceFingerprint, locationMeta,
      });

      setStatus('success');
      setMessage(data.message);
      setDistance(data.distance);
      setFlagged(data.flagged || false);
    } catch (err) {
      setStatus('error');
      const errData = err.response?.data;
      if (errData?.distance) {
        setMessage(`${errData.error}. You are ${errData.distance}m away (max: ${errData.maxAllowed}m)`);
      } else {
        setMessage(errData?.error || err.message || 'Failed to mark attendance');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-xl font-bold mb-2">Mark Attendance</h1>
        <p className="text-gray-500 mb-1">Session: <span className="font-mono font-bold text-lg">{code}</span></p>
        {token && <p className="text-xs text-green-600 mb-4">✓ QR token detected</p>}
        {!token && <p className="text-xs text-orange-500 mb-4">No QR token — you may need to scan the live QR</p>}

        {status === 'idle' && (
          <div>
            {!token && (
              <div className="mb-4">
                <label className="text-sm text-gray-500 block mb-1">Enter token from QR (if you have it)</label>
                <input
                  type="text" placeholder="e.g. A3F2B1C9"
                  className="w-full px-4 py-2 border rounded-lg text-center font-mono uppercase focus:ring-2 focus:ring-green-500 outline-none"
                  value={manualToken} onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                  maxLength={8}
                />
              </div>
            )}
            <button
              onClick={markAttendance}
              className="w-full bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 transition font-medium text-lg"
            >
              📍 Confirm My Attendance
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="py-8">
            <div className="animate-spin w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Verifying location & identity...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6">
            <div className="text-5xl mb-4">{flagged ? '⚠️' : '✅'}</div>
            <p className={`font-semibold text-lg ${flagged ? 'text-orange-600' : 'text-green-600'}`}>{message}</p>
            {distance !== null && <p className="text-sm text-gray-500 mt-2">You were {distance}m from the classroom</p>}
            {flagged && <p className="text-xs text-orange-500 mt-2">Your attendance was flagged for review by the teacher</p>}
          </div>
        )}

        {status === 'error' && (
          <div className="py-6">
            <div className="text-5xl mb-4">❌</div>
            <p className="text-red-600 font-medium">{message}</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm hover:bg-gray-200"
            >
              Try Again
            </button>
          </div>
        )}

        <Link to="/" className="block mt-6 text-sm text-gray-400 hover:text-gray-600">&larr; Back to Home</Link>
      </div>
    </div>
  );
}
