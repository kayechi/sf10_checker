import { invoke } from "@tauri-apps/api/core";

export interface Student {
  student_id: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  program: string;
  year_enrolled: number;
  shs_name: string | null;
  status_passed_sf10: boolean;
  enrolled_or_not_enrolled: boolean;
}

export interface ProgramStat {
  program: string;
  passed: number;
  failed: number;
}

export interface DashboardStats {
  passed: number;
  failed: number;
  programs: ProgramStat[];
}

export interface FilterOptions {
  years: number[];
  programs: string[];
}

export interface LogEntry {
  id: number;
  timestamp: string;
  action: string;
  details: string | null;
}

export interface ImportBatch {
  id: number;
  file_name: string;
  imported_at: string;
  record_count: number;
}

export const api = {
  getFilterOptions: () => invoke<FilterOptions>("get_filter_options"),

  getStudents: (
    year?: number,
    passed?: boolean,
    search?: string,
    program?: string,
    enrolled?: boolean,
  ) =>
    invoke<Student[]>("get_students", {
      year,
      passed,
      search,
      program,
      enrolled,
    }),

  updateStudent: (student: Student) =>
    invoke<void>("update_student", { student }),

  toggleSf10: (studentId: string, passed: boolean) =>
    invoke<void>("toggle_sf10", { studentId, passed }),

  toggleEnrolled: (studentId: string, enrolled: boolean) =>
    invoke<void>("toggle_enrolled", { studentId, enrolled }),

  getDashboardStats: (year?: number, enrolled?: boolean) =>
    invoke<DashboardStats>("get_dashboard_stats", { year, enrolled }),

  getPrintableStudents: (
    year?: number,
    passed?: boolean,
    enrolled?: boolean,
    programs: string[] = [],
  ) =>
    invoke<Student[]>("get_printable_students", {
      year,
      passed,
      enrolled,
      programs,
    }),

  importStudents: (students: Student[], fileName: string) =>
    invoke<number>("import_students", { students, fileName }),

  getImportBatches: () => invoke<ImportBatch[]>("get_import_batches"),

  deleteImportBatch: (id: number) =>
    invoke<void>("delete_import_batch", { id }),

  getLogs: () => invoke<LogEntry[]>("get_logs"),
};
