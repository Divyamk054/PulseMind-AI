import { useState, useEffect } from "react";
import { api } from "../api";
import { Bot, RefreshCw, Pill, Droplets, Dumbbell, Moon, Calendar, Lightbulb, Smile, Loader, Clock } from "lucide-react";

export default function HealthCopilot() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const fetchCopilot = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.getCopilot();
      setData(res.recommendations || res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCopilot(); }, []);

  const Section = ({ icon: Icon, title, color, children }: any) => (
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
          <Icon size={16} className={`text-${color}-400`} />
        </div>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );

  const priorityColors: Record<string, string> = {
    High: "text-red-400 bg-red-400/10 border-red-400/30",
    Medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    Low: "text-green-400 bg-green-400/10 border-green-400/30",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Health Copilot</h1>
            <p className="text-sm text-gray-500">Your personalized daily health assistant — {data?.date || "Today"}</p>
          </div>
        </div>
        <button onClick={fetchCopilot} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-all border border-gray-700">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader size={32} className="text-indigo-400 animate-spin" />
          <p className="text-gray-500 text-sm">AI is generating your daily health plan...</p>
        </div>
      )}

      {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

      {!loading && data && (
        <>
          {/* Daily Tip Banner */}
          {data.daily_health_tip && (
            <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
              <Lightbulb size={20} className="text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-indigo-400 font-semibold mb-1">💡 Daily Health Tip</p>
                <p className="text-sm text-gray-200">{data.daily_health_tip}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Medication Reminders */}
            <Section icon={Pill} title="Medication Reminders" color="blue">
              {(data.medication_reminders || []).length > 0 ? (
                <div className="space-y-2">
                  {data.medication_reminders.map((med: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                        <Clock size={14} className="text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">{med.drug}</span>
                          <span className="text-xs text-blue-400 font-bold">{med.time}</span>
                        </div>
                        <p className="text-xs text-gray-500">{med.dosage} — {med.instruction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-600">No medications on record. Add medications in the Medications section.</p>}
            </Section>

            {/* Hydration */}
            <Section icon={Droplets} title="Hydration Goal" color="cyan">
              {data.hydration && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-white">{data.hydration.goal_liters}L</span>
                    <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full">Daily Goal</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(data.hydration.reminder_times || []).map((t: string, i: number) => (
                      <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-lg">{t}</span>
                    ))}
                  </div>
                  {data.hydration.tip && <p className="text-xs text-gray-500 bg-gray-800/40 p-2 rounded-lg">{data.hydration.tip}</p>}
                </div>
              )}
            </Section>

            {/* Exercise */}
            <Section icon={Dumbbell} title="Exercise Prescription" color="green">
              {data.exercise && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                      <p className="text-green-400 font-semibold">{data.exercise.type}</p>
                      <p className="text-xs text-gray-500">{data.exercise.duration_minutes} min · {data.exercise.intensity}</p>
                    </div>
                  </div>
                  {data.exercise.tip && <p className="text-xs text-gray-500 bg-gray-800/40 p-2 rounded-lg">{data.exercise.tip}</p>}
                </div>
              )}
            </Section>

            {/* Sleep */}
            <Section icon={Moon} title="Sleep Optimization" color="purple">
              {data.sleep && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Target", value: `${data.sleep.target_hours}h` },
                      { label: "Bedtime", value: data.sleep.bedtime },
                      { label: "Wake Up", value: data.sleep.wake_time },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center bg-purple-500/10 border border-purple-500/20 rounded-xl p-2">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-sm font-semibold text-purple-400">{value}</p>
                      </div>
                    ))}
                  </div>
                  {data.sleep.tip && <p className="text-xs text-gray-500 bg-gray-800/40 p-2 rounded-lg">{data.sleep.tip}</p>}
                </div>
              )}
            </Section>
          </div>

          {/* Follow-ups */}
          {(data.follow_ups || []).length > 0 && (
            <Section icon={Calendar} title="Follow-up Reminders" color="amber">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.follow_ups.map((fu: any, i: number) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${priorityColors[fu.priority] || "border-gray-700 text-gray-400 bg-gray-800/40"}`}>
                    <Calendar size={14} className="flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{fu.action}</p>
                      <p className="text-xs opacity-70">Due: {fu.due}</p>
                    </div>
                    <span className="ml-auto text-xs font-bold opacity-80">{fu.priority}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Mood Check */}
          {data.mood_check && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
              <Smile size={20} className="text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-gray-300">{data.mood_check}</p>
              <a href="/mental-health" className="ml-auto text-xs text-yellow-400 hover:underline whitespace-nowrap">Log Mood →</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
