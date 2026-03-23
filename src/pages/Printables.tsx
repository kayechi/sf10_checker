import { useState, useEffect, useRef } from "react";
import { api, DashboardStats, Student } from "../lib/api";
import { Printer } from "lucide-react";

export default function Printables() {
  const [sf10Option, setSf10Option] = useState<string>("passed");
  const [yearOption, setYearOption] = useState<number | undefined>(undefined);
  const [semester, setSemester] = useState<string>("SECOND SEMESTER");
  const [academicYear, setAcademicYear] = useState<string>("2025-2026");
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  
  const [previewData, setPreviewData] = useState<Student[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [years, setYears] = useState<number[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getDashboardStats(yearOption).then(setStats).catch(console.error);
  }, [yearOption]);

  useEffect(() => {
    api.getFilterOptions().then(res => setYears(res.years)).catch(console.error);
  }, []);

  const toggleProgram = (program: string) => {
    const newSet = new Set(selectedPrograms);
    if (newSet.has(program)) newSet.delete(program);
    else newSet.add(program);
    setSelectedPrograms(newSet);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const passed = sf10Option === "passed" ? true : sf10Option === "not_passed" ? false : undefined;
      const programsList = Array.from(selectedPrograms);
      const data = await api.getPrintableStudents(yearOption, passed, programsList);
      setPreviewData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    // Clone the printable content into a temporary portal div
    const portalId = "__print_portal__";
    const styleId = "__print_style__";

    // Remove any stale portals
    document.getElementById(portalId)?.remove();
    document.getElementById(styleId)?.remove();

    // Create a portal with just the print content
    const portal = document.createElement("div");
    portal.id = portalId;
    portal.innerHTML = printRef.current.innerHTML;
    portal.style.display = "none";
    document.body.appendChild(portal);

    // Inject a print stylesheet that hides everything except the portal
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @media print {
        body > *:not(#${portalId}) { display: none !important; }
        #${portalId} {
          display: block !important;
          font-family: Arial, sans-serif;
          color: #000;
          background: #fff;
        }
        #${portalId} .print-section {
          padding: 20px 32px;
          page-break-after: always;
        }
        #${portalId} .print-section:last-child {
          page-break-after: avoid;
        }
        #${portalId} .text-center { text-align: center; }
        #${portalId} .mb-8 { margin-bottom: 2rem; }
        #${portalId} .mb-6 { margin-bottom: 1.5rem; }
        #${portalId} .mt-4 { margin-top: 1rem; }
        #${portalId} h1 { font-size: 1.4rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 1.5rem; text-align: center; }
        #${portalId} h2 { font-size: 1.1rem; font-weight: 700; text-transform: uppercase; line-height: 1.4; text-align: center; }
        #${portalId} h3 { font-size: 1rem; font-weight: 700; text-transform: uppercase; margin-top: 0.25rem; text-align: center; }
        #${portalId} table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        #${portalId} th, #${portalId} td { border: 1px solid #111; padding: 6px 10px; }
        #${portalId} thead tr {
          background-color: #b2e05c !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color: #000;
          font-weight: 700;
          text-align: center;
        }
        #${portalId} .total-count {
          margin-top: 0.75rem;
          text-align: right;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #555;
        }
      }
    `;
    document.head.appendChild(style);

    // Trigger native print dialog
    window.print();

    // Clean up after printing (or if dialog is cancelled)
    const cleanup = () => {
      document.getElementById(portalId)?.remove();
      document.getElementById(styleId)?.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
  };

  const groupedData = previewData.reduce((acc, student) => {
    if (!acc[student.program]) acc[student.program] = [];
    acc[student.program].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  const programsWithCounts = stats?.programs.map(p => ({
    program: p.program,
    count: sf10Option === "passed" ? p.passed : p.failed
  })).filter(p => p.count > 0) || [];

  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).toUpperCase();

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Printables</h2>
        <button 
          onClick={handlePrint}
          disabled={previewData.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl shadow-md hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
        >
          <Printer className="w-5 h-5" />
          Print Report
        </button>
      </div>

      <div className="flex-1 flex gap-6 h-[calc(100vh-8rem)]">
        {/* Left: Configuration */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-6 p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-y-auto">
          <h3 className="font-bold text-lg border-b border-neutral-100 dark:border-neutral-800 pb-3">Configuration</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">SF10 Status</label>
            <select 
              value={sf10Option}
              onChange={(e) => setSf10Option(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="passed">With SF10 (Passed)</option>
              <option value="not_passed">No SF10 (Not Passed)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Year Enrolled</label>
            <select 
              value={yearOption || ""}
              onChange={(e) => setYearOption(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Semester</label>
            <select 
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="FIRST SEMESTER">First Semester</option>
              <option value="SECOND SEMESTER">Second Semester</option>
              <option value="SUMMER">Summer</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Academic Year</label>
            <input 
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2025-2026"
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          <div className="space-y-3 flex-1 flex flex-col min-h-[12rem]">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex-shrink-0">Select Programs</label>
            <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {stats ? (
                programsWithCounts.length > 0 ? (
                  programsWithCounts.map(p => (
                    <label key={p.program} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedPrograms.has(p.program)}
                        onChange={() => toggleProgram(p.program)}
                        className="w-4 h-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900 dark:focus:ring-white"
                      />
                      <span className="flex-1 text-sm font-bold">{p.program}</span>
                      <span className="text-xs font-bold px-2.5 py-1 bg-neutral-200 dark:bg-neutral-800 rounded-full text-neutral-700 dark:text-neutral-300">
                        {p.count}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 italic p-2">No programs match this criteria.</p>
                )
              ) : (
                <p className="text-sm text-neutral-500 animate-pulse p-2">Loading programs...</p>
              )}
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || selectedPrograms.size === 0}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md focus:ring-4 focus:ring-primary-600/20 disabled:opacity-50 transition-all uppercase tracking-wide text-sm"
          >
            {isGenerating ? "Generating..." : "Generate Preview"}
          </button>
        </div>

        {/* Right: Preview Area */}
        <div className="flex-1 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-y-auto relative">
          {previewData.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
              <Printer className="w-16 h-16 mb-4 text-neutral-300 dark:text-neutral-800" />
              <p className="font-medium text-lg text-neutral-500 dark:text-neutral-400">Configure options and generate preview</p>
            </div>
          ) : (
            /* printRef captures only this content for the isolated print window */
            <div ref={printRef} className="p-10 space-y-12">
              {Object.entries(groupedData).map(([program, students], idx) => (
                <div key={program} className={`print-section ${idx > 0 ? "pt-12 border-t-2 border-dashed border-neutral-200 dark:border-neutral-800" : ""}`}>
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-bold uppercase text-neutral-900 dark:text-white leading-tight">
                      LIST OF BATCH {yearOption || "ALL"} STUDENTS {sf10Option === "passed" ? "WITH" : "WITHOUT"} SF10/TOR AS OF {currentDate}
                    </h2>
                    <h3 className="text-lg font-bold uppercase text-neutral-900 dark:text-white mt-1">
                      {semester}, A.Y. {academicYear}
                    </h3>
                  </div>

                  <h1 className="text-2xl font-black uppercase text-center tracking-widest text-neutral-900 dark:text-white mb-6">
                    {program}
                  </h1>
                  
                  <table className="w-full text-left border-collapse border border-neutral-900 dark:border-neutral-500">
                    <thead>
                      <tr className="bg-[#b2e05c] text-black" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                        <th className="py-2 px-3 font-bold border border-neutral-900 dark:border-neutral-500 text-center w-1/3">FULL NAME</th>
                        <th className="py-2 px-3 font-bold border border-neutral-900 dark:border-neutral-500 text-center w-1/6">COURSE CODE</th>
                        <th className="py-2 px-3 font-bold border border-neutral-900 dark:border-neutral-500 text-center w-1/2">SCHOOL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.student_id} className="text-neutral-900 dark:text-white">
                          <td className="py-2 px-3 font-semibold border border-neutral-900 dark:border-neutral-500">
                            {student.last_name.toUpperCase()}, {student.first_name.toUpperCase()} {student.middle_name ? `${student.middle_name.toUpperCase()}` : ""}
                          </td>
                          <td className="py-2 px-3 font-medium border border-neutral-900 dark:border-neutral-500 text-center">
                            {student.program}
                          </td>
                          <td className="py-2 px-3 border border-neutral-900 dark:border-neutral-500 uppercase text-sm">
                            {student.shs_name || ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="total-count mt-4 text-right text-sm font-bold text-neutral-500 uppercase tracking-widest">
                    Total count: {students.length}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
