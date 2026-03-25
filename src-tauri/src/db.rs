pub mod db {
    use rusqlite::Connection;
    use std::fs;
    use std::path::PathBuf;
    use tauri::{AppHandle, Manager};

    pub fn init_db(app: &AppHandle) -> Result<Connection, rusqlite::Error> {
        let app_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."));
        fs::create_dir_all(&app_dir).unwrap_or_default();
        let db_path = app_dir.join("student_records.db");

        let conn = Connection::open(db_path)?;

        // Ensure UTF-8 encoding and proper collation for special characters
        conn.execute("PRAGMA encoding = 'UTF-8'", [])?;
        conn.execute("PRAGMA foreign_keys = ON", [])?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS students (
                student_id TEXT PRIMARY KEY,
                last_name TEXT NOT NULL COLLATE NOCASE,
                first_name TEXT NOT NULL COLLATE NOCASE,
                middle_name TEXT COLLATE NOCASE,
                program TEXT NOT NULL COLLATE NOCASE,
                year_enrolled INTEGER NOT NULL,
                shs_name TEXT COLLATE NOCASE,
                status_passed_sf10 INTEGER NOT NULL DEFAULT 0,
                import_batch_id INTEGER
            )",
            [],
        )?;

        // Ensure the column exists for existing databases
        let _ = conn.execute(
            "ALTER TABLE students ADD COLUMN import_batch_id INTEGER",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS import_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                record_count INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                action TEXT NOT NULL,
                details TEXT
            )",
            [],
        )?;

        // Log initialization
        conn.execute(
            "INSERT INTO logs (action, details) VALUES ('System', 'App Started')",
            [],
        )?;

        Ok(conn)
    }
}
