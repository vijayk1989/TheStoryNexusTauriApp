use keyring::Entry;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const KEYRING_SERVICE: &str = "thestorynexus";
const OPENROUTER_REFERER: &str = "http://localhost:1420";
const OPENROUTER_TITLE: &str = "The Story Nexus";

#[derive(Debug, Deserialize)]
pub struct ChatCompletionRequest {
    provider: String,
    model: String,
    messages: Vec<ChatMessage>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
    top_p: Option<f32>,
    top_k: Option<u32>,
    repetition_penalty: Option<f32>,
    min_p: Option<f32>,
    base_url: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
pub struct FetchModelsRequest {
    provider: String,
    base_url: Option<String>,
    models_route: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProviderModel {
    id: String,
    name: String,
    provider: String,
    context_length: Option<u32>,
}

fn normalize_provider(provider: &str) -> Result<&'static str, String> {
    match provider.trim().to_lowercase().as_str() {
        "openai" => Ok("openai"),
        "openrouter" => Ok("openrouter"),
        "nanogpt" => Ok("nanogpt"),
        "openai_compatible" => Ok("openai_compatible"),
        _ => Err(format!("Unsupported provider: {provider}")),
    }
}

fn keyring_entry(provider: &str) -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, &format!("provider:{provider}"))
        .map_err(|error| format!("Failed to open secure key entry: {error}"))
}

fn get_required_api_key(provider: &str) -> Result<String, String> {
    let entry = keyring_entry(provider)?;
    entry
        .get_password()
        .map_err(|error| format!("No API key found for provider '{provider}': {error}"))
}

fn join_base_url(base_url: &str, route: &str) -> String {
    let base = base_url.trim_end_matches('/');
    if route.starts_with("http://") || route.starts_with("https://") {
        route.to_string()
    } else if route.starts_with('/') {
        format!("{base}{route}")
    } else {
        format!("{base}/{route}")
    }
}

fn resolve_chat_endpoint(provider: &str, base_url: Option<&str>) -> Result<String, String> {
    match provider {
        "openai" => Ok("https://api.openai.com/v1/chat/completions".to_string()),
        "openrouter" => Ok("https://openrouter.ai/api/v1/chat/completions".to_string()),
        "nanogpt" => Ok("https://nano-gpt.com/api/v1/chat/completions".to_string()),
        "openai_compatible" => {
            let base =
                base_url.ok_or_else(|| "OpenAI-compatible base URL is required".to_string())?;
            Ok(join_base_url(base, "/chat/completions"))
        }
        _ => Err(format!("Unsupported provider: {provider}")),
    }
}

fn resolve_models_endpoint(
    provider: &str,
    base_url: Option<&str>,
    models_route: Option<&str>,
) -> Result<String, String> {
    match provider {
        "openai" => Ok("https://api.openai.com/v1/models".to_string()),
        "openrouter" => Ok("https://openrouter.ai/api/v1/models".to_string()),
        "nanogpt" => Ok("https://nano-gpt.com/api/v1/models".to_string()),
        "openai_compatible" => {
            let base =
                base_url.ok_or_else(|| "OpenAI-compatible base URL is required".to_string())?;
            if let Some(route) = models_route {
                Ok(join_base_url(base, route))
            } else {
                Ok(join_base_url(base, "/models"))
            }
        }
        _ => Err(format!("Unsupported provider: {provider}")),
    }
}

fn value_to_u32(value: Option<u64>) -> Option<u32> {
    value.and_then(|v| u32::try_from(v).ok())
}

fn parse_models(provider: &str, payload: &Value) -> Vec<ProviderModel> {
    let items: &[Value] = match payload.get("data") {
        Some(Value::Array(items)) => items.as_slice(),
        _ => match payload {
            Value::Array(items) => items.as_slice(),
            _ => &[],
        },
    };

    items
        .iter()
        .filter_map(|item| {
            let id = item.get("id").and_then(Value::as_str).unwrap_or("").trim();
            if id.is_empty() {
                return None;
            }

            if provider == "openai" && !id.starts_with("gpt") {
                return None;
            }

            let name = item
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or(id)
                .to_string();

            let context_length = value_to_u32(item.get("context_length").and_then(Value::as_u64))
                .or_else(|| value_to_u32(item.get("max_context").and_then(Value::as_u64)));

            Some(ProviderModel {
                id: id.to_string(),
                name,
                provider: provider.to_string(),
                context_length,
            })
        })
        .collect()
}

#[tauri::command]
fn set_provider_api_key(provider: String, api_key: String) -> Result<(), String> {
    let provider = normalize_provider(&provider)?;
    let entry = keyring_entry(provider)?;
    entry
        .set_password(api_key.trim())
        .map_err(|error| format!("Failed to save API key for {provider}: {error}"))
}

#[tauri::command]
fn has_provider_api_key(provider: String) -> Result<bool, String> {
    let provider = normalize_provider(&provider)?;
    let entry = keyring_entry(provider)?;
    match entry.get_password() {
        Ok(value) => Ok(!value.trim().is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(format!(
            "Failed to determine API key presence for {provider}: {error}"
        )),
    }
}

#[tauri::command]
fn remove_provider_api_key(provider: String) -> Result<(), String> {
    let provider = normalize_provider(&provider)?;
    let entry = keyring_entry(provider)?;
    match entry.delete_password() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("Failed to remove API key for {provider}: {error}")),
    }
}

