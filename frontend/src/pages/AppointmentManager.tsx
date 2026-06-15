import { useState, useEffect } from "react";
import { Calendar, Clock, User, MessageSquare, ClipboardList, Trash2, Plus, Loader2 } from "lucide-react";

import { api } from "../api";

export default function AppointmentManager() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctor, setDoctor] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeChecklist, setActiveChecklist] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const data = await api.getAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch {}
  };

  const schedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !specialty || !date || !time) return;
    setLoading(true);
    try {
      await api.createAppointment(doctor, specialty, date, time, notes);
      setDoctor("");
      setSpecialty("");
      setDate("");
      setTime("");
      setNotes("");
      fetchAppointments();
    } catch {}
    finally { setLoading(false); }
  };

  const cancelAppointment = async (id: string) => {
    try {
      await api.deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      if (activeChecklist === id) setActiveChecklist(null);
    } catch {}
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Calendar size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Clinical Appointment Manager</h1>
            <p className="text-gray-400 text-sm">Schedule doctor visits and get AI-generated clinical preparation checklists</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduler Form */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 h-fit">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={18} className="text-blue-400" /> Book Appointment
          </h2>
          <form onSubmit={schedule} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Doctor Name</label>
              <input required value={doctor} onChange={e => setDoctor(e.target.value)} placeholder="Dr. Sharma"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Specialty</label>
              <input required value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Cardiologist, Neurologist..."
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date</label>
                <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Time</label>
                <input required type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Visit Reason / Patient Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe symptoms or reasons for visit..."
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-white text-sm h-20 resize-none focus:outline-none focus:border-blue-500 placeholder-gray-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Schedule Visit"}
            </button>
          </form>
        </div>

        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Upcoming Appointments</h2>
            {appointments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No scheduled visits.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map(apt => (
                  <div key={apt.id} className={`p-4 rounded-xl border transition-all ${activeChecklist === apt.id ? "bg-blue-950/20 border-blue-500" : "bg-gray-800/60 border-gray-700"}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <User size={16} className="text-blue-400" /> {apt.doctor}
                          <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded-full">{apt.specialty}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1.5">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {apt.date}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {apt.time}</span>
                        </div>
                        {apt.notes && <p className="text-xs text-gray-400 mt-2 bg-gray-900/50 p-2 rounded-lg">{apt.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setActiveChecklist(activeChecklist === apt.id ? null : apt.id)}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border border-gray-700 transition-all">
                          <ClipboardList size={13} /> {activeChecklist === apt.id ? "Hide Check" : "AI Checklist"}
                        </button>
                        <button onClick={() => cancelAppointment(apt.id)} className="text-red-400 hover:bg-red-950/30 p-2 rounded-lg border border-transparent hover:border-red-900/30 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {activeChecklist === apt.id && apt.checklist && (
                      <div className="mt-4 border-t border-gray-800 pt-4 text-xs text-gray-300 space-y-1">
                        <p className="font-bold text-cyan-300 text-sm mb-2">📋 AI-Generated Visit Checklist</p>
                        {apt.checklist.split("\n").map((line: string, i: number) => {
                          if (!line.trim()) return <div key={i} className="h-1" />;
                          return <p key={i} className="leading-relaxed">{line}</p>;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
