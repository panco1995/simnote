import "./style.css";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { fillIcons, ICONS } from "./icons";
import { detectLocale, isLocale, locale, t, useLocale, type Locale } from "./i18n";
import { isTauri, loadLocale, loadRaw, saveLocale, saveRaw } from "./storage";

interface Note {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const VERSION = "0.1.0";
const REPO_URL = "https://github.com/panco1995/simnote";
const isMac = /mac/i.test(navigator.userAgent);

let notes: Note[] = [];
let currentId: string | null = null;
let query = "";
let saveTimer: number | undefined;
let savePending = false;
let saveBlocked = false;
let statusKey = "";

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const listEl = byId<HTMLUListElement>("note-list");
const editorEl = byId<HTMLTextAreaElement>("editor");
const editorWrap = byId("editor-wrap");
const searchEl = byId<HTMLInputElement>("search");
const titleEl = byId("title-text");
const deleteBtn = byId<HTMLButtonElement>("btn-delete");
const menuBar = byId("menu-bar");
const statusCount = byId("status-count");
const statusSave = byId("status-save");
const statusInfo = byId("status-info");

// ---------- helpers ----------

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const pad = (n: number) => String(n).padStart(2, "0");
function fmt(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function titleOf(n: Note) {
  const line = n.content.split("\n").find((l) => l.trim());
  return line ? line.trim().slice(0, 60) : t("note.untitled");
}

function errorText(e: unknown) {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return String(e);
}

function setStatus(key: string) {
  statusKey = key;
  statusSave.textContent = key ? t(key) : "";
}

function refreshMaximizeLabel() {
  const maximized = document.body.classList.contains("maximized");
  byId("btn-max").setAttribute("aria-label", t(maximized ? "window.restore" : "window.maximize"));
}

function applyLocale(code: Locale, refreshContent: boolean) {
  useLocale(code);
  setStatus(statusKey);
  refreshMaximizeLabel();
  if (refreshContent) render();
}

const current = () => notes.find((n) => n.id === currentId) ?? null;

function visibleNotes() {
  const q = query.trim().toLowerCase();
  return notes
    .filter((n) => !q || n.content.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// ---------- rendering ----------

function renderList() {
  const items = visibleNotes();
  listEl.replaceChildren();
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = query ? t("list.noMatch") : t("list.empty");
    listEl.append(li);
    return;
  }
  for (const n of items) {
    const li = document.createElement("li");
    li.dataset.id = n.id;
    li.classList.toggle("selected", n.id === currentId);
    const t = document.createElement("span");
    t.className = "t";
    t.textContent = titleOf(n);
    const d = document.createElement("span");
    d.className = "d";
    d.textContent = fmt(n.updatedAt);
    li.append(t, d);
    listEl.append(li);
  }
  listEl.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
}

function renderEditor() {
  const n = current();
  const content = n?.content ?? "";
  if (editorEl.value !== content) editorEl.value = content;
  editorEl.disabled = !n;
  editorEl.placeholder = n ? "" : t("editor.placeholder");
  editorWrap.classList.toggle("disabled", !n);
  deleteBtn.disabled = !n;
  menuBar.querySelector('[data-action="delete"]')?.classList.toggle("disabled", !n);
  titleEl.textContent = n ? `${titleOf(n)} - SimNote` : "SimNote";
  const count = notes.filter((x) => x.content.trim()).length;
  statusCount.textContent = t(count === 1 ? "status.count.one" : "status.count", { count });
  statusInfo.textContent = n
    ? t("status.info", { count: [...n.content].length, time: fmt(n.updatedAt) })
    : "";
}

function render() {
  renderList();
  renderEditor();
}

// ---------- persistence ----------

function scheduleSave() {
  if (saveBlocked) return;
  savePending = true;
  setStatus("status.saving");
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flush, 500);
}

async function flush() {
  clearTimeout(saveTimer);
  if (!savePending || saveBlocked) return;
  savePending = false;
  try {
    await saveRaw(JSON.stringify(notes.filter((n) => n.content.trim())));
    setStatus("status.saved");
  } catch (e) {
    savePending = true;
    setStatus("status.saveFailed");
    const message = isTauri ? errorText(e) : t("error.save", { detail: errorText(e) });
    await showDialog({ title: "SimNote", message, icon: "warn", buttons: [t("dialog.ok")] });
  }
}

// ---------- actions ----------

function select(id: string | null) {
  // Abandoned empty notes are dropped when the user moves away from them.
  notes = notes.filter((n) => n.id === id || n.content.trim());
  currentId = id;
  render();
}

function newNote() {
  const cur = current();
  if (cur && !cur.content.trim()) {
    editorEl.focus();
    return;
  }
  const now = Date.now();
  const note: Note = { id: uid(), content: "", createdAt: now, updatedAt: now };
  notes.push(note);
  if (query) {
    query = "";
    searchEl.value = "";
  }
  select(note.id);
  editorEl.focus();
}

async function deleteNote() {
  const n = current();
  if (!n) return;
  if (n.content.trim()) {
    const choice = await showDialog({
      title: t("dialog.delete.title"),
      message: t("dialog.delete.message", { title: titleOf(n) }),
      icon: "warn",
      buttons: [t("dialog.yes"), t("dialog.no")],
    });
    if (choice !== 0) return;
  }
  const vis = visibleNotes();
  const idx = vis.findIndex((x) => x.id === n.id);
  const next = vis[idx + 1] ?? vis[idx - 1] ?? null;
  notes = notes.filter((x) => x.id !== n.id);
  select(next?.id ?? null);
  scheduleSave();
  listEl.focus();
}

function moveSelection(delta: number) {
  const vis = visibleNotes();
  if (!vis.length) return;
  const idx = vis.findIndex((n) => n.id === currentId);
  const next = vis[Math.min(vis.length - 1, Math.max(0, idx + delta))];
  if (next.id !== currentId) select(next.id);
}

function about() {
  return showDialog({
    title: t("dialog.about.title"),
    message: t("dialog.about.message", { version: VERSION }),
    badge: t("dialog.about.badge"),
    link: REPO_URL,
    icon: "info",
    buttons: [t("dialog.ok")],
  });
}

async function chooseLocale(code: string) {
  if (!isLocale(code) || code === locale()) return;
  try {
    await saveLocale(code);
  } catch (e) {
    const message = isTauri ? errorText(e) : t("error.settings", { detail: errorText(e) });
    await showDialog({ title: "SimNote", message, icon: "warn", buttons: [t("dialog.ok")] });
    return;
  }
  applyLocale(code, true);
}

function openLink(url: string) {
  if (isTauri) openUrl(url);
  else window.open(url, "_blank", "noopener");
}

async function closeWindow() {
  await flush();
  if (isTauri) await getCurrentWindow().close();
}

const actions: Record<string, () => unknown> = {
  new: newNote,
  delete: deleteNote,
  exit: closeWindow,
  about,
};

// ---------- dialog ----------

interface DialogOptions {
  title: string;
  message: string;
  badge?: string;
  link?: string;
  icon: "warn" | "info";
  buttons: string[];
}

function showDialog(opts: DialogOptions): Promise<number> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `
      <div class="window dialog" role="dialog">
        <div class="title-bar">
          <span class="title-bar-text"></span>
          <div class="title-bar-controls"><button class="btn-close">${ICONS.close}</button></div>
        </div>
        <div class="dialog-body">
          <div class="dialog-icon">${ICONS[opts.icon]}</div>
          <div class="dialog-content"><div class="dialog-msg"></div></div>
        </div>
        <div class="dialog-buttons"></div>
      </div>`;
    overlay.querySelector(".title-bar-text")!.textContent = opts.title;
    overlay.querySelector(".dialog-msg")!.textContent = opts.message;

    const content = overlay.querySelector(".dialog-content")!;
    if (opts.badge) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = opts.badge;
      content.prepend(badge);
    }
    if (opts.link) {
      const url = opts.link;
      const a = document.createElement("a");
      a.className = "link";
      a.href = url;
      a.textContent = url;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openLink(url);
      });
      content.append(a);
    }

    const cancelIndex = opts.buttons.length - 1;
    const done = (i: number) => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      resolve(i);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        done(cancelIndex);
      }
    };

    const box = overlay.querySelector(".dialog-buttons")!;
    opts.buttons.forEach((label, i) => {
      const b = document.createElement("button");
      b.className = i === 0 ? "btn default" : "btn";
      const span = document.createElement("span");
      span.textContent = label;
      b.append(span);
      b.addEventListener("click", () => done(i));
      box.append(b);
    });
    const closeBtn = overlay.querySelector<HTMLButtonElement>(".btn-close")!;
    closeBtn.setAttribute("aria-label", t("window.close"));
    closeBtn.addEventListener("click", () => done(cancelIndex));

    document.addEventListener("keydown", onKey, true);
    document.body.append(overlay);
    box.querySelector("button")!.focus();
  });
}

