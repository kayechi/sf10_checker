import { useState, useEffect, useRef } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { api, DashboardStats, Student } from "../lib/api";
import { Printer, FileText, CheckCircle } from "lucide-react";

export default function Printables() {
  const [sf10Option, setSf10Option] = usePersistentState<string>(
    "printablesSf10Option",
    "passed",
  );
  const [enrollmentOption, setEnrollmentOption] = usePersistentState<string>(
    "printablesEnrollmentOption",
    "enrolled",
  );
  const [yearOption, setYearOption] = usePersistentState<number | undefined>(
    "printablesYearOption",
    undefined,
  );
  const [semester, setSemester] = usePersistentState<string>(
    "printablesSemester",
    "FIRST SEMESTER",
  );
  const [academicYear, setAcademicYear] = usePersistentState<string>(
    "printablesAcademicYear",
    "2025-2026",
  );

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = window.localStorage.getItem("printablesSelectedPrograms");
    if (!saved) return new Set();
    try {
      const arr = JSON.parse(saved) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  });

  const [previewData, setPreviewData] = useState<Student[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const enrolled =
      enrollmentOption === "enrolled"
        ? true
        : enrollmentOption === "not_enrolled"
          ? false
          : undefined;
    api
      .getDashboardStats(yearOption, enrolled)
      .then(setStats)
      .catch(console.error);
  }, [yearOption, enrollmentOption]);

  useEffect(() => {
    api
      .getFilterOptions()
      .then((res) => setYears(res.years))
      .catch(console.error);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "printablesSelectedPrograms",
        JSON.stringify(Array.from(selectedPrograms)),
      );
    } catch (err) {
      console.error("Failed to persist selected programs", err);
    }
  }, [selectedPrograms]);

  const toggleProgram = (program: string) => {
    const newSet = new Set(selectedPrograms);
    if (newSet.has(program)) newSet.delete(program);
    else newSet.add(program);
    setSelectedPrograms(newSet);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const passed =
        sf10Option === "passed"
          ? true
          : sf10Option === "not_passed"
            ? false
            : undefined;
      const enrolled =
        enrollmentOption === "enrolled"
          ? true
          : enrollmentOption === "not_enrolled"
            ? false
            : undefined;
      const programsList = Array.from(selectedPrograms);
      const data = await api.getPrintableStudents(
        yearOption,
        passed,
        enrolled,
        programsList,
      );
      setPreviewData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const portalId = "__print_portal__";
    const styleId = "__print_style__";

    document.getElementById(portalId)?.remove();
    document.getElementById(styleId)?.remove();

    const portal = document.createElement("div");
    portal.id = portalId;
    portal.innerHTML = printRef.current.innerHTML;
    portal.style.display = "none";
    document.body.appendChild(portal);

    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @page { 
        size: A4; 
        margin: 0.5in 0.5in 0.5in 0.5in;
      }
      @media print {
        body > *:not(#${portalId}) { display: none !important; }
        * { margin: 0; padding: 0; }
        #${portalId} {
          display: block !important;
          font-family: Arial, sans-serif;
          color: #000;
          background: #fff;
          width: 100%;
        }
        #${portalId} .print-section { 
          page-break-after: always;
          page-break-inside: avoid;
        }
        #${portalId} .print-section:last-child { page-break-after: avoid; }
        #${portalId} .page-break { 
          page-break-after: always;
          page-break-inside: avoid;
        }
        #${portalId} .page-break:last-child { page-break-after: avoid; }
        #${portalId} .text-center { text-align: center; }
        #${portalId} .mb-8 { margin-bottom: 0; }
        #${portalId} .mb-6 { margin-bottom: 0.5rem; }
        #${portalId} .mt-4 { margin-top: 0; }
        #${portalId} .space-y-12 > * + * { margin-top: 0; }
        #${portalId} h1 { font-size: 13pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.75rem; text-align: center; }
        #${portalId} h2 { font-size: 10pt; font-weight: 700; text-transform: uppercase; line-height: 1.3; text-align: center; margin-bottom: 0.5rem; }
        #${portalId} h3 { font-size: 9pt; font-weight: 700; text-transform: uppercase; margin-top: 0; margin-bottom: 0.75rem; text-align: center; }
        #${portalId} table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 9pt;
          break-inside: auto;
          border: none;
        }
        #${portalId} tr { break-inside: avoid; page-break-inside: avoid; }
        #${portalId} th, #${portalId} td { 
          border: 1px solid #000; 
          padding: 5px 6px;
          text-align: left;
        }
        #${portalId} th { 
          white-space: normal;
          word-break: break-word;
          font-weight: 700;
        }
        #${portalId} thead tr {
          background-color: #b2e05c !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color: #000; 
          font-weight: 700; 
          text-align: center;
          break-after: avoid;
        }
        #${portalId} tbody tr:first-child { break-before: avoid; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    const cleanup = () => {
      document.getElementById(portalId)?.remove();
      document.getElementById(styleId)?.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
  };

  // ---- Save As: Word (.doc) ----
  const handleSaveAsWord = () => {
    if (!printRef.current) return;

    // A4 Word page layout: 11906 twips wide, 16838 twips tall, 720 twip (0.5in) margins
    const pageXml = `<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>`;

    const tableStyles = `
      body { font-family: Arial, sans-serif; color: #000; margin: 0; }
      h1 { font-size: 18pt; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 2pt; margin-bottom: 12pt; }
      h2 { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; }
      h3 { font-size: 12pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-top: 4pt; }
      .mb-8 { margin-bottom: 24pt; }
      table { width: 100%; border-collapse: collapse; font-size: 10pt; }
      th, td { border: 1px solid #111; padding: 5px 8px; }
      th { background-color: #b2e05c; font-weight: bold; text-align: center; white-space: nowrap; }
      .text-center { text-align: center; }
      .uppercase { text-transform: uppercase; }
    `;

    // Build sections with Word-native page breaks between them
    const wordPageBreak = `<br style="mso-break-type:page-break" clear="all"/>`;
    const sections = Array.from(
      printRef.current.querySelectorAll<HTMLElement>(".print-section"),
    );
    const sectionsHtml = sections
      .map((s) => {
        // Clone and strip the preview-only dashed divider classes
        const clone = s.cloneNode(true) as HTMLElement;
        clone.style.borderTop = "none";
        clone.style.paddingTop = "0";
        return `<div>${clone.innerHTML}</div>`;
      })
      .join(wordPageBreak);

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8"/>
          <meta name=ProgId content=Word.Document>
          <title>Report</title>
          <style>
            ${tableStyles}
            @page WordSection1 { size: 21cm 29.7cm; margin: 1.27cm; mso-page-orientation: portrait; }
            div.WordSection1 { page: WordSection1; }
          </style>
          <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
          <!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
          <!--[if gte mso 9]><xml><w:WordDocument>${pageXml}</w:WordDocument></xml><![endif]-->
        </head>
        <body>
          <div class="WordSection1">${sectionsHtml}</div>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = `report_${yearOption || "all"}_${semester.replace(/ /g, "_")}.doc`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Saved: ${filename}`);
  };

  const groupedData = previewData.reduce(
    (acc, student) => {
      if (!acc[student.program]) acc[student.program] = [];
      acc[student.program].push(student);
      return acc;
    },
    {} as Record<string, Student[]>,
  );

  const programsWithCounts =
    stats?.programs
      .map((p) => ({
        program: p.program,
        count: sf10Option === "passed" ? p.passed : p.failed,
      }))
      .filter((p) => p.count > 0) || [];

  const currentDate = new Date()
    .toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Toast notification */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[999] flex items-center gap-3 px-5 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl shadow-xl font-semibold text-sm max-w-xs"
          style={{ animation: "slideInToast 0.25s ease" }}
        >
          <CheckCircle className="w-5 h-5 text-green-400 dark:text-green-600 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Printables</h2>

        <div className="flex items-center gap-3">
          {/* Save as Word button */}
          <button
            onClick={handleSaveAsWord}
            disabled={previewData.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            Save as Word
          </button>

          {/* Print button */}
          <button
            onClick={handlePrint}
            disabled={previewData.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl shadow-md hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
          >
            <Printer className="w-5 h-5" />
            Print Report
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 h-[calc(100vh-8rem)]">
        {/* Left: Configuration */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-6 p-6 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-y-auto">
          <h3 className="font-bold text-lg border-b border-neutral-100 dark:border-neutral-800 pb-3">
            Configuration
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              SF10 Status
            </label>
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
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Enrollment Status
            </label>
            <select
              value={enrollmentOption}
              onChange={(e) => setEnrollmentOption(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="enrolled">Enrolled</option>
              <option value="not_enrolled">Not Enrolled</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Year Enrolled
            </label>
            <select
              value={yearOption || ""}
              onChange={(e) =>
                setYearOption(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="FIRST SEMESTER">First Semester</option>
              <option value="SECOND SEMESTER">Second Semester</option>
              <option value="MID-YEAR">Mid-Year</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Academic Year
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2025-2026"
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          <div className="space-y-3 flex-1 flex flex-col min-h-[12rem]">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex-shrink-0">
              Select Programs
            </label>
            <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {stats ? (
                programsWithCounts.length > 0 ? (
                  programsWithCounts.map((p) => (
                    <label
                      key={p.program}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPrograms.has(p.program)}
                        onChange={() => toggleProgram(p.program)}
                        className="w-4 h-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900 dark:focus:ring-white"
                      />
                      <span className="flex-1 text-sm font-bold">
                        {p.program}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 bg-neutral-200 dark:bg-neutral-800 rounded-full text-neutral-700 dark:text-neutral-300">
                        {p.count}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 italic p-2">
                    No programs match this criteria.
                  </p>
                )
              ) : (
                <p className="text-sm text-neutral-500 animate-pulse p-2">
                  Loading programs...
                </p>
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
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-y-auto relative p-4">
          {previewData.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
              <Printer className="w-16 h-16 mb-4 text-neutral-300 dark:text-neutral-800" />
              <p className="font-medium text-lg text-neutral-500 dark:text-neutral-400">
                Configure options and generate preview
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 items-center">
              <div ref={printRef} className="space-y-4 w-full max-w-[8.5in]">
                {Object.entries(groupedData).map(([program, students]) => (
                  <div
                    key={program}
                    className="bg-white dark:bg-neutral-950 p-8 shadow-md rounded-sm page-break"
                  >
                    <div className="text-center mb-6">
                      <h2 className="text-sm font-bold uppercase text-neutral-900 dark:text-white leading-tight">
                        LIST OF BATCH {yearOption || "ALL"} STUDENTS{" "}
                        {sf10Option === "passed" ? "WITH" : "WITHOUT"} SF10/TOR
                        AS OF {currentDate}
                      </h2>
                      <h3 className="text-xs font-normal uppercase text-neutral-900 dark:text-white mt-1">
                        {semester}, A.Y. {academicYear}
                      </h3>
                    </div>

                    <h1 className="text-lg font-black uppercase text-center tracking-wider text-neutral-900 dark:text-white mb-4">
                      {program}
                    </h1>

                    <table className="w-full text-left border-collapse border border-neutral-900 dark:border-neutral-500 text-xs">
                      <thead>
                        <tr
                          className="bg-[#b2e05c] text-black"
                          style={
                            {
                              WebkitPrintColorAdjust: "exact",
                              printColorAdjust: "exact",
                            } as React.CSSProperties
                          }
                        >
                          <th
                            className="py-2 px-3 font-bold border border-neutral-900 dark:border-neutral-500 text-center whitespace-normal"
                            style={{ width: "33.33%" }}
                          >
                            FULL NAME
                          </th>
                          <th
                            className="py-2 px-3 font-bold border border-neutral-900 dark:border-neutral-500 text-center whitespace-nowrap"
                            style={{ width: "16.67%" }}
                          >
                            COURSE CODE
                          </th>
                          <th
                            className="py-2 px-3 font-bold border border-neutral-900 dark:border-neutral-500 text-center whitespace-normal"
                            style={{ width: "50%" }}
                          >
                            SCHOOL
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr
                            key={student.student_id}
                            className="text-neutral-900 dark:text-white"
                          >
                            <td
                              className="py-2 px-3 font-normal border border-neutral-900 dark:border-neutral-500"
                              style={{ width: "33.33%" }}
                            >
                              {student.last_name.toUpperCase()},{" "}
                              {student.first_name.toUpperCase()}{" "}
                              {student.middle_name
                                ? `${student.middle_name.toUpperCase()}`
                                : ""}
                            </td>
                            <td
                              className="py-2 px-3 font-normal border border-neutral-900 dark:border-neutral-500 text-center whitespace-nowrap"
                              style={{ width: "16.67%" }}
                            >
                              {student.program}
                            </td>
                            <td
                              className="py-2 px-3 border border-neutral-900 dark:border-neutral-500 uppercase font-normal"
                              style={{ width: "50%" }}
                            >
                              {student.shs_name || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
