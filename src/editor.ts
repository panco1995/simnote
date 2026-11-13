import { Editor, Extension } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { EditorState } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";

export const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Tahoma", value: "Tahoma, Verdana, sans-serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "宋体", value: 'SimSun, "Songti SC", STSong, serif' },
  { label: "黑体", value: 'SimHei, "Heiti SC", "PingFang SC", sans-serif' },
  { label: "楷体", value: 'KaiTi, "Kaiti SC", STKaiti, serif' },
  { label: "新細明體", value: 'PMingLiU, "LiSong Pro", "PingFang TC", serif' },
  { label: "MS 明朝", value: '"MS Mincho", "Hiragino Mincho ProN", serif' },
  { label: "MS ゴシック", value: '"MS Gothic", "Hiragino Sans", sans-serif' },
];

/** Matches the editor's base font size in style.css, so an unset size shows as this value. */
export const DEFAULT_FONT_SIZE = "10pt";
export const FONT_SIZES = ["8", "9", "10", "10.5", "11", "12", "14", "16", "18", "20", "22", "24", "28", "36", "48", "72"].map(
  (n) => `${n}pt`,
);
export const LINE_HEIGHTS = ["1", "1.15", "1.5", "2", "2.5", "3"];
export const PALETTE = [
  "#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080",
  "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff",
];

export type BlockStyle = "p" | "h1" | "h2" | "h3" | "quote" | "code";

const BLOCK_TYPES = ["paragraph", "heading"];
const MAX_INDENT = 8;
const INDENT_PX = 24;
const LINK_PROTOCOLS = /^(https?:|mailto:)/i;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockFormat: {
      setBlockLineHeight: (value: string | null) => ReturnType;
      shiftIndent: (delta: number) => ReturnType;
      resetBlockFormat: () => ReturnType;
    };
  }
}

const BlockFormat = Extension.create({
  name: "blockFormat",
  // Lower than list items so Tab nests list items before falling back to paragraph indent.
  priority: 50,

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_TYPES,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) => (attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}),
          },
          indent: {
            default: 0,
            parseHTML: (el) => {
              const level = Number.parseInt(el.dataset.indent ?? "", 10);
              return Number.isFinite(level) ? Math.min(MAX_INDENT, Math.max(0, level)) : 0;
            },
            renderHTML: (attrs) =>
              attrs.indent ? { "data-indent": attrs.indent, style: `margin-left: ${attrs.indent * INDENT_PX}px` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const eachBlock =
      (apply: (attrs: Record<string, unknown>) => Record<string, unknown> | null) =>
      ({ state, tr, dispatch }: { state: EditorState; tr: EditorState["tr"]; dispatch?: unknown }) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!BLOCK_TYPES.includes(node.type.name)) return true;
          const next = apply(node.attrs);
          if (next) {
            changed = true;
            if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...next });
          }
          return false;
        });
        return changed;
      };

    return {
      setBlockLineHeight: (value) =>
        eachBlock((attrs) => (attrs.lineHeight === value ? null : { lineHeight: value })),
      shiftIndent: (delta) =>
        eachBlock((attrs) => {
          const level = Math.min(MAX_INDENT, Math.max(0, Number(attrs.indent ?? 0) + delta));
          return level === attrs.indent ? null : { indent: level };
        }),
      resetBlockFormat: () =>
        eachBlock((attrs) => (attrs.indent || attrs.lineHeight ? { indent: 0, lineHeight: null } : null)),
    };
  },

  addKeyboardShortcuts() {
    const tab = (delta: number) => () => {
      const editor = this.editor;
      if (editor.isActive("codeBlock")) return delta > 0 ? editor.commands.insertContent("\t") : true;
      if (editor.isActive("listItem") || editor.isActive("taskItem")) return true;
      editor.commands.shiftIndent(delta);
      return true;
    };
    return {
      Tab: tab(1),
      "Shift-Tab": tab(-1),
      "Mod-\\": () => this.editor.commands.unsetAllMarks(),
    };
  },
});

export function plainToHtml(text: string) {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split("\n")
    .map((line) => `<p>${escape(line)}</p>`)
    .join("");
}

