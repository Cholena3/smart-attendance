import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Analytics() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [students, setStudents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const { data } = await api.get(`/sessions/analytics/overview?${params}`);
      setData(data);
    } catch {} finally { setLoading(false); }
  };

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/sessions/analytics/students');
      setStudents(data);
    } catch {}
  };

  useEffect(() => { fetchOverview(); }, []);
  useEffect(() => { if (tab === 'students' && !students) fetchStudents(); }, [tab]);

  if (loading && !data) return <div className="p-6 text-gray-400">Loading analytics...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-blue-600 hover:underline text-sm">&larr; Dashboard</Link>
        <h1 className="text-lg font-bold text-blue-600">📊 Analytics</h1>
      </nav>

      {/* Tabs */}
      <div className="bg-white border-b flex justify-center gap-1 px-4 py-2">
        {[{ key: 'overview', label: '📈 Overview' }, { key: 'students', label: '👥 Student Reports' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="max-w-5xl mx-auto p-6">
        {tab === 'overview' && data && <OverviewTab data={data} dateFrom={dateFrom} dateTo={dateTo}
          setDateFrom={setDateFrom} setDateTo={setDateTo} onFilter={fetchOverview} />}
        {tab === 'students' && <StudentReportsTab data={students} />}
      </main>
    </div>
  );
}

function OverviewTab({ data, dateFrom, dateTo, setDateFrom, setDateTo, onFilter }) {
  return (
    <>
      {/* Date Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs text-gray-500 block mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={onFilter} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Filter</button>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(onFilter, 0); }}
            className="text-xs text-blue-600 hover:underline">Clear</button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card value={data.totalSessions} label="Total Sessions" color="text-blue-600" />
        <Card value={data.totalAttendances} label="Total Check-ins" color="text-green-600" />
        <Card value={data.avgAttendance} label="Avg per Session" color="text-purple-600" />
        <Card value={data.flaggedCount} label="Flagged Entries" color="text-orange-500" />
      </div>

      {/* Attendance Trend */}
      {data.sessionTrend.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="font-semibold mb-4">Attendance Trend (Last 20 Sessions)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.sessionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Students" radius={[4, 4, 0, 0]} />
              <Bar dataKey="flagged" fill="#f59e0b" name="Flagged" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {data.subjectBreakdown.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">By Subject</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.subjectBreakdown} dataKey="sessions" nameKey="subject" cx="50%" cy="50%"
                  outerRadius={80} label={({ subject, sessions }) => `${subject} (${sessions})`}>
                  {data.subjectBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
              {data.subjectBreakdown.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{s.subject}</span>
                  <span className="text-gray-500">{s.sessions} sessions · avg {s.avgAttendance}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.studentFrequency.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">Most Frequent Students</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.studentFrequency.map((s, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                  <div>
                    <span className="text-gray-400 mr-2">#{i + 1}</span>
                    <span className="font-medium">{s.name}</span>
                    {s.rollNumber && <span className="text-gray-400 ml-2">({s.rollNumber})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-medium">{s.count}</span>
                    {s.flagged > 0 && <span className="text-orange-500 text-xs">⚠️ {s.flagged}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StudentReportsTab({ data }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | low | flagged

  if (!data) return <div className="text-gray-400 text-center py-8">Loading student data...</div>;
  if (data.students.length === 0) return <div className="text-gray-400 text-center py-8">No student data yet.</div>;

  let filtered = data.students;
  if (filter === 'low') filtered = filtered.filter((s) => s.isLow);
  if (filter === 'flagged') filtered = filtered.filter((s) => s.flaggedCount > 0);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q));
  }

  return (
    <>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" placeholder="Search by name or roll number..."
          className="flex-1 min-w-48 px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {['all', 'low', 'flagged'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            {f === 'all' ? 'All Students' : f === 'low' ? '🔴 Low Attendance' : '⚠️ Flagged'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium text-gray-600">Student</th>
              <th className="text-left p-3 font-medium text-gray-600">Roll No.</th>
              {data.subjects.map((sub) => (
                <th key={sub} className="text-center p-3 font-medium text-gray-600 whitespace-nowrap">{sub}</th>
              ))}
              <th className="text-center p-3 font-medium text-gray-600">Overall</th>
              <th className="text-center p-3 font-medium text-gray-600">Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((st) => (
              <tr key={st.id} className={`border-t ${st.isLow ? 'bg-red-50' : ''}`}>
                <td className="p-3 font-medium">{st.name}</td>
                <td className="p-3 text-gray-500">{st.rollNumber || '—'}</td>
                {data.subjects.map((sub) => {
                  const s = st.subjects[sub] || { attended: 0, total: 0 };
                  const pct = s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0;
                  return (
                    <td key={sub} className="text-center p-3">
                      <span className={`text-xs font-medium ${pct >= 75 ? 'text-green-600' : pct > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                        {s.attended}/{s.total} ({pct}%)
                      </span>
                    </td>
                  );
                })}
                <td className="text-center p-3">
                  <span className={`font-bold ${st.overallPct >= 75 ? 'text-green-600' : 'text-red-500'}`}>
                    {st.overallPct}%
                  </span>
                </td>
                <td className="text-center p-3">
                  {st.flaggedCount > 0 ? <span className="text-orange-500">⚠️ {st.flaggedCount}</span> : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">{filtered.length} student{filtered.length !== 1 ? 's' : ''} shown</p>
    </>
  );
}

function Card({ value, label, color }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
