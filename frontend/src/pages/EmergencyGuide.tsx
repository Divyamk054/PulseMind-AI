import { useState } from "react";
import { Siren, ShieldAlert, PhoneCall, Loader2, ArrowRight } from "lucide-react";

import { api } from "../api";

const MOCK_EMERGENCIES = [
  { type: "Heart Attack", desc: "Chest pain, shortness of breath, left arm pain" },
  { type: "Stroke", desc: "Facial drooping, arm weakness, slurred speech (FAST)" },
  { type: "Choking", desc: "Inability to breathe or speak, cyanosis" },
  { type: "Severe Bleeding", desc: "Rapid arterial or heavy continuous bleeding" },
  { type: "Anaphylaxis", desc: "Severe allergic reaction, throat swelling, hives" }
];

export default function EmergencyGuide() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const fetchGuidance = async (type: string) => {
    setLoading(true); setResult(""); setError("");
    try {
      const data = await api.getEmergencyGuidance(type);
      setResult(data.result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Siren size={20} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Emergency & First Aid Guide</h1>
            <p className="text-gray-400 text-sm">Immediate clinical emergency instructions and support</p>
          </div>
        </div>

        <div className="mt-4 bg-red-950/20 border border-red-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2">
            <ShieldAlert size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-bold text-sm">Critical Life Threat?</p>
              <p className="text-red-400 text-xs mt-0.5">Call Indian Medical Emergency Services immediately.</p>
            </div>
          </div>
          <a href="tel:108" className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-red-600/30 text-sm">
            <PhoneCall size={16} /> Call 108
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Protocols */}
        <div className="md:col-span-1 space-y-3">
          <h2 className="text-base font-bold text-white mb-2">Immediate Protocols</h2>
          {MOCK_EMERGENCIES.map(e => (
            <button key={e.type} onClick={() => fetchGuidance(e.type)}
              className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-red-500/50 p-4 rounded-xl transition-all group">
              <div className="font-bold text-white group-hover:text-red-400 flex items-center justify-between transition-all">
                {e.type} <ArrowRight size={14} className="text-gray-500 group-hover:text-red-400 transition-all" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{e.desc}</p>
            </button>
          ))}
        </div>

        {/* AI Emergency Search */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Search First-Aid / Emergency Help</h2>
            <div className="flex gap-3">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g., Burn from hot water, Snake bite, Heat stroke"
                className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 placeholder-gray-500" />
              <button onClick={() => fetchGuidance(query)} disabled={loading || !query.trim()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Search"}
              </button>
            </div>
          </div>

          {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

          {result && (
            <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-red-400 mb-4 flex items-center gap-2">
                <Siren size={16} /> Clinical First-Aid Instructions
              </h3>
              <div className="space-y-2 text-sm text-gray-300 leading-relaxed">
                {result.split("\n").map((line, i) => {
                  if (!line.trim()) return <div key={i} className="h-2" />;
                  const isProt = line.startsWith("IMMEDIATE PROTOCOL:") || line.startsWith("Detailed Guidance:");
                  return (
                    <p key={i} className={`${isProt ? "text-red-400 font-bold text-base border-b border-gray-800 pb-1 mt-4 mb-2" : line.startsWith("🚨") ? "text-red-300 font-semibold" : ""}`}>
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
