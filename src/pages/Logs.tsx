import { useEffect, useState } from "react";
import { api, LogEntry } from "../lib/api";
import { Activity, Clock } from "lucide-react";

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "archive">("today");

  useEffect(() => {
    api.getLogs().then(data => {
      setLogs(data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const todayStr = new Date().toLocaleDateString();
  const todayLogs: LogEntry[] = [];
  const archivedLogsByDate: Record<string, LogEntry[]> = {};

  logs.forEach(log => {
      const dStr = new Date(log.timestamp + "Z").toLocaleDateString();
      if (dStr === todayStr) {
          todayLogs.push(log);
      } else {
          if (!archivedLogsByDate[dStr]) archivedLogsByDate[dStr] = [];
          archivedLogsByDate[dStr].push(log);
      }
  });

  const archivedDates = Object.keys(archivedLogsByDate).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

  const renderLogsList = (logEntries: LogEntry[]) => (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-300 dark:before:via-neutral-700 before:to-transparent py-4">
      {logEntries.map((log) => {
        const date = new Date(log.timestamp + "Z");
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return (
          <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-neutral-50 dark:border-neutral-900 bg-white dark:bg-neutral-950 text-neutral-500 group-[.is-active]:border-primary-100 dark:group-[.is-active]:border-primary-900/30 group-[.is-active]:bg-primary-50 dark:group-[.is-active]:bg-primary-900/20 group-[.is-active]:text-primary-600 dark:group-[.is-active]:text-primary-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm transition-shadow hover:shadow-lg hover:-translate-y-1 transform duration-200">
              <div className="flex items-center justify-between space-x-2 mb-2">
                <div className="font-bold text-neutral-900 dark:text-neutral-100 text-lg">{log.action}</div>
                <time className="font-mono text-xs font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg tracking-wider">{formattedDate} {formattedTime}</time>
              </div>
              <div className="text-neutral-600 dark:text-neutral-400 font-medium">
                {log.details || "No additional details"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6 h-full flex flex-col max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6 pt-2">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-2xl shadow-inner border border-primary-200 dark:border-primary-900/50">
            <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
            <p className="text-neutral-500 font-medium mt-1">Audit trail of recent application activities</p>
          </div>
        </div>
        
        <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 self-start sm:self-auto">
          <button 
            onClick={() => setActiveTab("today")}
            className={`px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-200 ${activeTab === "today" ? "bg-white dark:bg-neutral-950 shadow-sm text-primary-600 dark:text-primary-400 ring-1 ring-neutral-200 dark:ring-neutral-800" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}
          >
            Today's Logs
          </button>
          <button 
            onClick={() => setActiveTab("archive")}
            className={`px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-200 ${activeTab === "archive" ? "bg-white dark:bg-neutral-950 shadow-sm text-primary-600 dark:text-primary-400 ring-1 ring-neutral-200 dark:ring-neutral-800" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}
          >
            Archive
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-transparent relative custom-scrollbar pr-4">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-neutral-500 font-medium animate-pulse">Loading audit trail...</p>
          </div>
        ) : activeTab === "today" ? (
          todayLogs.length === 0 ? (
            <div className="text-center text-neutral-500 py-24 bg-white dark:bg-neutral-950 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Activity className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-800 mb-4" />
              <p className="text-lg font-medium">No activity today yet.</p>
            </div>
          ) : renderLogsList(todayLogs)
        ) : (
          archivedDates.length === 0 ? (
            <div className="text-center text-neutral-500 py-24 bg-white dark:bg-neutral-950 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Clock className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-800 mb-4" />
              <p className="text-lg font-medium">Archive is empty.</p>
            </div>
          ) : (
            <div className="space-y-16 pb-12">
              {archivedDates.map(dateStr => (
                <div key={dateStr} className="relative">
                  <div className="sticky top-0 z-20 py-4 bg-gradient-to-b from-neutral-50 via-neutral-50 to-transparent dark:from-neutral-950 dark:via-neutral-950 mb-4">
                     <span className="inline-block px-4 py-1.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full font-bold text-sm tracking-wide uppercase shadow-sm border border-neutral-300 dark:border-neutral-700">
                       {dateStr}
                     </span>
                  </div>
                  {renderLogsList(archivedLogsByDate[dateStr])}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
