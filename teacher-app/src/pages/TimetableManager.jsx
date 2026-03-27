import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableManager() {
  const [subjects, setSubjects] = useState([]);
  const [timetables, setTimetables] = useState({});
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/subjects').then(({ data }) => setSubjects(data.subjects)).catch(() => {});
    api.get('/timetable').then(({ data }) => {
      const map = {};
      data.timetables.forEach((t) => { map[t.day] = t.slots; });
      setTimetables(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setSlots(timetables[selectedDay] || []);
    setSaved(false);
  }, [selectedDay, timetables]);

  const addSlot = () => {
    setSlots([...slots, { subject: subjects[0]?._id || '', startTime: '09:00', endTime: '10:00', isLab: false }]);
  };

  const updateSlot = (i, field, value) => {
    const updated = [...slots];
    updated[i] = { ...updated[i], [field]: value };
    setSlots(updated);
  };

  const removeSlot = (i) => setSlots(slots.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setError('');
    try {
      await api.put(`/timetable/${selectedDay}`, { slots });
      setTimetables({ ...timetables, [selectedDay]: slots });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-blue-600 hover:underline text-sm">&larr; Dashboard</Link>
        <h1 className="text-lg font-bold text-blue-600">Timetable</h1>
      </nav>

      <main className="max-w-3xl mx-auto p-6">
        {error && <p className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</p>}
        {subjects.length === 0 && (
          <p className="bg-yellow-50 text-yellow-700 p-3 rounded-lg mb-4 text-sm">
            Add subjects first → <Link to="/subjects" className="underline">Manage Subjects</Link>
          </p>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {DAYS.map((day) => (
            <button key={day} onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedDay === day ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}>
              {day}
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">{selectedDay}</h2>
            <button onClick={addSlot} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700">
              + Add Slot
            </button>
          </div>

          {slots.length === 0 && <p className="text-gray-400 text-center py-4">No classes scheduled</p>}

          <div className="space-y-3">
            {slots.map((slot, i) => (
              <div key={i} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg">
                <select value={slot.subject?._id || slot.subject}
                  onChange={(e) => updateSlot(i, 'subject', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none">
                  <option value="">Select Subject</option>
                  {subjects.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                </select>
                <input type="time" value={slot.startTime}
                  onChange={(e) => updateSlot(i, 'startTime', e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm" />
                <input type="time" value={slot.endTime}
                  onChange={(e) => updateSlot(i, 'endTime', e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm" />
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input type="checkbox" checked={slot.isLab}
                    onChange={(e) => updateSlot(i, 'isLab', e.target.checked)} />
                  Lab
                </label>
                <button onClick={() => removeSlot(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))}
          </div>

          {slots.length > 0 && (
            <button onClick={handleSave}
              className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition ${
                saved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
              {saved ? '✓ Saved' : 'Save Timetable'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
