mod commands;
mod db;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let conn = db::db::init_db(app.handle()).expect("Failed to initialize database");
            app.manage(commands::commands::AppState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::commands::get_students,
            commands::commands::get_filter_options,
            commands::commands::update_student,
            commands::commands::toggle_sf10,
            commands::commands::toggle_sf10_batch,
            commands::commands::toggle_enrolled,
            commands::commands::toggle_enrolled_batch,
            commands::commands::get_dashboard_stats,
            commands::commands::get_printable_students,
            commands::commands::import_students,
            commands::commands::get_import_batches,
            commands::commands::delete_import_batch,
            commands::commands::get_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
