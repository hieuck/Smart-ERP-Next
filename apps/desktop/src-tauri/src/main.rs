// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use reqwest;

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
fn get_arch() -> String {
    std::env::consts::ARCH.to_string()
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            api_base: Mutex::new("".to_string()),
            token: Mutex::new("".to_string()),
        })
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            // Set minimum window size
            window
                .set_min_size(Some(tauri::LogicalSize::new(1024.0_f64, 600.0_f64)))
                .unwrap();
            // Center on startup
            window.center().unwrap();
            #[cfg(debug_assertions)]
            window.open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_platform,
            get_arch,
            get_reorder_suggestions,
            update_reorder_point,
            set_api_base,
            set_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
