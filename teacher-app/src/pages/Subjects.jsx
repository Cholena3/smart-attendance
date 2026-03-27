import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', minAttendancePct: 75 });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { fetchSubjects(); }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/subjects');
      setSubjects(data.subjects);
    } catch { setError('Failed to load subjects'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.patch(`/subjects/${editing}`, form);
        setEditing(null);
      } else {
        await api.post('/subjects', form);
      }
      setForm({ name: '', code: '', minAttendancePct: 75 });
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save subject');
    }
  };

  const handleEdit = (s) => {
    setEditing(s._id);
    setForm({ name: s.name, code: s.code, minAttendancePct: s.minAttendancePct });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      fetchSubjects();
    } catch { setError('Failed to delete'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-blue-600 hover:underline text-sm">&larr; Dashboard</Link>
        <h1 className="text-lg font-bold text-blue-600">Manage Subjects</h1>
      </nav>

      <main className="max-w-2xl mx-auto p-6">
        {error && <p className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="font-semibold mb-4">{editing ? 'Edit Subject' : 'Add Subject'}</h2>
          <div className="grid grid-cols-3 gap-3">
            <input type="text" placeholder="Subject Name" required
              className="col-span-2 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input type="text" placeholder="Code (e.g. CS301)" required
              className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Min Attendance %</label>
              <input type="number" min="0" max="100"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.minAttendancePct} onChange={(e) => setForm({ ...form, minAttendancePct: +e.target.value })} />
            </div>
            <button type="submit" className="self-end bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm">
              {editing ? 'Update' : 'Add'}
            </button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm({ name: '', code: '', minAttendancePct: 75 }); }}
                className="self-end bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
            )}
          </div>
        </form>

        <div className="space-y-2">
          {subjects.length === 0 && <p className="text-gray-400 text-center py-6">No subjects yet. Add one above.</p>}
          {subjects.map((s) => (
            <div key={s._id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">{s.code} · Min {s.minAttendancePct}%</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(s)} className="text-blue-500 hover:bg-blue-50 px-3 py-1 rounded text-sm">Edit</button>
                <button onClick={() => handleDelete(s._id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
