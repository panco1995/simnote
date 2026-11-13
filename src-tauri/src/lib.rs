mod i18n;

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use serde_json::{Map, Value};
use tauri::{AppHandle, Manager, State};

use i18n::I18n;

const THEMES: &[&str] = &["retro", "modern"];

fn app_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn write_atomic(path: &Path, data: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, data).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

fn read_settings(app: &AppHandle) -> Map<String, Value> {
    let Ok(dir) = app.path().app_data_dir() else {
        return Map::new();
    };
    let Ok(text) = fs::read_to_string(dir.join("settings.json")) else {
        return Map::new();
    };
    serde_json::from_str::<Value>(&text)
        .ok()
        .and_then(|value| value.as_object().cloned())
        .unwrap_or_default()
}

fn update_setting(app: &AppHandle, key: &str, value: Value) -> Result<(), String> {
    let mut settings = read_settings(app);
    settings.insert(key.to_string(), value);
    let path = app_dir(app)?.join("settings.json");
    write_atomic(&path, &Value::Object(settings).to_string())
}

fn saved_locale(app: &AppHandle) -> Option<String> {
    read_settings(app)
        .get("locale")?
        .as_str()
        .map(str::to_string)
}

fn notes_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("notes.json"))
}

#[tauri::command]
fn get_locale(i18n: State<I18n>) -> String {
    i18n.get()
}

#[tauri::command]
fn set_locale(app: AppHandle, i18n: State<I18n>, locale: String) -> Result<(), String> {
    if !i18n.known(&locale) {
        return Err(i18n.t("error.locale", &[]));
    }
    if let Err(detail) = update_setting(&app, "locale", Value::String(locale.clone())) {
        return Err(i18n.t("error.settings", &[("detail", &detail)]));
    }
    i18n.set(&locale);
    Ok(())
}

#[tauri::command]
fn get_theme(app: AppHandle) -> String {
    read_settings(&app)
        .get("theme")
        .and_then(|value| value.as_str())
        .filter(|theme| THEMES.contains(theme))
        .unwrap_or("")
        .to_string()
}

#[tauri::command]
fn set_theme(app: AppHandle, i18n: State<I18n>, theme: String) -> Result<(), String> {
    if !THEMES.contains(&theme.as_str()) {
        return Err(i18n.t("error.theme", &[]));
    }
    if let Err(detail) = update_setting(&app, "theme", Value::String(theme)) {
        return Err(i18n.t("error.settings", &[("detail", &detail)]));
    }
    Ok(())
}

#[tauri::command]
fn load_notes(app: AppHandle, i18n: State<I18n>) -> Result<String, String> {
    let path = match notes_path(&app) {
        Ok(path) => path,
        Err(detail) => return Err(i18n.t("error.load", &[("detail", &detail)])),
    };
    match fs::read_to_string(path) {
        Ok(data) => Ok(data),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok("[]".into()),
        Err(e) => Err(i18n.t("error.load", &[("detail", &e.to_string())])),
    }
}

#[tauri::command]
fn save_notes(app: AppHandle, i18n: State<I18n>, data: String) -> Result<(), String> {
    let path = match notes_path(&app) {
        Ok(path) => path,
        Err(detail) => return Err(i18n.t("error.save", &[("detail", &detail)])),
    };
    // Write to a temp file first so a crash mid-write can't corrupt existing notes.
    write_atomic(&path, &data).map_err(|detail| i18n.t("error.save", &[("detail", &detail)]))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let i18n = I18n::load();
            if let Some(locale) = saved_locale(app.handle()) {
                i18n.set(&locale);
            }
            app.manage(i18n);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_locale, set_locale, get_theme, set_theme, load_notes, save_notes
        ])
        .run(tauri::generate_context!())
        .expect("error while running SimNote");
}