// ---------- menus ----------

let menuOpen = false;

function closeMenus() {
  menuBar.querySelectorAll(".menu-item.open").forEach((m) => m.classList.remove("open"));
  menuOpen = false;
}

function openMenu(item: Element) {
  closeMenus();
  item.classList.add("open");
  menuOpen = true;
}

function setupMenus() {
  menuBar.querySelectorAll<HTMLElement>("[data-accel]").forEach((el) => {
    el.textContent = (isMac ? "⌘" : "Ctrl+") + el.dataset.accel;
  });
  menuBar.querySelectorAll(".menu-item").forEach((item) => {
    item.querySelector(".menu-label")!.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (item.classList.contains("open")) closeMenus();
      else openMenu(item);
    });
    item.addEventListener("mouseenter", () => {
      if (menuOpen && !item.classList.contains("open")) openMenu(item);
    });
  });
  menuBar.addEventListener("mousedown", (e) => e.preventDefault());
  menuBar.addEventListener("click", (e) => {
    const opt = (e.target as HTMLElement).closest<HTMLElement>(".menu-option");
    if (!opt || opt.classList.contains("disabled") || opt.classList.contains("has-sub")) return;
    closeMenus();
    if (opt.dataset.locale) {
      void chooseLocale(opt.dataset.locale);
      return;
    }
    actions[opt.dataset.action!]?.();
  });
  document.addEventListener("mousedown", (e) => {
    if (!menuBar.contains(e.target as Node)) closeMenus();
  });
}

