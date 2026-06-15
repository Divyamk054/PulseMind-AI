import { useState } from "react";
import { FileSearch, Sparkles, Loader2, FileText } from "lucide-react";

import { api } from "../api";

export default function SecondOpinionEngine() {
  const [rep1, setRep1] = useState("");
  const [rep2, setRep2] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const compare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rep1.trim() || !rep2.trim()) return;
    setLoading(true); setResult(""); setError("");
    try {
      const data = await api.compareReports(rep1, rep2);
      setResult(data.result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <FileSearch size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Clinical Report Comparison</h1>
            <p className="text-gray-400 text-sm">Compare progress between two diagnostic reports side-by-side</p>
          </div>
        </div>
      </div>

      <form onSubmit={compare} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5">
            <label className="font-semibold text-white mb-2 flex items-center gap-2"><FileText size={16} className="text-indigo-400" /> Earlier Report (Report 1)</label>
            <textarea required value={rep1} onChange={e => setRep1(e.target.value)}
              placeholder="Paste raw text or analysis details of the older report..."
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm h-64 resize-none focus:outline-none focus:border-indigo-500 placeholder-gray-500" />
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5">
            <label className="font-semibold text-white mb-2 flex items-center gap-2"><FileText size={16} className="text-cyan-400" /> Later Report (Report 2)</label>
            <textarea required value={rep2} onChange={e => setRep2(e.target.value)}
              placeholder="Paste raw text or analysis details of the newer report..."
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm h-64 resize-none focus:outline-none focus:border-cyan-500 placeholder-gray-500" />
          </div>
        </div>

        <button type="submit" disabled={loading || !rep1.trim() || !rep2.trim()}
          className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing progress...</> : <><Sparkles size={16} /> Compare Reports & Show Progress</>}
        </button>
      </form>

      {error && <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

      {result && (
        <div className="mt-8 bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-2">
          <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2 flex items-center gap-2"><Sparkles size={18} className="text-cyan-400" /> Comparison Insights</h2>
          {result.split("\n").map((line, i) => {
            if (!line.trim()) return <div key={i} className="h-2" />;
            const isHeader = line.includes("IMPROVEMENTS") || line.includes("DETERIORATIONS") || line.includes("NEW FINDINGS") || line.includes("RESOLVED") || line.includes("LAB VALUE CHANGES") || line.includes("CLINICAL SIGNIFICANCE") || line.includes("RECOMMENDED");
            return (
              <p key={i} className={`text-sm leading-relaxed ${isHeader ? "text-cyan-300 font-bold text-base mt-4" : "text-gray-300"}`}>
                {line}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
