import { useEffect, useState } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { api, Student } from "../lib/api";
import { Search, Loader2, X, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [enrollmentFilter, setEnrollmentFilter] = usePersistentState<
    boolean | undefined
  >("tablesEnrollmentFilter", undefined);
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  // Status change confirmation
  const [statusConfirm, setStatusConfirm] = useState<{
    studentId: string;
    currentStatus: boolean;
  } | null>(null);

  // Enrollment change confirmation
  const [enrollmentConfirm, setEnrollmentConfirm] = useState<{
    studentId: string;
    currentEnrolled: boolean;
  } | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEnrollmentConfirm, setBulkEnrollmentConfirm] = useState<{
    enrolled: boolean;
  } | null>(null);
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState<{
    passed: boolean;
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
        enrollmentFilter,
      );
      setStudents(data);
      setCurrentPage(1);
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
  }, [search, yearCode, statusFilter, enrollmentFilter, programFilter]);

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

  const toggleEnrollment = async (
    studentId: string,
    currentEnrolled: boolean,
  ) => {
    try {
      await api.toggleEnrolled(studentId, !currentEnrolled);
      setEnrollmentConfirm(null);
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnrollmentClick = (
    studentId: string,
    currentEnrolled: boolean,
  ) => {
    setEnrollmentConfirm({ studentId, currentEnrolled });
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
    if (sortBy === "name_asc") {
      const last = a.last_name.localeCompare(b.last_name);
      return last !== 0 ? last : a.first_name.localeCompare(b.first_name);
    }
    if (sortBy === "name_desc") {
      const last = b.last_name.localeCompare(a.last_name);
      return last !== 0 ? last : b.first_name.localeCompare(a.first_name);
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / itemsPerPage));
  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Ensure current page is valid when data changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const isAllPageSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => selectedIds.has(s.student_id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSelected = new Set(selectedIds);
    if (e.target.checked) {
      paginatedStudents.forEach((s) => newSelected.add(s.student_id));
    } else {
      paginatedStudents.forEach((s) => newSelected.delete(s.student_id));
    }
    setSelectedIds(newSelected);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkEnrollment = async (enrolled: boolean) => {
    try {
      await api.toggleEnrolledBatch(Array.from(selectedIds), enrolled);
      setBulkEnrollmentConfirm(null);
      setSelectedIds(new Set()); // clear selection
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkStatus = async (passed: boolean) => {
    try {
      await api.toggleSf10Batch(Array.from(selectedIds), passed);
      setBulkStatusConfirm(null);
      setSelectedIds(new Set()); // clear selection
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setYearCode(undefined);
    setStatusFilter(undefined);
    setEnrollmentFilter(undefined);
    setProgramFilter("");
    setSortBy("name_asc");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search !== "" ||
    yearCode !== undefined ||
    statusFilter !== undefined ||
    enrollmentFilter !== undefined ||
    programFilter !== "" ||
    sortBy !== "name_asc";

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
            <option value="true">Submitted SF10</option>
            <option value="false">Not Submitted</option>
          </select>

          <select
            value={
              enrollmentFilter === undefined
                ? ""
                : enrollmentFilter
                  ? "true"
                  : "false"
            }
            onChange={(e) => {
              const val = e.target.value;
              setEnrollmentFilter(val === "" ? undefined : val === "true");
            }}
            className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Enrollment</option>
            <option value="true">Enrolled</option>
            <option value="false">Not Enrolled</option>
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

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors shrink-0"
              title="Reset Filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-neutral-950 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col">
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} selected
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBulkStatusConfirm({ passed: true })}
                className="px-3 py-1.5 text-sm font-semibold text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-300 dark:bg-green-900/40 dark:hover:bg-green-800/60 rounded-lg transition-colors"
              >
                Mark Submitted
              </button>
              <button
                onClick={() => setBulkStatusConfirm({ passed: false })}
                className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/40 dark:hover:bg-red-800/60 rounded-lg transition-colors"
              >
                Mark Not Submitted
              </button>
              <div className="w-px h-6 bg-blue-200 dark:bg-blue-800 mx-1"></div>
              <button
                onClick={() => setBulkEnrollmentConfirm({ enrolled: true })}
                className="px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 rounded-lg transition-colors"
              >
                Mark Enrolled
              </button>
              <button
                onClick={() => setBulkEnrollmentConfirm({ enrolled: false })}
                className="px-3 py-1.5 text-sm font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 dark:text-orange-300 dark:bg-orange-900/40 dark:hover:bg-orange-800/60 rounded-lg transition-colors"
              >
                Mark Not Enrolled
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-neutral-950/50 flex items-center justify-center z-10 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-0">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                    disabled={paginatedStudents.length === 0}
                  />
                </th>
                <th className="px-6 py-4 font-semibold text-sm">Student ID</th>
                <th className="px-6 py-4 font-semibold text-sm">Last Name</th>
                <th className="px-6 py-4 font-semibold text-sm">First Name</th>
                <th className="px-6 py-4 font-semibold text-sm">Middle Name</th>
                <th className="px-6 py-4 font-semibold text-sm">Course Code</th>
                <th className="px-6 py-4 font-semibold text-sm">SHS Name</th>
                <th className="px-6 py-4 font-semibold text-sm">Status</th>
                <th className="px-6 py-4 font-semibold text-sm">SF10 Status</th>
                <th className="px-6 py-4 font-semibold text-sm text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {paginatedStudents.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-neutral-500"
                  >
                    No student records found.
                  </td>
                </tr>
              )}
              {paginatedStudents.map((student) => {
                return (
                  <tr
                    key={student.student_id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student.student_id)}
                        onChange={() => toggleSelect(student.student_id)}
                        className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
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
                          handleEnrollmentClick(
                            student.student_id,
                            student.enrolled_or_not_enrolled,
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${student.enrolled_or_not_enrolled
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                          : "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50"
                          }`}
                      >
                        {student.enrolled_or_not_enrolled
                          ? "Enrolled"
                          : "Not Enrolled"}
                      </button>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          handleStatusClick(
                            student.student_id,
                            student.status_passed_sf10,
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${student.status_passed_sf10
                          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                          : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                          }`}
                      >
                        {student.status_passed_sf10 ? "Submitted" : "Not Submitted"}
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

        {/* Pagination Controls */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Showing <span className="font-medium text-neutral-900 dark:text-white">{sortedStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-neutral-900 dark:text-white">{Math.min(currentPage * itemsPerPage, sortedStudents.length)}</span> of <span className="font-medium text-neutral-900 dark:text-white">{sortedStudents.length}</span> students
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400 hidden sm:inline">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 min-w-[5rem] text-center">
                Page {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
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
                  ? "Mark this student as Not Submitted?"
                  : "Mark this student as Submitted?"}
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

      {/* Enrollment Change Confirmation Modal */}
      {enrollmentConfirm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
            <div className="flex items-center justify-center p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="p-6 text-center space-y-3">
              <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                Change Enrollment Status?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {enrollmentConfirm.currentEnrolled
                  ? "Mark this student as Not Enrolled?"
                  : "Mark this student as Enrolled?"}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                This action will update the student's enrollment status in the
                database.
              </p>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-center gap-3 bg-neutral-50 dark:bg-neutral-900 rounded-b-2xl flex-shrink-0">
              <button
                onClick={() => setEnrollmentConfirm(null)}
                className="px-5 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  toggleEnrollment(
                    enrollmentConfirm.studentId,
                    enrollmentConfirm.currentEnrolled,
                  )
                }
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl shadow-sm transition-colors"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Enrollment Change Confirmation Modal */}
      {bulkEnrollmentConfirm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
            <div className="flex items-center justify-center p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="p-6 text-center space-y-3">
              <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                Change Enrollment Status?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                You are about to mark {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} as{" "}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {bulkEnrollmentConfirm.enrolled ? "Enrolled" : "Not Enrolled"}
                </span>.
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                This action will update the database records immediately.
              </p>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-center gap-3 bg-neutral-50 dark:bg-neutral-900 rounded-b-2xl flex-shrink-0">
              <button
                onClick={() => setBulkEnrollmentConfirm(null)}
                className="px-5 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkEnrollment(bulkEnrollmentConfirm.enrolled)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl shadow-sm transition-colors"
              >
                Confirm Batch Change
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Status Change Confirmation Modal */}
      {bulkStatusConfirm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
            <div className="flex items-center justify-center p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <div className="p-6 text-center space-y-3">
              <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                Change SF10 Status?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                You are about to mark {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} as{" "}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {bulkStatusConfirm.passed ? "Submitted" : "Not Submitted"}
                </span>.
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                This action will update the database records immediately.
              </p>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-center gap-3 bg-neutral-50 dark:bg-neutral-900 rounded-b-2xl flex-shrink-0">
              <button
                onClick={() => setBulkStatusConfirm(null)}
                className="px-5 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkStatus(bulkStatusConfirm.passed)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-xl shadow-sm transition-colors"
              >
                Confirm Batch Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
