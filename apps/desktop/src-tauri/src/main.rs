// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;

#[derive(Default)]
struct AppState {
    api_base: Mutex<String>,
    token: Mutex<String>,
}

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

#[tauri::command]
fn set_api_base(state: tauri::State<'_, AppState>, url: String) {
    *state.api_base.lock().unwrap() = url;
}

#[tauri::command]
fn set_token(state: tauri::State<'_, AppState>, token: String) {
    *state.token.lock().unwrap() = token;
}

#[derive(Serialize, Deserialize, Debug)]
struct ReorderSuggestion {
    product_id: String,
    product_name: String,
    current_stock: f64,
    reorder_point: f64,
    suggested_qty: f64,
}

#[tauri::command]
fn get_reorder_suggestions(state: tauri::State<'_, AppState>) -> Result<Vec<ReorderSuggestion>, String> {
    let api_base = state.api_base.lock().unwrap().clone();
    let _token = state.token.lock().unwrap().clone();
    if api_base.is_empty() {
        return Err("API base URL not configured".to_string());
    }
    // Return empty list - actual data fetching is done via HTTP from frontend
    Ok(vec![])
}

#[tauri::command]
fn update_reorder_point(
    state: tauri::State<'_, AppState>,
    _product_id: String,
    _reorder_point: f64,
) -> Result<bool, String> {
    let _api_base = state.api_base.lock().unwrap().clone();
    let _token = state.token.lock().unwrap().clone();
    // Actual update is done via HTTP from frontend
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window
                .set_min_size(Some(tauri::LogicalSize::new(1024.0_f64, 600.0_f64)))
                .unwrap();
            window.center().unwrap();
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
