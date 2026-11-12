import en from "../locales/en.json";
import ja from "../locales/ja.json";
import zhCN from "../locales/zh-CN.json";
import zhTW from "../locales/zh-TW.json";

export const LOCALES = ["en", "zh-CN", "zh-TW", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

const catalogs: Record<Locale, Record<string, string>> = {
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ja,
};

let current: Locale = "en";

export function locale(): Locale {
  return current;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function detectLocale(): Locale {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh")) {
    if (lang.includes("tw") || lang.includes("hk") || lang.includes("mo") || lang.includes("hant")) return "zh-TW";
    return "zh-CN";
  }
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

function textOf(key: string): string | undefined {
  return catalogs[current][key] ?? catalogs.en[key];
}

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const template = textOf(key) ?? key;
  return template.replace(/\{(\w+)\}/g, (token, name: string) => (name in vars ? String(vars[name]) : token));
}

function withMnemonic(text: string, mnemonic: string): Node {
  const index = mnemonic ? text.toLowerCase().indexOf(mnemonic.toLowerCase()) : -1;
  if (!mnemonic || index < 0) return document.createTextNode(text);
  const fragment = document.createDocumentFragment();
  const mark = document.createElement("u");
  mark.textContent = text.slice(index, index + mnemonic.length);
  fragment.append(text.slice(0, index), mark, text.slice(index + mnemonic.length));
  return fragment;
}

export function useLocale(next: Locale) {
  current = next;
  document.documentElement.lang = next;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const mnemonicKey = el.dataset.i18nMnemonic;
    const mnemonic = mnemonicKey ? (textOf(mnemonicKey) ?? "") : "";
    el.replaceChildren(withMnemonic(t(el.dataset.i18n!), mnemonic));
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle!);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria!));
  });
  document.querySelectorAll<HTMLElement>("[data-locale]").forEach((el) => {
    el.classList.toggle("checked", el.dataset.locale === next);
  });
}
