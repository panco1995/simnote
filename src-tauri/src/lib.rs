use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

fn data_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("notes.json"))
}

#[tauri::command]
fn load_notes(app: AppHandle) -> Result<String, String> {
    match fs::read_to_string(data_file(&app)?) {
        Ok(data) => Ok(data),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok("[]".into()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_notes(app: AppHandle, data: String) -> Result<(), String> {
    let path = data_file(&app)?;
    // Write to a temp file first so a crash mid-write can't corrupt existing notes.
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, data).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![load_notes, save_notes])
        .run(tauri::generate_context!())
        .expect("error while running SimNote");
}
