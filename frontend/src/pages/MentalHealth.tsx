import { useState, useEffect } from "react";
import { Brain, Heart, Loader2, Calendar } from "lucide-react";
import { useAuth } from "../App";
import { api } from "../api";

const EMOTIONS = ["Anxious", "Sad", "Happy", "Angry", "Tired", "Hopeful", "Stressed", "Calm", "Irritable", "Grateful", "Lonely", "Excited"];
const MOODS = [
  { score: 1, emoji: "😭", label: "Very Bad", color: "#ef4444" },
  { score: 2, emoji: "😢", label: "Bad", color: "#f97316" },
  { score: 3, emoji: "😟", label: "Low", color: "#eab308" },
  { score: 4, emoji: "😐", label: "Okay", color: "#84cc16" },
  { score: 5, emoji: "🙂", label: "Fine", color: "#22c55e" },
  { score: 6, emoji: "😊", label: "Good", color: "#14b8a6" },
  { score: 7, emoji: "😄", label: "Great", color: "#06b6d4" },
  { score: 8, emoji: "😁", label: "Very Good", color: "#3b82f6" },
  { score: 9, emoji: "🤩", label: "Excellent", color: "#8b5cf6" },
  { score: 10, emoji: "🥳", label: "Amazing", color: "#ec4899" },
];

function AIResponse({ text }: { text: string }) {
  const isCrisis = text.includes("CRISIS SUPPORT ALERT");
  return (
    <div className={`mt-6 rounded-2xl border p-6 ${isCrisis ? "bg-red-900/20 border-red-500" : "bg-gray-800/60 border-gray-700"}`}>
      {isCrisis && <div className="text-red-400 font-bold text-lg mb-3">🆘 Crisis Support Alert</div>}
      <div className="space-y-1">
        {text.split("\n").map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-2" />;
          const isNum = /^\d+\./.test(line.trim());
          return <p key={i} className={`text-sm leading-relaxed ${isCrisis ? "text-red-200" : isNum ? "text-cyan-300 font-medium mt-2" : "text-gray-300"}`}>{line}</p>;
        })}
      </div>
    </div>
  );
}

