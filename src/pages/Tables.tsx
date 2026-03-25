import { useEffect, useState } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { api, Student } from "../lib/api";
import { Search, Loader2, X, AlertCircle } from "lucide-react";

export default function Tables() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = usePersistentState<string>("tablesSearch", "");
  const [yearCode, setYearCode] = usePersistentState<number | undefined>(
    "tablesYearCode",
    undefined,
  );
  const [statusFilter, setStatusFilter] = usePersistentState<
    boolean | undefined
  >("tablesStatusFilter", undefined);
  const [programFilter, setProgramFilter] = usePersistentState<string>(
    "tablesProgramFilter",
    "",
  );
  const [sortBy, setSortBy] = usePersistentState<
    "id_asc" | "id_desc" | "name_asc" | "name_desc"
  >("tablesSortBy", "name_asc");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

  // Status change confirmation
  const [statusConfirm, setStatusConfirm] = useState<{
    studentId: string;
    currentStatus: boolean;
  } | null>(null);

  const [years, setYears] = useState<number[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);

  useEffect(() => {
    api
      .getFilterOptions()
      .then((res) => {
        setYears(res.years);
        setPrograms(res.programs);
      })
      .catch(console.error);
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getStudents(
        yearCode,
        statusFilter,
        search,
        programFilter || undefined,
      );
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced fetch for search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, yearCode, statusFilter, programFilter]);

  const toggleStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      await api.toggleSf10(studentId, !currentStatus);
      setStatusConfirm(null);
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusClick = (studentId: string, currentStatus: boolean) => {
    setStatusConfirm({ studentId, currentStatus });
  };

  const startEditing = (student: Student) => {
    setEditingId(student.student_id);
    setEditForm({ ...student });
  };

  const saveEdit = async () => {
    if (!editForm.student_id) return;
    try {
      await api.updateStudent(editForm as Student);
      setEditingId(null);
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === "id_asc") return a.student_id.localeCompare(b.student_id);
    if (sortBy === "id_desc") return b.student_id.localeCompare(a.student_id);
    if (sortBy === "name_asc") return a.last_name.localeCompare(b.last_name);
    if (sortBy === "name_desc") return b.last_name.localeCompare(a.last_name);
    return 0;
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Student Records</h2>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
            />
          </div>

          <select
            value={yearCode || ""}
            onChange={(e) =>
              setYearCode(e.target.value ? Number(e.target.value) : undefined)
            }
            className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={
              statusFilter === undefined ? "" : statusFilter ? "true" : "false"
            }
            onChange={(e) => {
              const val = e.target.value;
              setStatusFilter(val === "" ? undefined : val === "true");
            }}
            className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="true">Passed SF10</option>
            <option value="false">Not Passed</option>
          </select>

          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="id_asc">Student ID (Asc)</option>
            <option value="id_desc">Student ID (Desc)</option>
          </select>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-neutral-950/50 flex items-center justify-center z-10 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-0">
              <tr>
                <th className="px-6 py-4 font-semibold text-sm">Student ID</th>
                <th className="px-6 py-4 font-semibold text-sm">Last Name</th>
                <th className="px-6 py-4 font-semibold text-sm">First Name</th>
                <th className="px-6 py-4 font-semibold text-sm">Middle</th>
                <th className="px-6 py-4 font-semibold text-sm">Course</th>
                <th className="px-6 py-4 font-semibold text-sm">SHS Name</th>
                <th className="px-6 py-4 font-semibold text-sm">Status</th>
                <th className="px-6 py-4 font-semibold text-sm text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {sortedStudents.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-neutral-500"
                  >
                    No student records found.
                  </td>
                </tr>
              )}
              {sortedStudents.map((student) => {
                return (
                  <tr
                    key={student.student_id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">
                      {student.student_id}
                    </td>

                    <>
                      <td
                        className="px-6 py-4 max-w-[150px] sm:max-w-[200px] truncate"
                        title={student.last_name}
                      >
                        {student.last_name}
                      </td>
                      <td
                        className="px-6 py-4 max-w-[150px] sm:max-w-[200px] truncate"
                        title={student.first_name}
                      >
                        {student.first_name}
                      </td>
                      <td
                        className="px-6 py-4 max-w-[100px] sm:max-w-[150px] truncate text-neutral-500"
                        title={student.middle_name || ""}
                      >
                        {student.middle_name || "-"}
                      </td>
                      <td
                        className="px-6 py-4 font-medium text-primary-600 dark:text-primary-400 max-w-[150px] truncate"
                        title={student.program}
                      >
                        {student.program}
                      </td>
                      <td
                        className="px-6 py-4 max-w-[150px] sm:max-w-[250px] truncate text-neutral-500"
                        title={student.shs_name || ""}
                      >
                        {student.shs_name || "-"}
                      </td>
                    </>

                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          handleStatusClick(
                            student.student_id,
                            student.status_passed_sf10,
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
                          student.status_passed_sf10
                            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                            : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        }`}
                      >
                        {student.status_passed_sf10 ? "Passed" : "Not Passed"}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => startEditing(student)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-full">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
              <h3 className="text-xl font-bold tracking-tight">
                Edit Student Record
              </h3>
              <button
                onClick={() => setEditingId(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editForm.last_name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, last_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  First Name
                </label>
                <input
                  type="text"
                  value={editForm.first_name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, first_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={editForm.middle_name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, middle_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Course
                </label>
                <input
                  type="text"
                  value={editForm.program || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, program: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  SHS Name
                </label>
                <input
                  type="text"
                  value={editForm.shs_name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, shs_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                />
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3 bg-neutral-50 dark:bg-neutral-900 rounded-b-2xl flex-shrink-0">
              <button
                onClick={() => setEditingId(null)}
                className="px-5 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-xl shadow-sm transition-colors"
                type="button"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusConfirm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
            <div className="flex items-center justify-center p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <div className="p-6 text-center space-y-3">
              <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                Change Student Status?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {statusConfirm.currentStatus
                  ? "Mark this student as Not Passed?"
                  : "Mark this student as Passed?"}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                This action will update the student's SF10 status in the
                database.
              </p>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-center gap-3 bg-neutral-50 dark:bg-neutral-900 rounded-b-2xl flex-shrink-0">
              <button
                onClick={() => setStatusConfirm(null)}
                className="px-5 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  toggleStatus(
                    statusConfirm.studentId,
                    statusConfirm.currentStatus,
                  )
                }
                className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-xl shadow-sm transition-colors"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
