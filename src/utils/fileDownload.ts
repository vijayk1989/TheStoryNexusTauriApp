import { invoke, isTauri } from "@tauri-apps/api/core";

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

function sanitizeExportFilename(filename: string): string {
    const cleaned = filename
        .trim()
        .replace(INVALID_FILENAME_CHARS, "_")
        .replace(/[. ]+$/g, "");

    return cleaned.length > 0 ? cleaned : "export.txt";
}

function downloadInBrowser(content: string, filename: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);

    const linkElement = document.createElement("a");
    linkElement.href = url;
    linkElement.download = filename;
    linkElement.style.display = "none";

    document.body.appendChild(linkElement);
    linkElement.click();
    linkElement.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 0);
}

export async function saveTextAsFile(content: string, filename: string, contentType: string): Promise<boolean> {
    const safeFilename = sanitizeExportFilename(filename);

    if (isTauri()) {
        const savedPath = await invoke<string | null>("save_export_file", {
            filename: safeFilename,
            content,
        });
        return Boolean(savedPath);
    }

    downloadInBrowser(content, safeFilename, contentType);
    return true;
}
