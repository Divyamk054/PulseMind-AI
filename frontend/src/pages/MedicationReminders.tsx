import { useState, useEffect } from "react";
import { Pill, Calendar, Clock, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

import { api } from "../api";

export default function MedicationReminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [drug, setDrug] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const data = await api.getMedications();
      setReminders(Array.isArray(data) ? data : []);
    } catch {}
  };

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drug || !dosage || !frequency) return;
    setLoading(true);
    try {
      await api.addMedication(drug, dosage, frequency, instructions);
      setDrug("");
      setDosage("");
      setFrequency("");
      setInstructions("");
      fetchReminders();
    } catch {}
    finally { setLoading(false); }
  };

  const removeReminder = async (id: string) => {
    try {
      await api.deleteMedication(id);
      setReminders(prev => prev.filter(rem => rem.id !== id));
    } catch {}
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <Pill size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Medication Reminders</h1>
            <p className="text-gray-400 text-sm">Add daily schedules and custom guidance for your prescription medications</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Reminder Form */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 h-fit">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={18} className="text-teal-400" /> New Medication
          </h2>
          <form onSubmit={addReminder} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Medication Name</label>
              <input required value={drug} onChange={e => setDrug(e.target.value)} placeholder="e.g., Metformin"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Dosage</label>
              <input required value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g., 500mg"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Frequency</label>
              <input required value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="e.g., Twice Daily, After Meals"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Special Instructions</label>
              <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="e.g., Avoid grapefruit, take with water..."
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-white text-sm h-20 resize-none focus:outline-none focus:border-teal-500 placeholder-gray-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Add Reminder"}
            </button>
          </form>
        </div>

        {/* Reminders List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Medication Schedule</h2>
            {reminders.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No medication reminders added yet.</p>
            ) : (
              <div className="space-y-3">
                {reminders.map(rem => (
                  <div key={rem.id} className="p-4 rounded-xl border bg-gray-800/60 border-gray-700 flex justify-between items-start">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <Pill size={16} className="text-teal-400" /> {rem.drug}
                        <span className="text-xs bg-teal-900/40 text-teal-300 border border-teal-800/40 px-2 py-0.5 rounded-full">{rem.dosage}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1.5">
                        <span className="flex items-center gap-1"><Clock size={12} /> {rem.frequency}</span>
                      </div>
                      {rem.instructions && (
                        <p className="text-xs text-orange-300 mt-2 bg-orange-950/10 border border-orange-900/20 p-2 rounded-lg flex items-center gap-1.5">
                          <AlertCircle size={12} /> Instructions: {rem.instructions}
                        </p>
                      )}
                    </div>
                    <button onClick={() => removeReminder(rem.id)} className="text-red-400 hover:bg-red-950/30 p-2 rounded-lg border border-transparent hover:border-red-900/30 transition-all">
                      <Trash2 size={14} />
                    </button>
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