const normalizeFamily = (value: string) => value.replace(/["']/g, "").replace(/\s*,\s*/g, ",").trim().toLowerCase();

export function normalizeUrl(input: string) {
  const url = input.trim();
  if (!url) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return LINK_PROTOCOLS.test(url) ? url : "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

export function isOpenableUrl(url: string) {
  return LINK_PROTOCOLS.test(url);
}

interface Hooks {
  placeholder: () => string;
  onChange: () => void;
  onState: () => void;
  onOpenLink: (href: string) => void;
}

type Chain = ReturnType<Editor["chain"]>;

interface Command {
  run: (chain: Chain, value?: string) => Chain;
  active?: (editor: Editor, value?: string) => boolean;
  can?: (editor: Editor) => boolean;
}

const inList = (editor: Editor) => (editor.isActive("taskItem") ? "taskItem" : editor.isActive("listItem") ? "listItem" : null);

const mark = (name: string, toggle: (chain: Chain) => Chain): Command => ({
  run: toggle,
  active: (editor) => editor.isActive(name),
});

const COMMANDS: Record<string, Command> = {
  undo: { run: (c) => c.undo(), can: (e) => e.can().undo() },
  redo: { run: (c) => c.redo(), can: (e) => e.can().redo() },
  selectAll: { run: (c) => c.selectAll() },
  bold: mark("bold", (c) => c.toggleBold()),
  italic: mark("italic", (c) => c.toggleItalic()),
  underline: mark("underline", (c) => c.toggleUnderline()),
  strike: mark("strike", (c) => c.toggleStrike()),
  code: mark("code", (c) => c.toggleCode()),
  superscript: mark("superscript", (c) => c.unsetSubscript().toggleSuperscript()),
  subscript: mark("subscript", (c) => c.unsetSuperscript().toggleSubscript()),
  textColor: { run: (c, color) => (color ? c.setColor(color) : c.unsetColor()) },
  highlight: { run: (c, color) => (color ? c.setHighlight({ color }) : c.unsetHighlight()) },
  fontFamily: { run: (c, family) => (family ? c.setFontFamily(family) : c.unsetFontFamily()) },
  fontSize: { run: (c, size) => (size && size !== DEFAULT_FONT_SIZE ? c.setFontSize(size) : c.unsetFontSize()) },
  align: {
    run: (c, align) => c.setTextAlign(align ?? "left"),
    active: (e, align) => (align === "left" ? !["center", "right", "justify"].some((a) => e.isActive({ textAlign: a })) : e.isActive({ textAlign: align })),
  },
  bulletList: mark("bulletList", (c) => c.toggleBulletList()),
  orderedList: mark("orderedList", (c) => c.toggleOrderedList()),
  taskList: mark("taskList", (c) => c.toggleTaskList()),
  indent: {
    run: (c) => c.command(({ editor, commands }) => {
      const item = inList(editor);
      return item ? commands.sinkListItem(item) : commands.shiftIndent(1);
    }),
  },
  outdent: {
    run: (c) => c.command(({ editor, commands }) => {
      const item = inList(editor);
      return item ? commands.liftListItem(item) : commands.shiftIndent(-1);
    }),
  },
  lineHeight: {
    run: (c, value) => c.setBlockLineHeight(value && value !== "1.5" ? value : null),
    active: (e, value) => (blockAttr(e, "lineHeight") ?? "1.5") === value,
  },
  hr: { run: (c) => c.setHorizontalRule() },
  unlink: { run: (c) => c.extendMarkRange("link").unsetLink(), active: (e) => e.isActive("link") },
  clear: { run: (c) => c.unsetAllMarks().clearNodes().unsetTextAlign().resetBlockFormat() },
  blockStyle: {
    run: (c, style) => {
      const unquote = (chain: Chain) => chain.command(({ editor, commands }) => (editor.isActive("blockquote") ? commands.lift("blockquote") : true));
      switch (style as BlockStyle) {
        case "h1":
        case "h2":
        case "h3":
          return c.setHeading({ level: Number(style!.slice(1)) as 1 | 2 | 3 });
        case "quote":
          return c.setParagraph().command(({ editor, commands }) => (editor.isActive("blockquote") ? true : commands.wrapIn("blockquote")));
        case "code":
          return c.setCodeBlock();
        default:
          return unquote(c.setParagraph());
      }
    },
  },
};

function blockAttr(editor: Editor, name: string): string | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (BLOCK_TYPES.includes(node.type.name)) return node.attrs[name] ?? null;
  }
  return null;
}

export class RichEditor {
  readonly editor: Editor;
  private readonly hooks: Hooks;

  constructor(mount: HTMLElement, hooks: Hooks) {
    this.hooks = hooks;
    this.editor = new Editor({
      element: mount,
      editable: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: {
            openOnClick: false,
            autolink: true,
            linkOnPaste: true,
            defaultProtocol: "https",
            protocols: ["mailto"],
            isAllowedUri: (url) => isOpenableUrl(url),
            HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
          },
        }),
        TextStyle,
        Color,
        FontFamily,
        FontSize,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: BLOCK_TYPES }),
        Superscript,
        Subscript,
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder: () => hooks.placeholder(), showOnlyWhenEditable: false }),
        BlockFormat,
      ],
      editorProps: { attributes: { spellcheck: "false" } },
      onUpdate: () => hooks.onChange(),
      onTransaction: () => hooks.onState(),
    });

    this.editor.view.dom.addEventListener("click", (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      const href = anchor?.getAttribute("href") ?? "";
      if (!isOpenableUrl(href)) return;
      e.preventDefault();
      hooks.onOpenLink(href);
    });
  }

  get editable() {
    return this.editor.isEditable;
  }

  /** Replaces the document and starts a fresh undo history so undo never crosses notes. */
  load(html: string, editable: boolean) {
    const editor = this.editor;
    editor.setEditable(editable, false);
    editor.commands.setContent(html, { emitUpdate: false });
    editor.view.updateState(EditorState.create({ doc: editor.state.doc, plugins: editor.state.plugins }));
    this.hooks.onState();
  }

  html() {
    return this.editor.getHTML();
  }

  text() {
    return this.editor.getText({ blockSeparator: "\n" });
  }

  focus() {
    if (this.editable) this.editor.commands.focus();
  }

  /** Re-renders placeholder text after a language change. */
  refresh() {
    this.editor.view.dispatch(this.editor.state.tr.setMeta("addToHistory", false));
  }

  run(name: string, value?: string) {
    const command = COMMANDS[name];
    if (!command || !this.editable) return;
    command.run(this.editor.chain().focus(), value).run();
  }

  has(name: string) {
    return name in COMMANDS;
  }

  can(name: string) {
    const command = COMMANDS[name];
    return this.editable && (!command?.can || command.can(this.editor));
  }

  isActive(name: string, value?: string) {
    const command = COMMANDS[name];
    return this.editable && Boolean(command?.active?.(this.editor, value));
  }

  blockStyle(): BlockStyle {
    const e = this.editor;
    if (e.isActive("codeBlock")) return "code";
    for (const level of [1, 2, 3] as const) if (e.isActive("heading", { level })) return `h${level}`;
    if (e.isActive("blockquote")) return "quote";
    return "p";
  }

  fontFamily(): { value: string; label: string } {
    const raw: string = this.editor.getAttributes("textStyle").fontFamily ?? "";
    if (!raw) return { value: "", label: "" };
    const match = FONT_FAMILIES.find((f) => normalizeFamily(f.value) === normalizeFamily(raw));
    return match ?? { value: raw, label: raw.split(",")[0].replace(/["']/g, "").trim() };
  }

  fontSize(): string {
    return this.editor.getAttributes("textStyle").fontSize || DEFAULT_FONT_SIZE;
  }

  linkHref(): string {
    return this.editor.getAttributes("link").href ?? "";
  }

  setLink(input: string) {
    const href = normalizeUrl(input);
    const chain = this.editor.chain().focus();
    if (!href) {
      chain.extendMarkRange("link").unsetLink().run();
      return;
    }
    const { empty } = this.editor.state.selection;
    if (empty && !this.editor.isActive("link")) {
      chain.insertContent({ type: "text", text: input.trim(), marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.extendMarkRange("link").setLink({ href }).run();
    }
  }
}
