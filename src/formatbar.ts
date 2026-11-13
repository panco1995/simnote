import { FONT_FAMILIES, FONT_SIZES, PALETTE, type RichEditor } from "./editor";
import { t } from "./i18n";

type PaletteKind = "textColor" | "highlight";

interface Hooks {
  editLink: () => void;
}

const lastColor: Record<PaletteKind, string> = { textColor: "#ff0000", highlight: "#ffff00" };

export function setupFormatBar(rich: RichEditor, hooks: Hooks) {
  const bar = document.getElementById("format-bar")!;
  const styleSel = document.getElementById("fmt-style") as HTMLSelectElement;
  const fontSel = document.getElementById("fmt-font") as HTMLSelectElement;
  const sizeSel = document.getElementById("fmt-size") as HTMLSelectElement;
  let palette: HTMLElement | null = null;

  const option = (value: string, label: string) => {
    const el = document.createElement("option");
    el.value = value;
    el.textContent = label;
    return el;
  };
  const extraFont = option("", "");
  const extraSize = option("", "");
  extraFont.hidden = extraSize.hidden = true;
  fontSel.append(...FONT_FAMILIES.map((f) => option(f.value, f.label)), extraFont);
  sizeSel.append(...FONT_SIZES.map((s) => option(s, s.replace(/pt$/, ""))), extraSize);

  function run(cmd: string, value?: string) {
    if (cmd === "link") {
      if (rich.editable) hooks.editLink();
      return;
    }
    if ((cmd === "textColor" || cmd === "highlight") && value === undefined) value = lastColor[cmd];
    rich.run(cmd, value);
  }

  function pickColor(kind: PaletteKind, color: string) {
    closePalette();
    if (color) {
      lastColor[kind] = color;
      bar.querySelector<HTMLElement>(`[data-cmd="${kind}"] .swatch-bar`)!.style.background = color;
    }
    rich.run(kind, color);
  }

  function closePalette() {
    palette?.remove();
    palette = null;
  }

  function openPalette(kind: PaletteKind, anchor: HTMLElement) {
    closePalette();
    const box = document.createElement("div");
    box.className = "palette";
    const reset = document.createElement("button");
    reset.className = "btn palette-reset";
    reset.textContent = t(kind === "textColor" ? "fmt.automatic" : "fmt.noColor");
    reset.addEventListener("click", () => pickColor(kind, ""));
    const grid = document.createElement("div");
    grid.className = "palette-grid";
    for (const color of PALETTE) {
      const swatch = document.createElement("button");
      swatch.className = "swatch";
      swatch.title = color;
      swatch.style.setProperty("--swatch", color);
      swatch.addEventListener("click", () => pickColor(kind, color));
      grid.append(swatch);
    }
    const more = document.createElement("label");
    more.className = "btn palette-more";
    const input = document.createElement("input");
    input.type = "color";
    input.value = lastColor[kind];
    input.addEventListener("change", () => pickColor(kind, input.value));
    more.append(document.createTextNode(t("fmt.moreColors")), input);
    box.append(reset, grid, more);
    box.addEventListener("mousedown", (e) => {
      if (!(e.target as HTMLElement).closest("label, input")) e.preventDefault();
    });
    const rect = anchor.closest(".split")!.getBoundingClientRect();
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.bottom + 1}px`;
    document.body.append(box);
    palette = box;
  }

  bar.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).closest("button")) e.preventDefault();
  });
  bar.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const arrow = target.closest<HTMLButtonElement>("[data-palette]");
    if (arrow && !arrow.disabled) {
      const kind = arrow.dataset.palette as PaletteKind;
      if (palette?.dataset.kind === kind) closePalette();
      else {
        openPalette(kind, arrow);
        palette!.dataset.kind = kind;
      }
      return;
    }
    const btn = target.closest<HTMLButtonElement>("button[data-cmd]");
    if (!btn || btn.disabled) return;
    closePalette();
    run(btn.dataset.cmd!, btn.dataset.value);
  });

  styleSel.addEventListener("change", () => rich.run("blockStyle", styleSel.value));
  fontSel.addEventListener("change", () => rich.run("fontFamily", fontSel.value));
  sizeSel.addEventListener("change", () => rich.run("fontSize", sizeSel.value));

  document.addEventListener("mousedown", (e) => {
    if (palette && !palette.contains(e.target as Node) && !(e.target as HTMLElement).closest("[data-palette]")) closePalette();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && palette) {
      closePalette();
      rich.focus();
    }
  });
  window.addEventListener("blur", closePalette);
  window.addEventListener("resize", closePalette);

  function syncSelect(select: HTMLSelectElement, extra: HTMLOptionElement, value: string, label: string) {
    const known = [...select.options].some((o) => o !== extra && o.value === value);
    extra.hidden = known;
    if (!known) {
      extra.value = value;
      extra.textContent = label;
    }
    select.value = value;
  }

  function sync() {
    const editable = rich.editable;
    document.querySelectorAll<HTMLElement>("[data-cmd]").forEach((el) => {
      const cmd = el.dataset.cmd!;
      const enabled = cmd === "link" ? editable : rich.can(cmd);
      const active = cmd === "link" ? editable && rich.isActive("unlink") : rich.isActive(cmd, el.dataset.value);
      if (el instanceof HTMLButtonElement) {
        el.disabled = !enabled;
        el.classList.toggle("active", active);
      } else {
        el.classList.toggle("disabled", !enabled);
        el.classList.toggle("checked", active);
      }
    });
    bar.querySelectorAll<HTMLButtonElement>("[data-palette]").forEach((b) => (b.disabled = !editable));
    for (const sel of [styleSel, fontSel, sizeSel]) sel.disabled = !editable;
    if (!editable) closePalette();

    styleSel.value = rich.blockStyle();
    const font = rich.fontFamily();
    syncSelect(fontSel, extraFont, font.value, font.label);
    const size = rich.fontSize();
    syncSelect(sizeSel, extraSize, size, size.replace(/pt$/, ""));
  }

  return { run, sync, closePalette };
}
