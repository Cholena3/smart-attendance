import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Home() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState([]);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | scan | history
  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // What-if predictor state
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
