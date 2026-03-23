import { useState, useEffect, useRef } from "react";
import { api, DashboardStats, Student } from "../lib/api";
import { Printer, Download, ChevronDown, FileText, ImageIcon, CheckCircle } from "lucide-react";
import * as htmlToImage from "html-to-image";

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
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const saveAsRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.getDashboardStats(yearOption).then(setStats).catch(console.error);
  }, [yearOption]);

  useEffect(() => {
    api.getFilterOptions().then(res => setYears(res.years)).catch(console.error);
  }, []);

  // Close save-as dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (saveAsRef.current && !saveAsRef.current.contains(e.target as Node)) {
        setSaveAsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
      @page { size: A4; margin: 0; }
      @media print {
        body > *:not(#${portalId}) { display: none !important; }
        #${portalId} {
          display: block !important;
          font-family: Arial, sans-serif;
          color: #000;
          background: #fff;
          padding: 0.5in;
        }
        #${portalId} .print-section { page-break-after: always; }
        #${portalId} .print-section:last-child { page-break-after: avoid; }
        #${portalId} .text-center { text-align: center; }
        #${portalId} .mb-8 { margin-bottom: 2rem; }
        #${portalId} .mb-6 { margin-bottom: 1.5rem; }
        #${portalId} .mt-4 { margin-top: 1rem; }
        #${portalId} h1 { font-size: 1.4rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 1.5rem; text-align: center; }
        #${portalId} h2 { font-size: 1.1rem; font-weight: 700; text-transform: uppercase; line-height: 1.4; text-align: center; }
        #${portalId} h3 { font-size: 1rem; font-weight: 700; text-transform: uppercase; margin-top: 0.25rem; text-align: center; }
        #${portalId} table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        #${portalId} th, #${portalId} td { border: 1px solid #111; padding: 6px 10px; }
        #${portalId} th { white-space: nowrap; }
        #${portalId} thead tr {
          background-color: #b2e05c !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color: #000; font-weight: 700; text-align: center;
        }
        #${portalId} .total-count {
          margin-top: 0.75rem; text-align: right; font-size: 0.78rem;
          font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #555;
        }
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
    setSaveAsOpen(false);

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
      .total-count { text-align: right; font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-top: 8pt; color: #555; }
    `;

    // Build sections with Word-native page breaks between them
    const wordPageBreak = `<br style="mso-break-type:page-break" clear="all"/>`;
    const sections = Array.from(
      printRef.current.querySelectorAll<HTMLElement>(".print-section")
    );
    const sectionsHtml = sections
      .map(s => {
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

  // ---- Save As: Images (PNG via html2canvas) ----
  // A4 at 96 DPI = 794 x 1123px. We render at 2x for sharpness.
  const A4_WIDTH_PX = 794;
  const A4_PADDING_PX = 48; // ~0.5in at 96dpi

  const handleSaveAsImages = async () => {
    if (!printRef.current) return;
    setSaveAsOpen(false);
    setIsSaving(true);

    try {
      const sections = printRef.current.querySelectorAll<HTMLElement>(".print-section");
      const sectionArray = Array.from(sections);

      for (let i = 0; i < sectionArray.length; i++) {
        const section = sectionArray[i];
        const programEl = section.querySelector("h1");
        const programName = (programEl?.textContent || "UNKNOWN").trim().replace(/\s+/g, "-");
        const batchYear = yearOption || "ALL";
        const filename = `BATCH${batchYear}_${programName}_PAGE${i + 1}.png`;

        // Clone section into a fresh off-screen div at A4 width so html2canvas
        // can render it outside the scrollable preview container
        const wrapper = document.createElement("div");
        wrapper.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: ${A4_WIDTH_PX}px;
          background: #fff;
          color: #000;
          font-family: Arial, sans-serif;
          padding: ${A4_PADDING_PX}px;
          box-sizing: border-box;
          z-index: -1;
          opacity: 0.01;
          pointer-events: none;
        `;

        // Copy the section HTML and apply inline styles for table rendering
        const clone = section.cloneNode(true) as HTMLElement;
        // Ensure the dashed border divider isn't captured
        clone.style.borderTop = "none";
        clone.style.paddingTop = "0";

        // Fix table header background (Tauri WebView may strip computed colours)
        const theadRows = clone.querySelectorAll<HTMLElement>("thead tr");
        theadRows.forEach(tr => {
          tr.style.backgroundColor = "#b2e05c";
          tr.style.color = "#000";
        });
        const ths = clone.querySelectorAll<HTMLElement>("th, td");
        ths.forEach(el => {
          el.style.border = "1px solid #111";
          el.style.padding = "6px 10px";
          el.style.whiteSpace = el.tagName === "TH" ? "nowrap" : "normal";
        });
        const table = clone.querySelector<HTMLElement>("table");
        if (table) {
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";
          table.style.fontSize = "0.82rem";
        }

        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        // Wait significantly for the WebView to paint the cloned element
        await new Promise(r => setTimeout(r, 800));

        // html-to-image "double-render" trick: The first call triggers font/asset
        // loading internally, the second call captures the actual content.
        try {
          await htmlToImage.toBlob(wrapper);
          const dataUrl = await htmlToImage.toPng(wrapper, {
            backgroundColor: "#ffffff",
            width: A4_WIDTH_PX,
            pixelRatio: 2,
            cacheBust: true,
          });

          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } finally {
          document.body.removeChild(wrapper);
        }

        await new Promise(r => setTimeout(r, 400));
      }

      showToast(`Saved ${sectionArray.length} image${sectionArray.length !== 1 ? "s" : ""} successfully`);
    } catch (err) {
      console.error("Image export failed:", err);
      showToast("Export failed — check console");
    } finally {
      setIsSaving(false);
    }
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
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-[999] flex items-center gap-3 px-5 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl shadow-xl font-semibold text-sm max-w-xs" style={{ animation: "slideInToast 0.25s ease" }}>
          <CheckCircle className="w-5 h-5 text-green-400 dark:text-green-600 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex items-center justify-between">

        <h2 className="text-2xl font-bold tracking-tight">Printables</h2>

        <div className="flex items-center gap-3">
          {/* Save As dropdown */}
          <div className="relative" ref={saveAsRef}>
            <button
              onClick={() => setSaveAsOpen(o => !o)}
              disabled={previewData.length === 0 || isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save As"}
              <ChevronDown className={`w-4 h-4 transition-transform ${saveAsOpen ? "rotate-180" : ""}`} />
            </button>

            {saveAsOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden z-50">
                <button
                  onClick={handleSaveAsWord}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  Word Document (.doc)
                </button>
                <div className="border-t border-neutral-100 dark:border-neutral-800" />
                <button
                  onClick={handleSaveAsImages}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <ImageIcon className="w-4 h-4 text-green-500" />
                  <div>
                    <div>Images (.png)</div>
                    <div className="text-xs text-neutral-400 font-normal">BATCH_COURSE-CODE_PAGE#</div>
                  </div>
                </button>
              </div>
            )}
          </div>

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
              <option value="MID-YEAR">Mid-Year</option>
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
                        <th className="py-2 px-3 font-bold border border-neutral-900 dark:border-neutral-500 text-center w-1/3 whitespace-nowrap">FULL NAME</th>
                        <th className="py-2 px-3 font-bold border border-neutral-900 dark:border-neutral-500 text-center w-1/6 whitespace-nowrap">COURSE CODE</th>
                        <th className="py-2 px-3 font-bold border border-neutral-900 dark:border-neutral-500 text-center w-1/2 whitespace-nowrap">SCHOOL</th>
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
