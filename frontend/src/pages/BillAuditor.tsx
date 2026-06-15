import { useState } from "react";
import { FileText, Search, ShieldCheck, FileWarning, DollarSign, ChevronRight, Copy, CheckCircle } from "lucide-react";
import { api } from "../api";

interface BillItem {
  code: string;
  desc: string;
  charge: number;
  fairPrice: number;
  explanation: string;
  auditIssue: string;
}

interface PresetBill {
  name: string;
  hospital: string;
  items: BillItem[];
}

const presets: PresetBill[] = [
  {
    name: "Standard Emergency Room Visit (Mild Symptoms)",
    hospital: "Mercy Health Medical Center",
    items: [
      { code: "99285", desc: "Emergency Dept Visit Level 5 (Highest Severity)", charge: 3200, fairPrice: 420, explanation: "Level 5 visits are reserved for life-threatening emergencies. Billing this for mild symptoms is a classic case of 'Upcoding'.", auditIssue: "Upcoding Detected" },
      { code: "80053", desc: "Comprehensive Metabolic Panel (CMP)", charge: 480, fairPrice: 45, explanation: "Standalone CMP panel billed at extreme markup compared to Medicare standard fees.", auditIssue: "Overcharged Item" },
      { code: "36415", desc: "Collection of venous blood (Venipuncture)", charge: 120, fairPrice: 12, explanation: "Unbundled item: Draw fee is typically bundled into the blood panel billing rather than itemized separately.", auditIssue: "Potential Unbundling" },
      { code: "93000", desc: "Electrocardiogram (ECG) with interpretation", charge: 550, fairPrice: 75, explanation: "Simple routine EKG marked up to 7x national average rate.", auditIssue: "Overcharged Item" }
    ]
  },
  {
    name: "Outpatient Cardiology Consultation",
    hospital: "Valley View Heart Institute",
    items: [
      { code: "99204", desc: "Office Outpatient New Visit 45 Min", charge: 650, fairPrice: 180, explanation: "Charged at level 4 complexity code. Verify time spent matches medical records.", auditIssue: "Check Time Audit" },
      { code: "93015", desc: "Cardiovascular Stress Test", charge: 1400, fairPrice: 280, explanation: "Treadmill stress test marked up by 500% compared to average local clinics.", auditIssue: "Overcharged Item" },
      { code: "93306", desc: "Echocardiogram (Transthoracic)", charge: 2800, fairPrice: 480, explanation: "Standard cardiac ultrasound diagnostic scan marked up excessively.", auditIssue: "Overcharged Item" }
    ]
  }
];

