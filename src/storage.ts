import { invoke } from "@tauri-apps/api/core";

export const isTauri = "__TAURI_INTERNALS__" in window;

const LOCAL_KEY = "simnote.notes";

export async function loadRaw(): Promise<string> {
  if (isTauri) return invoke<string>("load_notes");
  return localStorage.getItem(LOCAL_KEY) ?? "[]";
}

export async function saveRaw(data: string): Promise<void> {
  if (isTauri) await invoke("save_notes", { data });
  else localStorage.setItem(LOCAL_KEY, data);
}
