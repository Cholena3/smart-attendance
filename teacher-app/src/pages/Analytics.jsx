import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sessions/analytics/overview')
      .then(({ data }) => { setData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Loading analytics...</div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load analytics</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-blue-600 hover:underline text-sm">&larr; Back to Dashboard</Link>
        <h1 className="text-lg font-bold text-blue-600">📊 Analytics</h1>
      </nav>

      <main className="max-w-5xl mx-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm text-center">
            <p className="text-3xl font-bold text-blue-600">{data.totalSessions}</p>
            <p className="text-sm text-gray-500 mt-1">Total Sessions</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm text-center">
            <p className="text-3xl font-bold text-green-600">{data.totalAttendances}</p>
            <p className="text-sm text-gray-500 mt-1">Total Check-ins</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm text-center">
            <p className="text-3xl font-bold text-purple-600">{data.avgAttendance}</p>
            <p className="text-sm text-gray-500 mt-1">Avg per Session</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm text-center">
            <p className="text-3xl font-bold text-orange-500">{data.flaggedCount}</p>
            <p className="text-sm text-gray-500 mt-1">Flagged Entries</p>
          </div>
        </div>

        {/* Attendance Trend Chart */}
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
          {/* Subject Breakdown */}
          {data.subjectBreakdown.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="font-semibold mb-4">By Subject</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={data.subjectBreakdown} dataKey="sessions" nameKey="subject" cx="50%" cy="50%"
                    outerRadius={80} label={({ subject, sessions }) => `${subject} (${sessions})`}>
                    {data.subjectBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1">
                {data.subjectBreakdown.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{s.subject}</span>
                    <span className="text-gray-500">{s.sessions} sessions · avg {s.avgAttendance} students</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Students */}
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
                      <span className="text-blue-600 font-medium">{s.count} sessions</span>
                      {s.flagged > 0 && <span className="text-orange-500 text-xs">⚠️ {s.flagged}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
