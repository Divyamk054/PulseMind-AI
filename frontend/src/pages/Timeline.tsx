import { useEffect, useState } from "react";
import { Clock, FileText, Pill, ScanLine, AlertTriangle, Loader } from "lucide-react";
import { api } from "../api";

interface TimelineEvent {
  id: string; type: string; title: string; subtitle: string; date: string;
  icon: any; color: string;
}

export default function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const iconMap: any = {
      report: { icon: FileText, color: "text-blue-400", bg: "bg-blue-600/10" },
      prescription: { icon: Pill, color: "text-green-400", bg: "bg-green-600/10" },
      image: { icon: ScanLine, color: "text-purple-400", bg: "bg-purple-600/10" },
      risk: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-600/10" },
    };

    Promise.all([api.getReports(), api.getPrescriptions(), api.getImages(), api.getRiskHistory()])
      .then(([r, p, i, rk]) => {
        const evts: TimelineEvent[] = [
          ...r.map((x: any) => ({ id: x.id, type: "report", title: x.filename, subtitle: `${x.file_type} medical report`, date: x.upload_date, ...iconMap.report })),
          ...p.map((x: any) => ({ id: x.id, type: "prescription", title: x.filename, subtitle: `${x.medications?.length || 0} medications extracted`, date: x.date, ...iconMap.prescription })),
          ...i.map((x: any) => ({ id: x.id, type: "image", title: x.filename, subtitle: `${x.modality?.toUpperCase()}: ${x.prediction}`, date: x.date, ...iconMap.image })),
          ...rk.map((x: any) => ({ id: x.id, type: "risk", title: "Risk Assessment", subtitle: Object.entries(x.scores || {}).map(([k, v]) => `${k}: ${v}`).join(" | "), date: x.date, ...iconMap.risk })),
        ];
        evts.sort((a, b) => b.date.localeCompare(a.date));
        setEvents(evts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Health Timeline</h1>
        <p className="text-gray-500 text-sm mt-0.5">Chronological history of all your medical activities</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader size={24} className="text-blue-400 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
          <Clock size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No health events recorded yet.</p>
          <p className="text-xs text-gray-600 mt-1">Start by uploading a report, prescription, or medical image.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-800" />

          <div className="space-y-3 pl-14">
            {events.map((evt, i) => (
              <div key={evt.id} className="relative">
                {/* Dot */}
                <div className={`absolute -left-9 w-8 h-8 rounded-full ${evt.color.replace("text", "bg").replace("400", "600/20")} border border-gray-700 flex items-center justify-center`}>
                  <evt.icon size={14} className={evt.color} />
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{evt.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{evt.subtitle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock size={10} /> {evt.date}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                        evt.type === "report" ? "bg-blue-900/40 text-blue-400" :
                        evt.type === "prescription" ? "bg-green-900/40 text-green-400" :
                        evt.type === "image" ? "bg-purple-900/40 text-purple-400" :
                        "bg-amber-900/40 text-amber-400"
                      }`}>
                        {evt.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
