import { useState } from "react";
import { api } from "../api";
import { BookOpen, Search, Loader, ChevronDown, ChevronUp, ExternalLink, FlaskConical, Award } from "lucide-react";

export default function MedicalResearch() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [condition, setCondition] = useState("");
  const [biomarkers, setBiomarkers] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!condition.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await api.medicalResearch({ condition, biomarkers });
      const data = res.result || res;
      setResult(data);
      setHistory(prev => [{ condition, result: data, date: new Date().toLocaleDateString() }, ...prev.slice(0, 4)]);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const toggle = (k: string) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }));

  const evidenceColor: Record<string, string> = {
    "Level A": "text-green-400 bg-green-400/10", "Level B": "text-amber-400 bg-amber-400/10",
    "Level C": "text-gray-400 bg-gray-400/10",
  };

  const QUICK_CONDITIONS = ["Diabetes Type 2", "Hypertension", "Heart Failure", "Atrial Fibrillation", "COPD", "CKD", "Hypothyroidism", "Asthma"];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
          <BookOpen size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Medical Research Agent</h1>
          <p className="text-sm text-gray-500">AI-powered literature review with treatment options & citations</p>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Condition / Disease *</label>
            <input type="text" placeholder="e.g. Type 2 Diabetes, Atrial Fibrillation, Breast Cancer..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-teal-500"
              value={condition} onChange={e => setCondition(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Relevant Biomarkers / Findings (optional)</label>
            <input type="text" placeholder="e.g. HbA1c 9.2%, eGFR 45, BNP elevated..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-teal-500"
              value={biomarkers} onChange={e => setBiomarkers(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
        </div>
        {/* Quick picks */}
        <div className="flex flex-wrap gap-2">
          {QUICK_CONDITIONS.map(c => (
            <button key={c} onClick={() => { setCondition(c); }}
              className="px-3 py-1 bg-gray-800 hover:bg-teal-600/20 border border-gray-700 hover:border-teal-500/40 text-gray-400 hover:text-teal-400 rounded-lg text-xs transition-all">
              {c}
            </button>
          ))}
        </div>
        <button onClick={handleSearch} disabled={loading || !condition.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
          {loading ? <><Loader size={14} className="animate-spin" /> Searching literature...</> : <><Search size={14} /> Search Research</>}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              {/* Overview */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical size={16} className="text-teal-400" />
                  <h2 className="text-white font-semibold">{result.condition}</h2>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed mb-4">{result.overview}</p>
                <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-3">
                  <p className="text-xs text-teal-400 font-semibold mb-1">Research Summary</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{result.research_summary}</p>
                </div>
              </div>

              {/* Latest Treatments */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <button onClick={() => toggle("treatments")} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-green-400" />
                    <h3 className="text-white font-semibold text-sm">Latest Treatment Options ({(result.latest_treatments || []).length})</h3>
                  </div>
                  {expanded.treatments ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </button>
                {(expanded.treatments !== false) && (
                  <div className="space-y-3 mt-4">
                    {(result.latest_treatments || []).map((t: any, i: number) => (
                      <div key={i} className="bg-gray-800/60 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-sm text-white font-medium">{t.treatment}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${evidenceColor[t.evidence_level] || "text-gray-400 bg-gray-700"}`}>{t.evidence_level}</span>
                            <span className="text-xs text-gray-600">{t.year}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{t.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Discoveries */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <button onClick={() => toggle("discoveries")} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search size={16} className="text-purple-400" />
                    <h3 className="text-white font-semibold text-sm">Recent Discoveries ({(result.recent_discoveries || []).length})</h3>
                  </div>
                  {expanded.discoveries ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </button>
                {(expanded.discoveries !== false) && (
                  <div className="space-y-3 mt-4">
                    {(result.recent_discoveries || []).map((d: any, i: number) => (
                      <div key={i} className="bg-gray-800/60 rounded-xl p-4 border-l-2 border-purple-500/40">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm text-white font-medium">{d.title}</span>
                          <span className="text-xs text-gray-600 flex-shrink-0 ml-2">{d.year}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{d.significance}</p>
                        <p className="text-xs text-purple-400 italic">Source: {d.source}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Guidelines */}
              {(result.standard_guidelines || []).length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    <BookOpen size={14} className="text-amber-400" /> Clinical Guidelines
                  </h3>
                  <div className="space-y-2">
                    {result.standard_guidelines.map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                        <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded flex-shrink-0">{g.body}</span>
                        <div>
                          <p className="text-xs text-gray-300">{g.recommendation}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{g.year}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Citations */}
              {(result.citations || []).length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    <ExternalLink size={14} className="text-teal-400" /> References & Citations
                  </h3>
                  <div className="space-y-2">
                    {result.citations.map((c: any, i: number) => (
                      <div key={i} className="text-xs text-gray-500 p-3 bg-gray-800/40 rounded-lg border border-gray-800">
                        <span className="text-gray-400">{c.authors}</span> — <span className="text-gray-300 italic">"{c.title}"</span>
                        {" "}— <span className="text-teal-400">{c.journal}</span> ({c.year})
                        {c.pmid && c.pmid !== "XXXXXXXX" && <span className="ml-1 text-gray-600">PMID: {c.pmid}</span>}
                      </div>
                    ))}
                  </div>
                  {result.disclaimer && <p className="text-xs text-gray-600 mt-3 italic">{result.disclaimer}</p>}
                </div>
              )}
            </>
          )}

          {!result && !loading && (
            <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
              <BookOpen size={40} className="text-gray-700" />
              <p className="text-gray-600 text-sm">Search a condition to view AI-generated research summary</p>
            </div>
          )}
        </div>

        {/* Search History */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-sm">Recent Searches</h2>
          {history.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-600 text-xs">No searches yet</p>
            </div>
          ) : history.map((h, i) => (
            <button key={i} onClick={() => { setCondition(h.condition); setResult(h.result); }}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-left hover:border-teal-500/30 transition-all">
              <p className="text-sm text-white font-medium">{h.condition}</p>
              <p className="text-xs text-gray-600">{h.date}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
