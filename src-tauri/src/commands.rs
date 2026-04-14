pub mod commands {
    use rusqlite::params;
    use serde::{Deserialize, Serialize};
    use std::sync::Mutex;
    use tauri::State;

    #[derive(Serialize, Deserialize)]
    pub struct Student {
        pub student_id: String,
        pub last_name: String,
        pub first_name: String,
        pub middle_name: Option<String>,
        pub program: String,
        pub year_enrolled: u32,
        pub shs_name: Option<String>,
        pub status_passed_sf10: bool,
        pub enrolled_or_not_enrolled: bool,
    }

    #[derive(Serialize)]
    pub struct DashboardStats {
        pub passed: u32,
        pub failed: u32,
        pub programs: Vec<ProgramStat>,
    }

    #[derive(Serialize)]
    pub struct ProgramStat {
        pub program: String,
        pub passed: u32,
        pub failed: u32,
    }

    #[derive(Serialize)]
    pub struct LogEntry {
        pub id: u32,
        pub timestamp: String,
        pub action: String,
        pub details: Option<String>,
    }

    #[derive(Serialize)]
    pub struct ImportBatch {
        pub id: u32,
        pub file_name: String,
        pub imported_at: String,
        pub record_count: u32,
    }

    #[derive(Serialize)]
    pub struct FilterOptions {
        pub years: Vec<u32>,
        pub programs: Vec<String>,
    }

    pub struct AppState(pub Mutex<rusqlite::Connection>);

    #[tauri::command]
    pub fn get_filter_options(state: State<AppState>) -> Result<FilterOptions, String> {
        let db = state.0.lock().unwrap();

        let mut years = Vec::new();
        let mut stmt_years = db
            .prepare("SELECT DISTINCT year_enrolled FROM students ORDER BY year_enrolled DESC")
            .map_err(|e| e.to_string())?;
        let year_iter = stmt_years
            .query_map([], |row| row.get::<_, u32>(0))
            .map_err(|e| e.to_string())?;
        for y in year_iter {
            if let Ok(year) = y {
                years.push(year);
            }
        }

        let mut programs = Vec::new();
        let mut stmt_progs = db
            .prepare("SELECT DISTINCT program FROM students ORDER BY program ASC")
            .map_err(|e| e.to_string())?;
        let prog_iter = stmt_progs
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        for p in prog_iter {
            if let Ok(prog) = p {
                programs.push(prog);
            }
        }

        Ok(FilterOptions { years, programs })
    }

    #[tauri::command]
    pub fn get_students(
        state: State<AppState>,
        year: Option<u32>,
        passed: Option<bool>,
        search: Option<String>,
        program: Option<String>,
        enrolled: Option<bool>,
    ) -> Result<Vec<Student>, String> {
        let db = state.0.lock().unwrap();
        let mut query = "SELECT student_id, last_name, first_name, middle_name, program, year_enrolled, shs_name, status_passed_sf10, enrolled_or_not_enrolled FROM students WHERE 1=1".to_string();
        let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(y) = year {
            query.push_str(" AND year_enrolled = ?");
            params_vec.push(rusqlite::types::Value::Integer(y as i64));
        }
        if let Some(p) = passed {
            query.push_str(" AND status_passed_sf10 = ?");
            params_vec.push(rusqlite::types::Value::Integer(if p { 1 } else { 0 }));
        }
        if let Some(e) = enrolled {
            query.push_str(" AND enrolled_or_not_enrolled = ?");
            params_vec.push(rusqlite::types::Value::Integer(if e { 1 } else { 0 }));
        }
        if let Some(pr) = program {
            if !pr.is_empty() {
                query.push_str(" AND program = ?");
                params_vec.push(rusqlite::types::Value::Text(pr));
            }
        }
        if let Some(s) = search {
            if !s.is_empty() {
                query.push_str(" AND (student_id LIKE ? OR last_name LIKE ? OR first_name LIKE ?)");
                let like_str = format!("%{}%", s);
                params_vec.push(rusqlite::types::Value::Text(like_str.clone()));
                params_vec.push(rusqlite::types::Value::Text(like_str.clone()));
                params_vec.push(rusqlite::types::Value::Text(like_str));
            }
        }

        let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
        let student_iter = stmt
            .query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
                Ok(Student {
                    student_id: row.get(0)?,
                    last_name: row.get(1)?,
                    first_name: row.get(2)?,
                    middle_name: row.get(3)?,
                    program: row.get(4)?,
                    year_enrolled: row.get(5)?,
                    shs_name: row.get(6)?,
                    status_passed_sf10: row.get::<_, i32>(7)? == 1,
                    enrolled_or_not_enrolled: row.get::<_, i32>(8)? == 1,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut students = Vec::new();
        for student in student_iter {
            students.push(student.map_err(|e| e.to_string())?);
        }

        Ok(students)
    }

    #[tauri::command]
    pub fn update_student(state: State<AppState>, student: Student) -> Result<(), String> {
        let db = state.0.lock().unwrap();
        db.execute(
            "UPDATE students SET last_name = ?, first_name = ?, middle_name = ?, program = ?, year_enrolled = ?, shs_name = ?, status_passed_sf10 = ?, enrolled_or_not_enrolled = ? WHERE student_id = ?",
            params![
                student.last_name,
                student.first_name,
                student.middle_name,
                student.program,
                student.year_enrolled,
                student.shs_name,
                if student.status_passed_sf10 { 1 } else { 0 },
                if student.enrolled_or_not_enrolled { 1 } else { 0 },
                student.student_id
            ],
        ).map_err(|e| e.to_string())?;
        let action = "Update Student";
        let details = format!("Updated {}", student.student_id);
        db.execute(
            "INSERT INTO logs (action, details) VALUES (?, ?)",
            params![action, details],
        )
        .ok();
        Ok(())
    }

    #[tauri::command]
    pub fn toggle_sf10(
        state: State<AppState>,
        student_id: String,
        passed: bool,
    ) -> Result<(), String> {
        let db = state.0.lock().unwrap();
        db.execute(
            "UPDATE students SET status_passed_sf10 = ? WHERE student_id = ?",
            params![if passed { 1 } else { 0 }, student_id],
        )
        .map_err(|e| e.to_string())?;
        let action = "Toggle SF10";
        let details = format!("Set sf10={} for {}", passed, student_id);
        db.execute(
            "INSERT INTO logs (action, details) VALUES (?, ?)",
            params![action, details],
        )
        .ok();
        Ok(())
    }

    #[tauri::command]
    pub fn toggle_enrolled(
        state: State<AppState>,
        student_id: String,
        enrolled: bool,
    ) -> Result<(), String> {
        let db = state.0.lock().unwrap();
        db.execute(
            "UPDATE students SET enrolled_or_not_enrolled = ? WHERE student_id = ?",
            params![if enrolled { 1 } else { 0 }, student_id],
        )
        .map_err(|e| e.to_string())?;
        let action = "Toggle Enrollment";
        let details = format!("Set enrolled={} for {}", enrolled, student_id);
        db.execute(
            "INSERT INTO logs (action, details) VALUES (?, ?)",
            params![action, details],
        )
        .ok();
        Ok(())
    }

    #[tauri::command]
    pub fn get_dashboard_stats(
        state: State<AppState>,
        year: Option<u32>,
        enrolled: Option<bool>,
    ) -> Result<DashboardStats, String> {
        let db = state.0.lock().unwrap();

        let mut stats = DashboardStats {
            passed: 0,
            failed: 0,
            programs: Vec::new(),
        };

        let mut where_parts = Vec::new();
        if let Some(y) = year {
            where_parts.push(format!("year_enrolled = {}", y));
        }
        if let Some(e) = enrolled {
            where_parts.push(format!(
                "enrolled_or_not_enrolled = {}",
                if e { 1 } else { 0 }
            ));
        }

        let year_cond = if where_parts.is_empty() {
            "".to_string()
        } else {
            format!("WHERE {}", where_parts.join(" AND "))
        };

        let q_overall = format!("SELECT SUM(CASE WHEN status_passed_sf10 = 1 THEN 1 ELSE 0 END), SUM(CASE WHEN status_passed_sf10 = 0 THEN 1 ELSE 0 END) FROM students {}", year_cond);
        db.query_row(&q_overall, [], |row| {
            stats.passed = row.get::<_, Option<u32>>(0)?.unwrap_or(0);
            stats.failed = row.get::<_, Option<u32>>(1)?.unwrap_or(0);
            Ok(())
        })
        .map_err(|e| e.to_string())?;

        let q_prog = format!("SELECT program, SUM(CASE WHEN status_passed_sf10 = 1 THEN 1 ELSE 0 END), SUM(CASE WHEN status_passed_sf10 = 0 THEN 1 ELSE 0 END) FROM students {} GROUP BY program", year_cond);
        let mut stmt = db.prepare(&q_prog).map_err(|e| e.to_string())?;
        let program_iter = stmt
            .query_map([], |row| {
                Ok(ProgramStat {
                    program: row.get(0)?,
                    passed: row.get::<_, Option<u32>>(1)?.unwrap_or(0),
                    failed: row.get::<_, Option<u32>>(2)?.unwrap_or(0),
                })
            })
            .map_err(|e| e.to_string())?;

        for stat in program_iter {
            stats.programs.push(stat.map_err(|e| e.to_string())?);
        }

        Ok(stats)
    }

    #[tauri::command]
    pub fn get_printable_students(
        state: State<AppState>,
        year: Option<u32>,
        passed: Option<bool>,
        enrolled: Option<bool>,
        programs: Vec<String>,
    ) -> Result<Vec<Student>, String> {
        let db = state.0.lock().unwrap();
        let mut query = "SELECT student_id, last_name, first_name, middle_name, program, year_enrolled, shs_name, status_passed_sf10, enrolled_or_not_enrolled FROM students WHERE 1=1".to_string();
        let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(y) = year {
            query.push_str(" AND year_enrolled = ?");
            params_vec.push(rusqlite::types::Value::Integer(y as i64));
        }
        if let Some(p) = passed {
            query.push_str(" AND status_passed_sf10 = ?");
            params_vec.push(rusqlite::types::Value::Integer(if p { 1 } else { 0 }));
        }
        if let Some(e) = enrolled {
            query.push_str(" AND enrolled_or_not_enrolled = ?");
            params_vec.push(rusqlite::types::Value::Integer(if e { 1 } else { 0 }));
        }
        if !programs.is_empty() {
            let program_placeholders: Vec<String> =
                programs.iter().map(|_| "?".to_string()).collect();
            query.push_str(&format!(
                " AND program IN ({})",
                program_placeholders.join(",")
            ));
            for p in programs {
                params_vec.push(rusqlite::types::Value::Text(p));
            }
        }

        query.push_str(" ORDER BY program ASC, last_name ASC");

        let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
        let student_iter = stmt
            .query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
                Ok(Student {
                    student_id: row.get(0)?,
                    last_name: row.get(1)?,
                    first_name: row.get(2)?,
                    middle_name: row.get(3)?,
                    program: row.get(4)?,
                    year_enrolled: row.get(5)?,
                    shs_name: row.get(6)?,
                    status_passed_sf10: row.get::<_, i32>(7)? == 1,
                    enrolled_or_not_enrolled: row.get::<_, i32>(8)? == 1,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut students = Vec::new();
        for student in student_iter {
            students.push(student.map_err(|e| e.to_string())?);
        }

        Ok(students)
    }

    #[tauri::command]
    pub fn import_students(
        state: State<AppState>,
        students: Vec<Student>,
        file_name: String,
    ) -> Result<usize, String> {
        let mut db = state.0.lock().unwrap();
        let tx = db.transaction().map_err(|e| e.to_string())?;

        let batch_id = {
            tx.execute(
                "INSERT INTO import_batches (file_name, record_count) VALUES (?, ?)",
                params![file_name, students.len() as u32],
            )
            .map_err(|e| e.to_string())?;
            tx.last_insert_rowid()
        };

        let mut count = 0;
        for student in students {
            let res = tx.execute(
                "INSERT OR REPLACE INTO students (student_id, last_name, first_name, middle_name, program, year_enrolled, shs_name, status_passed_sf10, enrolled_or_not_enrolled, import_batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    student.student_id,
                    student.last_name,
                    student.first_name,
                    student.middle_name,
                    student.program,
                    student.year_enrolled,
                    student.shs_name,
                    if student.status_passed_sf10 { 1 } else { 0 },
                    if student.enrolled_or_not_enrolled { 1 } else { 0 },
                    batch_id
                ],
            );
            if res.is_ok() {
                count += 1;
            }
        }
        tx.commit().map_err(|e| e.to_string())?;
        let action = "Import Students";
        let details = format!("Imported {} records from {}", count, file_name);
        db.execute(
            "INSERT INTO logs (action, details) VALUES (?, ?)",
            params![action, details],
        )
        .ok();

        Ok(count)
    }

    #[tauri::command]
    pub fn get_import_batches(state: State<AppState>) -> Result<Vec<ImportBatch>, String> {
        let db = state.0.lock().unwrap();
        let mut stmt = db.prepare("SELECT id, file_name, imported_at, record_count FROM import_batches ORDER BY id DESC").map_err(|e| e.to_string())?;
        let batch_iter = stmt
            .query_map([], |row| {
                Ok(ImportBatch {
                    id: row.get(0)?,
                    file_name: row.get(1)?,
                    imported_at: row.get(2)?,
                    record_count: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut batches = Vec::new();
        for batch in batch_iter {
            batches.push(batch.map_err(|e| e.to_string())?);
        }
        Ok(batches)
    }

    #[tauri::command]
    pub fn delete_import_batch(state: State<AppState>, id: u32) -> Result<(), String> {
        let db = state.0.lock().unwrap();

        // Delete the students from that batch
        let students_deleted = db
            .execute(
                "DELETE FROM students WHERE import_batch_id = ?",
                params![id],
            )
            .map_err(|e| e.to_string())?;

        // Delete the batch record
        db.execute("DELETE FROM import_batches WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;

        let action = "Delete Import Batch";
        let details = format!("Deleted batch ID {} with {} students", id, students_deleted);
        db.execute(
            "INSERT INTO logs (action, details) VALUES (?, ?)",
            params![action, details],
        )
        .ok();

        Ok(())
    }

    #[tauri::command]
    pub fn get_logs(state: State<AppState>) -> Result<Vec<LogEntry>, String> {
        let db = state.0.lock().unwrap();
        let mut stmt = db
            .prepare("SELECT id, timestamp, action, details FROM logs ORDER BY id DESC LIMIT 100")
            .map_err(|e| e.to_string())?;
        let log_iter = stmt
            .query_map([], |row| {
                Ok(LogEntry {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    action: row.get(2)?,
                    details: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut logs = Vec::new();
        for log in log_iter {
            logs.push(log.map_err(|e| e.to_string())?);
        }
        Ok(logs)
    }

    #[tauri::command]
    pub fn toggle_enrolled_batch(
        state: State<AppState>,
        student_ids: Vec<String>,
        enrolled: bool,
    ) -> Result<(), String> {
        let mut db = state.0.lock().unwrap();
        let tx = db.transaction().map_err(|e| e.to_string())?;

        let enrolled_val = if enrolled { 1 } else { 0 };
        for id in &student_ids {
            tx.execute(
                "UPDATE students SET enrolled_or_not_enrolled = ? WHERE student_id = ?",
                params![enrolled_val, id],
            )
            .map_err(|e| e.to_string())?;
        }

        let action = "Toggle Enrollment (Batch)";
        let details = format!("Set enrolled={} for {} students", enrolled, student_ids.len());
        tx.execute(
            "INSERT INTO logs (action, details) VALUES (?, ?)",
            params![action, details],
        )
        .ok();

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn toggle_sf10_batch(
        state: State<AppState>,
        student_ids: Vec<String>,
        passed: bool,
    ) -> Result<(), String> {
        let mut db = state.0.lock().unwrap();
        let tx = db.transaction().map_err(|e| e.to_string())?;

        let passed_val = if passed { 1 } else { 0 };
        for id in &student_ids {
            tx.execute(
                "UPDATE students SET status_passed_sf10 = ? WHERE student_id = ?",
                params![passed_val, id],
            )
            .map_err(|e| e.to_string())?;
        }

        let action = "Toggle SF10 (Batch)";
        let details = format!("Set sf10={} for {} students", passed, student_ids.len());
        tx.execute(
            "INSERT INTO logs (action, details) VALUES (?, ?)",
            params![action, details],
        )
        .ok();

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn save_file_text(path: String, content: String) -> Result<(), String> {
        std::fs::write(path, content).map_err(|e| e.to_string())
    }
}
