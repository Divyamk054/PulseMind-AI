import { useState } from "react";
import { api } from "../api";
import { Cpu, Loader, Activity } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

export default function DigitalTwin() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeOrgan, setActiveOrgan] = useState<string | null>(null);
  const [form, setForm] = useState({
    age: 42, weight_kg: 78, height_cm: 172, systolic_bp: 132,
    glucose: 102, cholesterol: 215, exercise_days_per_week: 3,
    sleep_hours: 6.5, smoking: false, alcohol_units_week: 3,
    family_diabetes: false, family_cvd: false,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.createDigitalTwin({ ...form, user_id: "demo-user" });
      setResult(res.twin || res);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const ORGAN_ICONS: Record<string, string> = {
    Heart: "❤️", Kidneys: "🫘", Liver: "🟤", Lungs: "🫁", Brain: "🧠", Pancreas: "🫀"
  };

  const ORGAN_COLORS: Record<string, string> = {
    Heart: "#ef4444", Kidneys: "#8b5cf6", Liver: "#d97706", Lungs: "#06b6d4", Brain: "#a78bfa", Pancreas: "#f59e0b"
  };

  const getHealthColor = (score: number) =>
    score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
          <Cpu size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Personal Health Digital Twin</h1>
          <p className="text-sm text-gray-500">Real-time organ health · Risk radar · 12-month projection (Phase 2)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inputs */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
          <h3 className="text-white font-semibold text-sm sticky top-0 bg-gray-900">Health Profile</h3>

          {[
            { k: "age",         l: "Age",            min: 18, max: 90, step: 1,   unit: "yrs" },
            { k: "weight_kg",   l: "Weight",         min: 40, max: 200,step: 0.5, unit: "kg" },
            { k: "height_cm",   l: "Height",         min: 140,max: 210,step: 0.5, unit: "cm" },
            { k: "systolic_bp", l: "Systolic BP",    min: 90, max: 200,step: 1,   unit: "mmHg" },
            { k: "glucose",     l: "Glucose",        min: 60, max: 300,step: 1,   unit: "mg/dL" },
            { k: "cholesterol", l: "Cholesterol",    min: 100,max: 400,step: 1,   unit: "mg/dL" },
            { k: "sleep_hours", l: "Sleep",          min: 3,  max: 12, step: 0.5, unit: "hrs" },
            { k: "alcohol_units_week", l: "Alcohol", min: 0,  max: 30, step: 1,   unit: "u/wk" },
          ].map(({ k, l, min, max, step, unit }) => (
            <div key={k}>
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-gray-500">{l}</span>
                <span className="text-xs text-cyan-400 font-medium">{(form as any)[k]} {unit}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={(form as any)[k]}
                onChange={e => set(k, parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer" />
            </div>
          ))}

          <div>
            <span className="text-xs text-gray-500">Exercise days/week</span>
            <div className="flex gap-1 mt-1">
              {[0,1,2,3,4,5,6,7].map(d => (
                <button key={d} onClick={() => set("exercise_days_per_week", d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${form.exercise_days_per_week === d ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-500"}`}>{d}</button>
              ))}
            </div>
          </div>

          {[
            { k: "smoking",      l: "Smoker" },
            { k: "family_diabetes", l: "Family Diabetes" },
            { k: "family_cvd",  l: "Family CVD" },
          ].map(({ k, l }) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={(form as any)[k]} onChange={e => set(k, e.target.checked)} className="accent-cyan-500 w-4 h-4" />
              <span className="text-xs text-gray-400">{l}</span>
            </label>
          ))}

          <button onClick={handleGenerate} disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            {loading ? <><Loader size={14} className="animate-spin" />Generating...</> : "Generate Digital Twin →"}
          </button>
        </div>

        {/* Twin Visualization */}
        {result ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Health Score */}
            <div className="bg-gradient-to-r from-gray-900 to-cyan-900/20 border border-cyan-500/20 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Health Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-white">{result.overall_score}</span>
                  <span className="text-gray-500 mb-1">/100</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">BMI: {result.bmi} kg/m²</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 text-right">Projected in 12 months</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-cyan-400">{result.projected_12m?.overall_score}</span>
                  <span className="text-cyan-600 mb-0.5 text-sm">+{result.projected_12m?.overall_score - result.overall_score}</span>
                </div>
                <p className="text-xs text-cyan-600">With moderate lifestyle changes</p>
              </div>
            </div>

            {/* Narrative */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-cyan-400" />
                <span className="text-xs text-cyan-400 font-semibold">AI Health Twin Analysis</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{result.narrative}</p>
            </div>

            {/* Radar Chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-sm font-semibold text-white mb-3">Risk Radar — Current vs Projected</p>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={result.radar_data}>
                  <PolarGrid stroke="#1f2937" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar name="Current" dataKey="current" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Projected" dataKey="projected" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} strokeDasharray="5 2" />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px" }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block" /> Current</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block border-dashed" /> Projected (12m)</span>
              </div>
            </div>

            {/* Organ Health */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-sm font-semibold text-white mb-3">Organ Health Status</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(result.organ_health || {}).map(([organ, score]: [string, any]) => (
                  <button key={organ} onClick={() => setActiveOrgan(activeOrgan === organ ? null : organ)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${activeOrgan === organ ? "border-cyan-500 bg-cyan-500/10" : "border-gray-800 bg-gray-800/50 hover:border-gray-700"}`}>
                    <span className="text-2xl">{ORGAN_ICONS[organ] || "🫀"}</span>
                    <span className="text-xs text-gray-400">{organ}</span>
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: getHealthColor(score) }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: getHealthColor(score) }}>{score}%</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 min-h-80">
            <Cpu size={48} className="text-gray-700" />
            <p className="text-gray-600">Configure your health profile and generate your Digital Twin</p>
            <p className="text-gray-700 text-xs">Risk radar · Organ health · 12-month projection</p>
          </div>
        )}
      </div>
    </div>
  );
}
