import { useState } from "react";
import { api } from "../api";
import { AlertOctagon, Loader, MapPin } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const REGIONS = ["Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore", "Hyderabad", "Pune", "Jaipur", "Lucknow", "Patna"];
const DISEASES = ["dengue", "malaria", "flu", "cholera", "typhoid"];
const SEASONS = ["monsoon", "pre_monsoon", "winter", "summer"];

const RISK_STYLES: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  CRITICAL: { bg: "from-red-950/60 to-transparent",    border: "border-red-500/50",    badge: "bg-red-600",    text: "text-red-400" },
  HIGH:     { bg: "from-orange-950/40 to-transparent", border: "border-orange-500/40", badge: "bg-orange-600", text: "text-orange-400" },
  MODERATE: { bg: "from-yellow-950/30 to-transparent", border: "border-yellow-500/30", badge: "bg-yellow-600", text: "text-yellow-400" },
  LOW:      { bg: "from-green-950/20 to-transparent",  border: "border-green-500/20",  badge: "bg-green-700",  text: "text-green-400" },
};

export default function OutbreakPredictor() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [region, setRegion] = useState("Mumbai");
  const [disease, setDisease] = useState("dengue");
  const [season, setSeason] = useState("monsoon");

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await api.outbreakPredict({ region, disease, season });
      setResult(res);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const style = result ? (RISK_STYLES[result.risk_level] || RISK_STYLES.LOW) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-800 flex items-center justify-center">
          <AlertOctagon size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Disease Outbreak Predictor</h1>
          <p className="text-sm text-gray-500">Epidemic early warning system · India district-level risk (Phase 13)</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Region / City</label>
            <select value={region} onChange={e => setRegion(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500">
              {REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Disease</label>
            <select value={disease} onChange={e => setDisease(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500">
              {DISEASES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Season</label>
            <div className="flex gap-2">
              {SEASONS.map(s => (
                <button key={s} onClick={() => setSeason(s)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${season === s ? "bg-red-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-750"}`}>
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handlePredict} disabled={loading}
          className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
          {loading ? <><Loader size={14} className="animate-spin" /> Predicting...</> : "Predict Outbreak Risk →"}
        </button>
      </div>

      {result && style && (
        <>
          {/* Alert Banner */}
          <div className={`bg-gradient-to-r ${style.bg} border ${style.border} rounded-2xl p-5 flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 ${style.badge} rounded-2xl flex flex-col items-center justify-center`}>
                <span className="text-white font-black text-xl">{result.risk_percent}%</span>
                <span className="text-white/70 text-[9px] font-medium">RISK</span>
              </div>
              <div>
                <p className={`font-black text-xl ${style.text}`}>{result.risk_level}</p>
                <p className="text-white text-sm font-semibold">{result.disease?.toUpperCase()} in {result.region}</p>
                <p className="text-gray-400 text-xs">{result.season} season · Peak: {result.peak_week?.week}</p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Report to:</p>
              <p className="text-gray-400">District Health Officer</p>
              <p className="text-gray-400">IDSP Surveillance</p>
            </div>
          </div>

          {/* Alert Message */}
          <div className={`border ${style.border} bg-gray-900 rounded-xl p-3`}>
            <p className={`text-sm font-medium ${style.text}`}>{result.alert_message}</p>
          </div>

          {/* Weekly Risk Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">12-Week Risk Trajectory</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={result.weekly_timeline}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={result.risk_color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={result.risk_color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 10 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px" }}
                  formatter={(v: any) => [`${v}%`, "Risk Level"]} />
                <ReferenceLine y={75} stroke="#dc2626" strokeDasharray="4 2" label={{ value: "Critical", fill: "#dc2626", fontSize: 10 }} />
                <ReferenceLine y={55} stroke="#f97316" strokeDasharray="4 2" label={{ value: "High", fill: "#f97316", fontSize: 10 }} />
                <Area type="monotone" dataKey="risk" stroke={result.risk_color} fill="url(#riskGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Prevention Tips */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-3">🛡️ Prevention Protocol — {result.disease?.toUpperCase()}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(result.prevention_tips || []).map((tip: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-800 rounded-xl">
                  <span className={`text-lg`}>{["🦟","💧","😷","🏠","💉"][i % 5]}</span>
                  <span className="text-sm text-gray-300">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
