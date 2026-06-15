import { useState } from "react";
import { api } from "../api";
import { Users, Plus, Trash2, Loader, TrendingUp, Shield } from "lucide-react";

const RELATIONSHIPS = ["parent", "sibling", "grandparent", "aunt/uncle"];
const COMMON_CONDITIONS = [
  "Diabetes", "Heart Disease", "Hypertension", "Cancer",
  "Stroke", "Obesity", "Depression", "Alzheimer's", "Asthma", "Kidney Disease"
];

interface Member { name: string; relationship: string; age: string; conditions: string[]; }

export default function FamilyHealth() {
  const [members, setMembers] = useState<Member[]>([
    { name: "Father", relationship: "parent", age: "60", conditions: [] },
    { name: "Mother", relationship: "parent", age: "55", conditions: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const addMember = () => setMembers(prev => [...prev, { name: "", relationship: "sibling", age: "", conditions: [] }]);
  const removeMember = (i: number) => setMembers(prev => prev.filter((_, idx) => idx !== i));
  const updateMember = (i: number, field: string, value: any) => {
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };
  const toggleCondition = (i: number, cond: string) => {
    setMembers(prev => prev.map((m, idx) => {
      if (idx !== i) return m;
      const has = m.conditions.includes(cond);
      return { ...m, conditions: has ? m.conditions.filter(c => c !== cond) : [...m.conditions, cond] };
    }));
  };

  const handleAnalyze = async () => {
    setLoading(true); setError("");
    try {
      const payload = members.filter(m => m.name).map(m => ({
        name: m.name, relationship: m.relationship,
        age: m.age ? parseInt(m.age) : null, conditions: m.conditions
      }));
      const res = await api.familyHistory({ members: payload });
      setResult(res.analysis || res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center">
          <Users size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Family Health Graph</h1>
          <p className="text-sm text-gray-500">Map hereditary risks from your family's medical history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Family Members Input */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Family Members</h2>
            <button onClick={addMember} className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-400 rounded-xl text-xs transition-all">
              <Plus size={12} /> Add Member
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {members.map((m, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-1">
                    <input type="text" placeholder="Name (e.g. Father)"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
                      value={m.name} onChange={e => updateMember(i, "name", e.target.value)} />
                    <input type="number" placeholder="Age"
                      className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
                      value={m.age} onChange={e => updateMember(i, "age", e.target.value)} />
                  </div>
                  <button onClick={() => removeMember(i)} className="ml-2 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>

                <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                  value={m.relationship} onChange={e => updateMember(i, "relationship", e.target.value)}>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>

                <div>
                  <p className="text-xs text-gray-600 mb-2">Known Conditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_CONDITIONS.map(cond => (
                      <button key={cond} onClick={() => toggleCondition(i, cond)}
                        className={`px-2 py-1 rounded-lg text-xs transition-all ${
                          m.conditions.includes(cond)
                            ? "bg-pink-600 text-white"
                            : "bg-gray-800 text-gray-500 hover:text-gray-300 border border-gray-700"
                        }`}>{cond}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleAnalyze} disabled={loading || members.every(m => !m.name)}
            className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all">
            {loading ? <><Loader size={14} className="animate-spin" /> Analyzing hereditary risks...</> : "Analyze Family History →"}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Inheritance Map */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-pink-400" /> Hereditary Risk Map
                </h3>
                {result.inheritance_map?.length > 0 ? (
                  <div className="space-y-3">
                    {result.inheritance_map.map((item: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{item.disease}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-xs">{item.category}</span>
                            <span className="font-bold px-2 py-0.5 rounded-full text-xs" style={{ color: item.color, backgroundColor: item.color + "20" }}>
                              {item.risk_level}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${item.risk_score}%`, backgroundColor: item.color }} />
                        </div>
                        <p className="text-xs text-gray-600 text-right">{item.risk_score}% hereditary risk</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 text-center py-4">No hereditary risks detected with current data.</p>
                )}
              </div>

              {/* Top Risks */}
              {result.top_risks?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-3">Top Hereditary Risks</h3>
                  <div className="space-y-2">
                    {result.top_risks.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: r.color + "30", backgroundColor: r.color + "08" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: r.color + "20" }}>
                          <span className="text-xs font-bold" style={{ color: r.color }}>#{i + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{r.disease}</p>
                          <p className="text-xs" style={{ color: r.color }}>{r.risk_level} risk · {r.risk_score}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Screenings */}
              {result.recommended_screenings?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    <Shield size={14} className="text-green-400" /> Recommended Screenings
                  </h3>
                  <div className="space-y-2">
                    {result.recommended_screenings.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-gray-800/60 rounded-xl">
                        <span className="text-xs text-gray-300">{s.screening}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          s.priority === "High" ? "text-red-400 bg-red-400/10" :
                          s.priority === "Moderate" ? "text-amber-400 bg-amber-400/10" : "text-green-400 bg-green-400/10"
                        }`}>{s.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Narrative */}
              {result.narrative && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h3 className="text-pink-400 text-sm font-semibold mb-2">AI Analysis</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{result.narrative}</p>
                </div>
              )}

              <p className="text-xs text-gray-600 italic">{result.disclaimer}</p>
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
              <Users size={40} className="text-gray-700" />
              <p className="text-gray-600 text-sm text-center px-4">Add family members with their conditions to generate hereditary risk analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
