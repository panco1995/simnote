import { invoke } from "@tauri-apps/api/core";

export const isTauri = "__TAURI_INTERNALS__" in window;

const LOCAL_KEY = "simnote.notes";
const LOCALE_KEY = "simnote.locale";

export async function loadLocale(): Promise<string> {
  if (isTauri) return invoke<string>("get_locale");
  return localStorage.getItem(LOCALE_KEY) ?? "";
}

export async function saveLocale(locale: string): Promise<void> {
  if (isTauri) await invoke("set_locale", { locale });
  else localStorage.setItem(LOCALE_KEY, locale);
}

export async function loadRaw(): Promise<string> {
  if (isTauri) return invoke<string>("load_notes");
  return localStorage.getItem(LOCAL_KEY) ?? "[]";
}

export async function saveRaw(data: string): Promise<void> {
  if (isTauri) await invoke("save_notes", { data });
  else localStorage.setItem(LOCAL_KEY, data);
}