#[tauri::command]
async fn fetch_provider_models(request: FetchModelsRequest) -> Result<Vec<ProviderModel>, String> {
    let provider = normalize_provider(&request.provider)?;
    let api_key = get_required_api_key(provider)?;
    let endpoint = resolve_models_endpoint(
        provider,
        request.base_url.as_deref(),
        request.models_route.as_deref(),
    )?;

    let client = Client::new();
    let mut call = client.get(endpoint).bearer_auth(api_key);

    if provider == "openrouter" {
        call = call
            .header("HTTP-Referer", OPENROUTER_REFERER)
            .header("X-Title", OPENROUTER_TITLE);
    }

    let response = call
        .send()
        .await
        .map_err(|error| format!("Failed to fetch models: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Model fetch failed ({status}): {body}"));
    }

    let payload: Value = response
        .json()
        .await
        .map_err(|error| format!("Failed to parse model response: {error}"))?;

    Ok(parse_models(provider, &payload))
}

#[tauri::command]
async fn generate_chat_completion(request: ChatCompletionRequest) -> Result<String, String> {
    let provider = normalize_provider(&request.provider)?;
    let api_key = get_required_api_key(provider)?;
    let endpoint = resolve_chat_endpoint(provider, request.base_url.as_deref())?;

    let mut payload = json!({
        "model": request.model,
        "messages": request.messages,
        "stream": false
    });

    if let Some(value) = request.temperature {
        payload["temperature"] = json!(value);
    }
    if let Some(value) = request.max_tokens {
        payload["max_tokens"] = json!(value);
    }
    if let Some(value) = request.top_p {
        payload["top_p"] = json!(value);
    }
    if let Some(value) = request.top_k {
        payload["top_k"] = json!(value);
    }
    if let Some(value) = request.repetition_penalty {
        payload["repetition_penalty"] = json!(value);
        payload["frequency_penalty"] = json!(value);
    }
    if let Some(value) = request.min_p {
        payload["min_p"] = json!(value);
    }

    let client = Client::new();
    let mut call = client.post(endpoint).bearer_auth(api_key).json(&payload);

    if provider == "openrouter" {
        call = call
            .header("HTTP-Referer", OPENROUTER_REFERER)
            .header("X-Title", OPENROUTER_TITLE);
    }

    let response = call
        .send()
        .await
        .map_err(|error| format!("Failed to call completion endpoint: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Completion failed ({status}): {body}"));
    }

    let payload: Value = response
        .json()
        .await
        .map_err(|error| format!("Failed to parse completion response: {error}"))?;

    let content = payload
        .pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .or_else(|| payload.pointer("/choices/0/text").and_then(Value::as_str))
        .unwrap_or("")
        .to_string();

    if content.trim().is_empty() {
        return Err(format!("Completion response missing content: {payload}"));
    }

    Ok(content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            set_provider_api_key,
            has_provider_api_key,
            remove_provider_api_key,
            fetch_provider_models,
            generate_chat_completion
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod runtime_checks {
    use super::*;

    fn run_provider_generation_check(
        provider: &str,
        base_url: Option<String>,
        models_route: Option<String>,
    ) {
        let has_key = has_provider_api_key(provider.to_string()).unwrap_or(false);
        if !has_key {
            println!("SKIP {provider}: no secure key configured");
            return;
        }

        let models_result =
            tauri::async_runtime::block_on(fetch_provider_models(FetchModelsRequest {
                provider: provider.to_string(),
                base_url: base_url.clone(),
                models_route: models_route.clone(),
            }));

        let models = match models_result {
            Ok(models) if !models.is_empty() => models,
            Ok(_) => {
                panic!("Provider {provider} returned zero models");
            }
            Err(error) => {
                panic!("Provider {provider} model fetch failed: {error}");
            }
        };

        let model_id = models
            .first()
            .map(|model| model.id.clone())
            .expect("Expected at least one model");

        let completion_result =
            tauri::async_runtime::block_on(generate_chat_completion(ChatCompletionRequest {
                provider: provider.to_string(),
                model: model_id,
                messages: vec![ChatMessage {
                    role: "user".to_string(),
                    content: "Reply with exactly one short word.".to_string(),
                }],
                temperature: Some(0.1),
                max_tokens: Some(16),
                top_p: None,
                top_k: None,
                repetition_penalty: None,
                min_p: None,
                base_url,
            }));

        match completion_result {
            Ok(content) => {
                assert!(
                    !content.trim().is_empty(),
                    "Provider {provider} returned empty completion content"
                );
                println!(
                    "PASS {provider}: completion content length={}",
                    content.len()
                );
            }
            Err(error) => {
                panic!("Provider {provider} completion failed: {error}");
            }
        }
    }

    #[test]
    #[ignore]
    fn provider_runtime_openai() {
        run_provider_generation_check("openai", None, None);
    }

    #[test]
    #[ignore]
    fn provider_runtime_openrouter() {
        run_provider_generation_check("openrouter", None, None);
    }

    #[test]
    #[ignore]
    fn provider_runtime_nanogpt() {
        run_provider_generation_check("nanogpt", None, None);
    }

    #[test]
    #[ignore]
    fn provider_runtime_openai_compatible() {
        let base_url = std::env::var("OPENAI_COMPATIBLE_BASE_URL").ok();
        if base_url.as_deref().map(str::trim).unwrap_or("").is_empty() {
            println!("SKIP openai_compatible: OPENAI_COMPATIBLE_BASE_URL not set");
            return;
        }

        let models_route = std::env::var("OPENAI_COMPATIBLE_MODELS_ROUTE").ok();
        run_provider_generation_check("openai_compatible", base_url, models_route);
    }
}
