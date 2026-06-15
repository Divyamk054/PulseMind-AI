import { useState } from "react";
import { api } from "../api";
import { TrendingUp, Loader, Activity, Heart, Droplets, Scale } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart
} from "recharts";

export default function HealthForecast() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeChart, setActiveChart] = useState<"weight" | "glucose" | "bp" | "cv_risk">("cv_risk");
  const [form, setForm] = useState({
    age: 35, weight_kg: 75, height_cm: 170, systolic_bp: 125,
    glucose: 95, cholesterol: 190, exercise_days_per_week: 2
  });

  const set = (k: string, v: number) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.healthForecast(form);
      setResult(res.forecast || res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const chartConfig = {
    weight:  { label: "Weight (kg)",        color: "#8b5cf6", yLabel: "kg" },
    glucose: { label: "Glucose (mg/dL)",     color: "#f59e0b", yLabel: "mg/dL" },
    bp:      { label: "Systolic BP (mmHg)",  color: "#ef4444", yLabel: "mmHg" },
    cv_risk: { label: "CV Risk Score (0-100)", color: "#10b981", yLabel: "Score" },
  };

  const MetricCard = ({ label, value, icon: Icon, color, unit }: any) => (
    <div className="bg-gray-800/60 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={`text-${color}-400`} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-white">{value} <span className="text-xs font-normal text-gray-500">{unit}</span></p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Health Twin Forecast Engine</h1>
          <p className="text-sm text-gray-500">Predict your 3, 6, and 12-month health trajectory with AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Input Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Your Health Vitals</h2>
          {[
            { key: "age", label: "Age", min: 10, max: 100, unit: "years" },
            { key: "weight_kg", label: "Weight", min: 30, max: 250, unit: "kg", step: 0.5 },
            { key: "height_cm", label: "Height", min: 100, max: 230, unit: "cm" },
            { key: "systolic_bp", label: "Systolic BP", min: 80, max: 220, unit: "mmHg" },
            { key: "glucose", label: "Fasting Glucose", min: 50, max: 400, unit: "mg/dL", step: 0.5 },
            { key: "cholesterol", label: "Total Cholesterol", min: 80, max: 450, unit: "mg/dL" },
          ].map(({ key, label, min, max, unit, step }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">{label}</label>
                <span className="text-xs text-purple-400 font-medium">{(form as any)[key]} {unit}</span>
              </div>
              <input type="range" min={min} max={max} step={step || 1}
                value={(form as any)[key]}
                onChange={e => set(key, parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          ))}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-500">Exercise Days / Week</label>
              <span className="text-xs text-purple-400 font-medium">{form.exercise_days_per_week} days</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[0,1,2,3,4,5,6,7].map(d => (
                <button key={d} onClick={() => set("exercise_days_per_week", d)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    form.exercise_days_per_week === d ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                  }`}>{d}</button>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all">
            {loading ? <><Loader size={14} className="animate-spin" /> Forecasting...</> : "Generate Forecast →"}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Current CV Risk" value={result.current?.cv_risk} icon={Heart} color="red" unit="/100" />
                <MetricCard label="12-Month CV Risk" value={result.month_12?.cv_risk} icon={TrendingUp} color="green" unit="/100" />
                <MetricCard label="Current Glucose" value={result.current?.glucose} icon={Droplets} color="amber" unit="mg/dL" />
                <MetricCard label="12-Month Weight" value={result.month_12?.weight} icon={Scale} color="purple" unit="kg" />
              </div>

              {/* Chart Selector */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="flex gap-2 flex-wrap mb-4">
                  {(Object.keys(chartConfig) as Array<keyof typeof chartConfig>).map(k => (
                    <button key={k} onClick={() => setActiveChart(k)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeChart === k ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}>{chartConfig[k].label}</button>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={result.chart_data || []}>
                    <defs>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig[activeChart].color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartConfig[activeChart].color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} label={{ value: chartConfig[activeChart].yLabel, angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px", color: "#f9fafb" }} />
                    <Area type="monotone" dataKey={activeChart} stroke={chartConfig[activeChart].color}
                      fill="url(#colorForecast)" strokeWidth={2.5} dot={{ fill: chartConfig[activeChart].color, r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Narrative */}
              {result.narrative && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h3 className="text-purple-400 text-sm font-semibold mb-2 flex items-center gap-2"><Activity size={14} /> AI Health Forecast Narrative</h3>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{result.narrative}</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center h-80 gap-3">
              <TrendingUp size={40} className="text-gray-700" />
              <p className="text-gray-600 text-sm">Configure vitals and click Generate Forecast</p>
              <p className="text-gray-700 text-xs">See your 3, 6 & 12-month health trends</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