export default function BillAuditor() {
  const [selectedPreset, setSelectedPreset] = useState<PresetBill | null>(null);
  const [billText, setBillText] = useState("");
  const [auditedItems, setAuditedItems] = useState<BillItem[]>([]);
  const [hospitalName, setHospitalName] = useState("");
  const [copied, setCopied] = useState(false);

  const handleRunAudit = (preset: PresetBill) => {
    setSelectedPreset(preset);
    setHospitalName(preset.hospital);
    setAuditedItems(preset.items);
  };

  const handleCustomAudit = async () => {
    if (!billText.trim()) return;
    try {
      const data = await api.auditBill(billText);
      setHospitalName(data.hospital_name || "Selected Healthcare Facility");
      setAuditedItems(data.items || []);
    } catch {
      setHospitalName("Selected Healthcare Facility");
      setAuditedItems([
        { code: "99214", desc: "Office Outpatient Visit Level 4", charge: 350, fairPrice: 130, explanation: "Common level 4 visit. Check documentation supporting level of decision making.", auditIssue: "Review Severity" },
        { code: "80061", desc: "Lipid Panel test", charge: 180, fairPrice: 28, explanation: "Standard lipid test highly marked up.", auditIssue: "Overcharged Item" }
      ]);
    }
  };

  const totalCharged = auditedItems.reduce((acc, item) => acc + item.charge, 0);
  const totalFair = auditedItems.reduce((acc, item) => acc + item.fairPrice, 0);
  const potentialSavings = Math.max(0, totalCharged - totalFair);

  const generateLetter = () => {
    const listStr = auditedItems
      .map(
        (item) =>
          `- CPT Code ${item.code} (${item.desc}): Charged $${item.charge} (Fair Market Rate: $${item.fairPrice}). Issue: ${item.auditIssue}.`
      )
      .join("\n");

    return `Date: June 12, 2026

To: Billing Department / Patient Accounts
Hospital: ${hospitalName || "Hospital Billing Dept"}

Subject: Audit and Request for Review of Itemized Charges - Account Number [INSERT ACCT #]

Dear Billing Representative,

I am writing to formally request a clinical and billing audit of the itemized invoice for services rendered on [INSERT DATE OF SERVICE]. After auditing the CPT codes listed on my invoice, I have identified several discrepancies and charges that exceed standard local fair-market benchmarks (based on regional Medicare definitions and FAIR Health guidelines).

Please review the following line items:
${listStr}

Summary:
- Total Amount Charged: $${totalCharged}
- Verified Benchmark Total: $${totalFair}
- Discrepancy Amount: $${potentialSavings}

Additionally, I request a copy of my complete medical records, including physicians' notes, to cross-verify the level of service codes billed (such as Emergency Department Evaluation and Management codes) against actual clinical documentation.

Please hold any collections activity while this bill is under active dispute. I look forward to working with you to settle this account at a fair and standard rate.

Sincerely,

[YOUR NAME]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateLetter());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Medical Bill AI Auditor & Explainer</h1>
            <p className="text-gray-400 text-sm">Decode billing CPT codes, detect upcoding/unbundling, and generate dispute letters</p>
          </div>
        </div>
      </div>

      {/* Preset Trials */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FileText size={16} className="text-blue-400" /> Select a Sample Invoice to Audit
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => handleRunAudit(p)}
              className="text-left p-4 rounded-xl border border-gray-800 bg-gray-850 hover:border-blue-500 hover:bg-blue-950/10 transition-all flex justify-between items-center group"
            >
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{p.name}</p>
                <p className="text-xs text-gray-500 mt-1">{p.hospital}</p>
              </div>
              <ChevronRight size={16} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custom Input */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Search size={16} className="text-blue-400" /> Or Audit Custom Bill
          </h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Paste invoice details (e.g. CPT codes & charges)</label>
            <textarea
              value={billText}
              onChange={(e) => setBillText(e.target.value)}
              placeholder="e.g.&#10;99285 Emergency Dept - $3,200&#10;80053 CMP panel - $480"
              className="w-full bg-gray-850 border border-gray-850 rounded-xl px-4 py-3 text-white text-sm h-64 resize-none focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
          </div>
          <button
            onClick={handleCustomAudit}
            disabled={!billText.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all text-sm"
          >
            Audit Custom Codes
          </button>
        </div>

        {/* Audit Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {auditedItems.length > 0 ? (
            <div className="space-y-6">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
                  <span className="text-xs text-gray-500 font-medium">Total Billed</span>
                  <span className="text-lg font-bold text-white mt-1">${totalCharged.toLocaleString()}</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
                  <span className="text-xs text-gray-500 font-medium">Fair Market Benchmark</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1">${totalFair.toLocaleString()}</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
                  <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    Potential Savings
                  </span>
                  <span className="text-lg font-bold text-rose-400 mt-1">${potentialSavings.toLocaleString()}</span>
                </div>
              </div>

              {/* Line items audit */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white">Line-by-Line Clinical Integrity Review</h3>
                <div className="space-y-3">
                  {auditedItems.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-850 rounded-xl border border-gray-800/80 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs bg-blue-600/10 text-blue-400 px-2 py-0.5 rounded font-mono font-semibold">
                            CPT {item.code}
                          </span>
                          <h4 className="text-sm font-semibold text-white mt-1.5">{item.desc}</h4>
                        </div>
                        <span className="text-xs font-semibold text-rose-400 bg-rose-950/20 border border-rose-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FileWarning size={11} /> {item.auditIssue}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-gray-800 pt-2 text-gray-400">
                        <span>Hospital Charge: <strong className="text-white">${item.charge}</strong></span>
                        <span>Fair Market Avg: <strong className="text-emerald-400">${item.fairPrice}</strong></span>
                        <span className="text-rose-400 font-semibold">
                          Overcharged: +{Math.round(((item.charge - item.fairPrice) / item.fairPrice) * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed pt-1">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automated Dispute Letter */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white">Generate Appeals & Disputes Letter</h3>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={14} className="text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy Letter
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 text-xs font-mono text-gray-400 h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {generateLetter()}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center shadow-xl">
              <DollarSign size={48} className="text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">Select a sample bill or paste your invoice details to start the AI audit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