// ---------- window chrome ----------

async function setupWindow() {
  window.addEventListener("focus", () => document.body.classList.remove("inactive"));
  window.addEventListener("blur", () => {
    document.body.classList.add("inactive");
    closeMenus();
    flush();
  });
  if (!isTauri) return;

  const win = getCurrentWindow();
  const maxBtn = byId("btn-max");
  byId("btn-min").addEventListener("click", () => win.minimize());
  maxBtn.addEventListener("click", () => win.toggleMaximize());
  byId("btn-close").addEventListener("click", closeWindow);
  byId("grip").addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      e.preventDefault();
      win.startResizeDragging("SouthEast");
    }
  });

  const syncMaximized = async () => {
    const maximized = await win.isMaximized();
    document.body.classList.toggle("maximized", maximized);
    maxBtn.innerHTML = maximized ? ICONS.restore : ICONS.max;
    refreshMaximizeLabel();
  };
  await win.onResized(syncMaximized);
  await syncMaximized();
}

// ---------- events ----------

function setupEvents() {
  byId("btn-new").addEventListener("click", newNote);
  deleteBtn.addEventListener("click", deleteNote);

  editorEl.addEventListener("input", () => {
    const n = current();
    if (!n) return;
    n.content = editorEl.value;
    n.updatedAt = Date.now();
    render();
    scheduleSave();
  });

  searchEl.addEventListener("input", () => {
    query = searchEl.value;
    renderList();
  });

  listEl.addEventListener("mousedown", (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>("li[data-id]");
    if (li) select(li.dataset.id!);
  });
  listEl.addEventListener("dblclick", () => editorEl.focus());
  listEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") moveSelection(1);
    else if (e.key === "ArrowUp") moveSelection(-1);
    else if (e.key === "Enter") editorEl.focus();
    else if (e.key === "Delete" || e.key === "Backspace") deleteNote();
    else return;
    e.preventDefault();
  });

  document.addEventListener("keydown", (e) => {
    if (document.querySelector(".overlay")) return;
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === "n") {
      e.preventDefault();
      newNote();
    } else if (mod && key === "f") {
      e.preventDefault();
      searchEl.focus();
      searchEl.select();
    } else if (mod && key === "s") {
      e.preventDefault();
      flush();
    } else if (e.key === "Escape") {
      closeMenus();
    }
  });

  document.addEventListener("contextmenu", (e) => {
    if (!(e.target as HTMLElement).closest("textarea, input")) e.preventDefault();
  });
}

// ---------- boot ----------

async function init() {
  fillIcons();
  let saved = "";
  try {
    saved = await loadLocale();
  } catch {
    saved = "";
  }
  const initial = isLocale(saved) ? saved : detectLocale();
  if (saved !== initial) {
    try {
      await saveLocale(initial);
    } catch {
      // The UI still follows the detected language if the setting cannot be stored yet.
    }
  }
  applyLocale(initial, false);
  setupMenus();
  setupEvents();
  await setupWindow();

  try {
    const raw = await loadRaw();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("format");
    }
    if (!Array.isArray(data)) throw new Error("format");
    notes = data;
    setStatus("status.ready");
  } catch (e) {
    // Never overwrite a data file we failed to read.
    saveBlocked = true;
    setStatus("status.loadFailed");
    const message =
      errorText(e) === "format" ? t("error.format") : isTauri ? errorText(e) : t("error.load", { detail: errorText(e) });
    await showDialog({ title: "SimNote", message, icon: "warn", buttons: [t("dialog.ok")] });
  }

  select(visibleNotes()[0]?.id ?? null);
}

init();
