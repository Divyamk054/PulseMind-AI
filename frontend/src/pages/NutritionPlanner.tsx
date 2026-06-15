import { useState } from "react";
import { Apple, Utensils, Loader2, Search, ClipboardList } from "lucide-react";

import { api } from "../api";

function ResultCard({ result }: { result: string }) {
  return (
    <div className="mt-6 bg-gray-800/60 rounded-2xl border border-gray-700 p-5 space-y-1">
      {result.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        const isHeader = /^\d+\./.test(line.trim()) || line.includes("**") || line.endsWith(":");
        return (
          <p key={i} className={`text-sm leading-relaxed ${isHeader ? "text-emerald-300 font-semibold mt-3" : "text-gray-300"}`}>
            {line.replace(/\*\*/g, "")}
          </p>
        );
      })}
    </div>
  );
}

export default function NutritionPlanner() {
  const [tab, setTab] = useState<"analyze" | "plan">("analyze");
  const [meal, setMeal] = useState("");
  const [condition, setCondition] = useState("");
  const [dietPref, setDietPref] = useState("vegetarian");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const analyzeMeal = async () => {
    if (!meal.trim()) return;
    setLoading(true); setResult(""); setError("");
    try {
      const data = await api.analyzeMeal(meal);
      setResult(data.result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const generatePlan = async () => {
    if (!condition.trim()) return;
    setLoading(true); setResult(""); setError("");
    try {
      const data = await api.getMealPlan(condition, dietPref, days);
      setResult(data.result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Apple size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Nutrition & Diet Planner</h1>
            <p className="text-gray-400 text-sm">AI-powered meal analysis & condition-specific meal plans</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-gray-800 rounded-xl p-1 mb-6 w-fit gap-1">
        {([["analyze", "🍽️ Analyze Meal"], ["plan", "📋 Meal Plan"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key as any); setResult(""); setError(""); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Analyze Meal */}
      {tab === "analyze" && (
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Utensils size={18} className="text-emerald-400" /> Meal Nutrition Analyzer
          </h2>
          <label className="block text-sm text-gray-400 mb-2">Describe your meal in detail</label>
          <textarea value={meal} onChange={e => setMeal(e.target.value)}
            placeholder="e.g., 2 chapatis with dal fry, a bowl of curd rice, and a glass of buttermilk"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm resize-none h-24 focus:outline-none focus:border-emerald-500 placeholder-gray-500" />
          <div className="mt-2 flex flex-wrap gap-2">
            {["2 idli with sambar & chutney", "Grilled chicken salad with olive oil", "Pizza slice with cola", "Oats with banana and honey"].map(ex => (
              <button key={ex} onClick={() => setMeal(ex)}
                className="text-xs bg-gray-800 border border-gray-600 text-gray-400 hover:text-white hover:border-emerald-500 px-3 py-1 rounded-full transition-all">{ex}</button>
            ))}
          </div>
          <button onClick={analyzeMeal} disabled={loading || !meal.trim()}
            className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Search size={16} /> Analyze Nutrition</>}
          </button>
        </div>
      )}

      {/* Meal Plan */}
      {tab === "plan" && (
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-teal-400" /> Condition-Based Meal Plan
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Health Condition</label>
              <input value={condition} onChange={e => setCondition(e.target.value)} placeholder="e.g., Type 2 Diabetes, PCOS, Hypertension"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-500" />
              <div className="mt-2 flex flex-wrap gap-2">
                {["Type 2 Diabetes", "Hypertension", "PCOS", "Kidney Disease", "Weight Loss", "Heart Disease"].map(c => (
                  <button key={c} onClick={() => setCondition(c)}
                    className="text-xs bg-gray-800 border border-gray-600 text-gray-400 hover:text-white hover:border-emerald-500 px-3 py-1 rounded-full transition-all">{c}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Dietary Preference</label>
                <select value={dietPref} onChange={e => setDietPref(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500">
                  <option value="vegetarian">🥬 Vegetarian</option>
                  <option value="non-vegetarian">🍗 Non-Vegetarian</option>
                  <option value="vegan">🌱 Vegan</option>
                  <option value="eggetarian">🥚 Eggetarian</option>
                  <option value="keto">🥑 Keto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration (Days)</label>
                <select value={days} onChange={e => setDays(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500">
                  {[3, 5, 7, 14].map(d => <option key={d} value={d}>{d} Days</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={generatePlan} disabled={loading || !condition.trim()}
            className="mt-4 w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Generating Plan...</> : <><ClipboardList size={16} /> Generate Meal Plan</>}
          </button>
        </div>
      )}

      {error && <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>}
      {result && <ResultCard result={result} />}
    </div>
  );
}
