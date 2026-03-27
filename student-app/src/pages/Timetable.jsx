import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Timetable() {
  const [timetables, setTimetables] = useState([]);
  const [selectedDay, setSelectedDay] = useState(
    new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
  );

  useEffect(() => {
    api.get('/timetable/student').then(({ data }) => setTimetables(data.timetables)).catch(() => {});
  }, []);

  const todayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const dayData = timetables.find((t) => t.day === selectedDay);
  const slots = dayData?.slots || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-green-600 hover:underline text-sm">&larr; Home</Link>
        <h1 className="text-lg font-bold text-green-600">📅 Timetable</h1>
      </nav>

      <main className="max-w-md mx-auto p-6">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {DAYS.map((day) => (
            <button key={day} onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedDay === day ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}>
              {day === todayName ? '📍 Today' : day.slice(0, 3)}
            </button>
          ))}
        </div>

        <h2 className="font-semibold mb-3">{selectedDay}'s Classes</h2>

        {slots.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No classes scheduled for {selectedDay}</p>
        ) : (
          <div className="space-y-3">
            {slots.map((slot, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-medium">{slot.subject?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{slot.subject?.code}{slot.isLab ? ' (Lab)' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-gray-600">{slot.startTime} - {slot.endTime}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
