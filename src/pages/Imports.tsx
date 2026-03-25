import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import { api, Student, ImportBatch } from "../lib/api";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";

export default function Imports() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Student[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBatches = async () => {
    try {
      const data = await api.getImportBatches();
      setBatches(data);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleDeleteBatch = async (id: number) => {
    try {
      await api.deleteImportBatch(id);
      fetchBatches();
      setConfirmDeleteId(null);
      setStatus({
        type: "success",
        message: "Import batch deleted successfully.",
      });
    } catch (err: any) {
      setStatus({
        type: "error",
        message: `Failed to delete batch: ${err.message || err}`,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus({ type: null, message: "" });

    const parseWithEncoding = (csvText: string) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const students: Student[] = results.data
              .map((row: any) => ({
                student_id: String(row.student_id?.trim() || ""),
                last_name: String(row.last_name?.trim() || ""),
                first_name: String(row.first_name?.trim() || ""),
                middle_name: row.middle_name?.trim() || null,
                program: String(row.program?.trim() || ""),
                year_enrolled:
                  Number(row.year_enrolled) || new Date().getFullYear(),
                shs_name: row.shs_name?.trim() || null,
                status_passed_sf10: ["true", "1", "yes", "passed"].includes(
                  String(row.status_passed_sf10).toLowerCase().trim(),
                ),
                enrolled_or_not_enrolled: row.enrolled_or_not_enrolled
                  ? ["true", "1", "yes", "enrolled"].includes(
                      String(row.enrolled_or_not_enrolled).toLowerCase().trim(),
                    )
                  : true, // Default to enrolled (true)
              }))
              .filter(
                (s) => s.student_id && s.last_name && s.first_name && s.program,
              );

            setParsedData(students);
            if (students.length === 0) {
              setStatus({
                type: "error",
                message: "No valid records found in CSV. Check column headers.",
              });
            }
          } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: "Failed to parse CSV data." });
          }
        },
        error: (error: any) => {
          setStatus({
            type: "error",
            message: `Parse error: ${error.message}`,
          });
        },
      });
    };

    // Try UTF-8 first, then fall back to Latin-1 (ISO-8859-1) if encoding issue detected
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvTextUtf8 = event.target?.result as string;
      // Check if text contains replacement character (indicates encoding mismatch)
      if (csvTextUtf8.includes("\uFFFD")) {
        // Encoding mismatch detected, try Latin-1
        const reader2 = new FileReader();
        reader2.onload = (event2) => {
          const csvTextLatin1 = event2.target?.result as string;
          parseWithEncoding(csvTextLatin1);
        };
        reader2.readAsText(selectedFile, "ISO-8859-1");
      } else {
        parseWithEncoding(csvTextUtf8);
      }
    };
    reader.onerror = () => {
      setStatus({ type: "error", message: "Failed to read file." });
    };
    reader.readAsText(selectedFile, "UTF-8");
  };

  const handleRemoveFile = () => {
    setFile(null);
    setParsedData([]);
    setStatus({ type: null, message: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!file || parsedData.length === 0) return;

    setIsImporting(true);
    setStatus({ type: null, message: "" });

    try {
      const count = await api.importStudents(parsedData, file.name);
      setStatus({
        type: "success",
        message: `Successfully imported ${count} student records.`,
      });
      setFile(null);
      setParsedData([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchBatches();
    } catch (err: any) {
      setStatus({
        type: "error",
        message: `Import failed: ${err.message || String(err)}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const expectedHeaders =
    "student_id, last_name, first_name, middle_name, program, year_enrolled, shs_name, status_passed_sf10";

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-full flex flex-col">
      <h2 className="text-2xl font-bold tracking-tight">Import Records</h2>

      <div className="bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-8">
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold">Upload CSV File</h3>
          <p className="text-neutral-500 text-sm leading-relaxed">
            Please ensure your Excel spreadsheets are converted to{" "}
            <strong className="text-neutral-900 dark:text-neutral-100">
              .csv
            </strong>{" "}
            format before uploading. The system expects the following exact
            column headers (case-sensitive):
          </p>
          <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-xl font-mono text-xs overflow-x-auto text-primary-600 dark:text-primary-400 border border-neutral-100 dark:border-neutral-800">
            {expectedHeaders}
          </div>
        </div>

        <div
          className="relative border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-2xl p-12 transition-colors flex flex-col items-center justify-center text-center group bg-neutral-50/50 dark:bg-neutral-900/50 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <div className="bg-white dark:bg-neutral-800 p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform border border-neutral-100 dark:border-neutral-800">
            <Upload className="w-8 h-8 text-primary-500" />
          </div>
          <h4 className="text-lg font-bold mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            Select a CSV file to upload
          </h4>
          <p className="text-neutral-500 text-sm">
            Or drag and drop your file here
          </p>
        </div>

        {file && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shadow-inner">
              <FileSpreadsheet className="w-8 h-8 text-green-600 hidden sm:block" />
              <div className="flex-1">
                <p className="font-bold text-sm text-neutral-900 dark:text-white mb-1">
                  {file.name}
                </p>
                <div className="flex gap-3 text-xs font-semibold text-neutral-500">
                  <span className="bg-neutral-200 dark:bg-neutral-800 px-2.5 py-1 rounded-full text-neutral-700 dark:text-neutral-300">
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                  <span
                    className={
                      parsedData.length > 0
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full"
                    }
                  >
                    {parsedData.length} valid records ready
                  </span>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  disabled={isImporting}
                  className="flex-1 sm:flex-none px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 font-bold tracking-wide rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImport();
                  }}
                  disabled={isImporting || parsedData.length === 0}
                  className="flex-1 sm:flex-none px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold tracking-wide rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  {isImporting ? "Importing..." : "Start Import"}
                </button>
              </div>
            </div>

            {parsedData.length > 0 && (
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-neutral-50 dark:bg-neutral-900 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                  <h4 className="font-semibold text-sm">Preview Records</h4>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-white dark:bg-neutral-950 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Program</th>
                        <th className="px-4 py-3 font-semibold">Year</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-950/50">
                      {parsedData.map((student, i) => (
                        <tr
                          key={i}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                        >
                          <td className="px-4 py-2 font-medium">
                            {student.student_id}
                          </td>
                          <td className="px-4 py-2">
                            {student.last_name}, {student.first_name}
                          </td>
                          <td className="px-4 py-2">{student.program}</td>
                          <td className="px-4 py-2">{student.year_enrolled}</td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                student.status_passed_sf10
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-500"
                              }
                            >
                              {student.status_passed_sf10
                                ? "Passed"
                                : "Not Passed"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {status.type && (
          <div
            className={`mt-6 p-4 rounded-xl flex items-start gap-3 border ${
              status.type === "success"
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}

        {batches.length > 0 && (
          <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
            <h3 className="text-lg font-semibold mb-6">Import History</h3>
            <div className="bg-white dark:bg-neutral-950 rounded-xl overflow-hidden shadow-sm border border-neutral-200 dark:border-neutral-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">File Name</th>
                      <th className="px-6 py-4 font-semibold">Records</th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {batches.map((batch) => (
                      <tr
                        key={batch.id}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                          {new Date(batch.imported_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {batch.file_name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 px-2.5 py-1 rounded-full font-semibold text-xs">
                            {batch.record_count} added
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {confirmDeleteId === batch.id ? (
                            <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                              <span className="text-xs text-red-500 font-semibold mr-2">
                                Delete all?
                              </span>
                              <button
                                onClick={() => handleDeleteBatch(batch.id)}
                                className="text-white bg-red-500 hover:bg-red-600 font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors text-xs"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(batch.id)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors inline-flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
