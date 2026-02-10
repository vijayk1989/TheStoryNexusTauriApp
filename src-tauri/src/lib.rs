use std::fs;
use std::path::{Path, PathBuf};
#[cfg(target_os = "macos")]
use std::process::Command;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_export_file(app: tauri::AppHandle, filename: String, content: String) -> Result<Option<String>, String> {
    let safe_filename = sanitize_filename(&filename);
    let export_path = match select_export_path(&app, &safe_filename)? {
        Some(path) => path,
        None => return Ok(None),
    };

    if let Some(parent_dir) = export_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| format!("Failed to create export directory: {error}"))?;
    }

    fs::write(&export_path, content).map_err(|error| format!("Failed to write export file: {error}"))?;

    Ok(Some(export_path.to_string_lossy().into_owned()))
}

fn select_export_path(app: &tauri::AppHandle, filename: &str) -> Result<Option<PathBuf>, String> {
    let export_dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().document_dir())
        .map_err(|_| String::from("Unable to resolve a writable export directory"))?;

    fs::create_dir_all(&export_dir)
        .map_err(|error| format!("Failed to create export directory: {error}"))?;

    #[cfg(target_os = "macos")]
    {
        return choose_export_path_macos(filename, &export_dir);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let export_path = next_available_path(&export_dir, filename);
        Ok(Some(export_path))
    }
}

#[cfg(target_os = "macos")]
fn choose_export_path_macos(filename: &str, export_dir: &Path) -> Result<Option<PathBuf>, String> {
    let output = Command::new("osascript")
        .env("EXPORT_DEFAULT_NAME", filename)
        .env("EXPORT_DEFAULT_DIR", export_dir.to_string_lossy().to_string())
        .arg("-e")
        .arg("set defaultName to system attribute \"EXPORT_DEFAULT_NAME\"")
        .arg("-e")
        .arg("set defaultDir to system attribute \"EXPORT_DEFAULT_DIR\"")
        .arg("-e")
        .arg("set targetFile to choose file name with prompt \"Save Export As\" default location (POSIX file defaultDir) default name defaultName")
        .arg("-e")
        .arg("POSIX path of targetFile")
        .output()
        .map_err(|error| format!("Failed to open save dialog: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("User canceled") || stderr.contains("(-128)") {
            return Ok(None);
        }

        return Err(format!("Save dialog failed: {}", stderr.trim()));
    }

    let selected_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if selected_path.is_empty() {
        return Ok(None);
    }

    Ok(Some(PathBuf::from(selected_path)))
}

fn sanitize_filename(filename: &str) -> String {
    let cleaned: String = filename
        .trim()
        .chars()
        .map(|character| match character {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect();

    let cleaned = cleaned
        .trim_matches(|character: char| character == ' ' || character == '.')
        .to_string();

    if cleaned.is_empty() {
        String::from("export.txt")
    } else {
        cleaned
    }
}

#[cfg(not(target_os = "macos"))]
fn next_available_path(directory: &Path, filename: &str) -> PathBuf {
    let initial_path = directory.join(filename);
    if !initial_path.exists() {
        return initial_path;
    }

    let path = Path::new(filename);
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("export");
    let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("");

    for index in 1.. {
        let candidate_name = if extension.is_empty() {
            format!("{stem} ({index})")
        } else {
            format!("{stem} ({index}).{extension}")
        };
        let candidate_path = directory.join(candidate_name);
        if !candidate_path.exists() {
            return candidate_path;
        }
    }

    unreachable!()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, save_export_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