export default function MentalHealth() {
  const { user } = useAuth();
  const [moodScore, setMoodScore] = useState(5);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const toggleEmotion = (e: string) =>
    setSelectedEmotions(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api.getMoodHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      // silent fail - history just stays empty
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const submit = async () => {
    if (selectedEmotions.length === 0) {
      setError("Please select at least one emotion.");
      return;
    }
    setLoading(true); setResult(""); setError("");
    try {
      const data = await api.logMood(moodScore, selectedEmotions.join(", "), notes);
      setResult(data.ai_support || "");
      await loadHistory();
    } catch (e: any) {
      setError(e.message || "Failed to log mood. Please check that the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Compute real stats from history
  const recentHistory = [...history].sort((a, b) => b.timestamp?.localeCompare(a.timestamp ?? "") ?? 0).slice(0, 7);
  const avgScore = history.length > 0
    ? (history.reduce((sum, h) => sum + (h.mood_score || 0), 0) / history.length).toFixed(1)
    : null;

  // Streak: consecutive days with an entry (comparing date portion of timestamps)
  const streak = (() => {
    if (history.length === 0) return 0;
    const dates = [...new Set(history.map(h => (h.timestamp || "").split("T")[0]).filter(Boolean))].sort().reverse();
    let count = 0;
    const today = new Date().toISOString().split("T")[0];
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      if (dates[i] === expected || (i === 0 && dates[i] === today)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  })();

  const selectedMood = MOODS.find(m => m.score === moodScore)!;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mental Health Companion</h1>
            <p className="text-gray-400 text-sm">CBT-based mood tracking & AI emotional support</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Logger */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-base font-semibold text-white mb-5">How are you feeling today?</h2>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">{selectedMood.emoji}</div>
            <div className="text-lg font-bold" style={{ color: selectedMood.color }}>{selectedMood.label}</div>
            <div className="text-sm text-gray-500">{moodScore}/10</div>
          </div>
          <input type="range" min={1} max={10} value={moodScore} onChange={e => setMoodScore(Number(e.target.value))}
            className="w-full accent-purple-500 mb-6" />
          <div className="flex justify-between text-xs text-gray-500 mb-6">
            <span>😭 Very Bad</span><span>🥳 Amazing</span>
          </div>

          <div className="mb-5">
            <label className="text-sm text-gray-400 mb-2 block">Select your emotions <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map(e => (
                <button key={e} onClick={() => toggleEmotion(e)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedEmotions.includes(e) ? "bg-purple-600 border-purple-500 text-white" : "border-gray-600 text-gray-400 hover:border-purple-500 hover:text-white"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-sm text-gray-400 mb-2 block">Journal (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="What's on your mind? Share as much or as little as you'd like..."
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm resize-none h-24 focus:outline-none focus:border-purple-500 placeholder-gray-500" />
          </div>

          {error && (
            <div className="mb-4 text-xs text-red-400 bg-red-900/20 border border-red-900 rounded-lg px-3 py-2">{error}</div>
          )}

          <button onClick={submit} disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Getting AI Support...</> : <><Heart size={16} /> Log & Get Support</>}
          </button>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Real Stats from History */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Mood Insights</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{selectedMood.emoji}</div>
                <div className="text-xs font-medium" style={{ color: selectedMood.color }}>{selectedMood.label}</div>
                <div className="text-xs text-gray-500">Current</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">
                  {avgScore ? MOODS[Math.round(parseFloat(avgScore)) - 1]?.emoji ?? "📊" : "—"}
                </div>
                <div className="text-xs font-medium text-green-400">
                  {avgScore ? `${avgScore}/10` : "No data"}
                </div>
                <div className="text-xs text-gray-500">Average</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{streak > 0 ? "🔥" : "—"}</div>
                <div className="text-xs font-medium text-orange-400">{streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""}` : "No streak"}</div>
                <div className="text-xs text-gray-500">Streak</div>
              </div>
            </div>
          </div>

          {/* Real History-Driven Mood Bar Chart */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">Recent Mood Trend</h3>
              <button onClick={loadHistory} disabled={historyLoading} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50">
                <Calendar size={12} /> {historyLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No mood entries yet. Log your first mood above!</p>
            ) : (
              <div className="flex items-end gap-2 h-28">
                {recentHistory.slice(0, 7).reverse().map((h, i) => {
                  const score = h.mood_score ?? 5;
                  const mood = MOODS[score - 1];
                  const heightPct = `${(score / 10) * 100}%`;
                  const dayLabel = h.timestamp ? new Date(h.timestamp).toLocaleDateString("en", { weekday: "short" })[0] : `D${i + 1}`;
                  return (
                    <div key={h.id || i} className="flex flex-col items-center gap-1 flex-1" title={`${mood?.label} — ${score}/10`}>
                      <div className="w-full flex items-end justify-center rounded-md bg-gray-800" style={{ height: "80px" }}>
                        <div className="w-full rounded-md transition-all" style={{ height: heightPct, backgroundColor: mood?.color || "#8b5cf6", minHeight: "4px" }} />
                      </div>
                      <span className="text-3xs text-gray-500">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {history.length > 0 && (
              <div className="space-y-1.5 mt-4 max-h-36 overflow-y-auto">
                {recentHistory.map((h) => (
                  <div key={h.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-gray-400">
                      {h.timestamp ? new Date(h.timestamp).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 truncate max-w-[80px]">{h.emotions}</span>
                      <span className="text-sm font-bold" style={{ color: MOODS[(h.mood_score ?? 5) - 1]?.color }}>
                        {MOODS[(h.mood_score ?? 5) - 1]?.emoji} {h.mood_score}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crisis Resources */}
          <div className="bg-red-900/10 border border-red-800/40 rounded-2xl p-4">
            <p className="text-xs font-semibold text-red-400 mb-2">🆘 Crisis Resources (India)</p>
            <div className="space-y-1">
              {[["iCall", "9152987821"], ["Vandrevala Foundation", "1860-2662-345"], ["AASRA", "9820466627"]].map(([n, p]) => (
                <div key={n} className="flex justify-between text-xs">
                  <span className="text-gray-400">{n}</span>
                  <a href={`tel:${p}`} className="text-red-300 font-medium hover:text-red-200 transition-colors">{p}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {result && <AIResponse text={result} />}
    </div>
  );
}
