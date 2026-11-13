const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" fill="currentColor">${body}</svg>`;

const px = (...rects: number[][]) => rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join("");
const icon = (d: string, extra = "") => svg(16, 16, `<path d="${d}"/>${extra}`);
const mirrored = (d: string) => svg(16, 16, `<path transform="matrix(-1 0 0 1 16 0)" d="${d}"/>`);

const UNDO = px([2, 5, 1, 1], [3, 4, 1, 3], [4, 3, 1, 5], [5, 2, 1, 7], [6, 4, 5, 2], [11, 5, 2, 2], [12, 7, 2, 3], [11, 10, 2, 2], [8, 11, 3, 2]);
const lines = (rows: number[][]) => px(...rows.map(([x, y, w]) => [x, y, w, 1]));

export const ICONS: Record<string, string> = {
  min: svg(8, 7, `<path d="M0 5h6v2H0z"/>`),
  max: svg(9, 9, `<path fill-rule="evenodd" d="M0 0h9v9H0zM1 2v6h7V2z"/>`),
  restore: svg(8, 9, `<path d="M2 0h6v6H7V2H3v1H2z"/><path fill-rule="evenodd" d="M0 3h6v6H0zM1 5v3h4V5z"/>`),
  close: svg(
    8,
    7,
    `<path d="M0 0h2v1H0zM6 0h2v1H6zM1 1h2v1H1zM5 1h2v1H5zM2 2h4v1H2zM3 3h2v1H3zM2 4h4v1H2zM1 5h2v1H1zM5 5h2v1H5zM0 6h2v1H0zM6 6h2v1H6z"/>`,
  ),
  newNote: svg(
    16,
    16,
    `<path fill="#000" d="M2 0h9l4 4v12H2z"/><path fill="#fff" d="M3 1h7v4h4v10H3z"/><path fill="#808080" d="M11 1l3 3h-3z"/>` +
      `<path fill="#0a246a" d="M5 7h7v1H5zM5 9h7v1H5zM5 11h5v1H5z"/>`,
  ),
  deleteNote: svg(
    16,
    16,
    `<path fill="#c00" d="M2 3h3l3 3 3-3h3v1l-4 4 4 4v1h-3l-3-3-3 3H2v-1l4-4-4-4z"/>`,
  ),
  warn: svg(
    32,
    32,
    `<path fill="#000" d="M15 1h2l15 28v2H0v-2z"/><path fill="#ff0" d="M16 3l14 26H2z"/>` +
      `<path fill="#000" d="M15 10h3v11h-3zM15 23h3v3h-3z"/>`,
  ),
  info: svg(
    32,
    32,
    `<circle cx="16" cy="16" r="15" fill="#000" shape-rendering="auto"/><circle cx="16" cy="16" r="14" fill="#fff" shape-rendering="auto"/>` +
      `<path fill="#00f" d="M14 7h4v4h-4zM12 13h6v11h2v2h-8v-2h2v-9h-2z"/>`,
  ),
  undo: icon(UNDO),
  redo: mirrored(UNDO),
  textColor: icon(px([7, 1, 2, 2], [6, 3, 4, 2], [5, 5, 2, 2], [9, 5, 2, 2], [4, 7, 8, 2], [3, 9, 2, 2], [11, 9, 2, 2])),
  highlight: icon(
    "M9 1l5 5-6 6-5-5z",
    `<path fill="#fff" d="M9 3l3 3-4 4-3-3z"/><path d="M3 8l4 4-2 1H2v-3z"/>`,
  ),
  alignLeft: icon(lines([[2, 3, 12], [2, 6, 8], [2, 9, 12], [2, 12, 8]])),
  alignCenter: icon(lines([[2, 3, 12], [4, 6, 8], [2, 9, 12], [4, 12, 8]])),
  alignRight: icon(lines([[2, 3, 12], [6, 6, 8], [2, 9, 12], [6, 12, 8]])),
  alignJustify: icon(lines([[2, 3, 12], [2, 6, 12], [2, 9, 12], [2, 12, 12]])),
  bulletList: icon(px([2, 3, 2, 2], [2, 7, 2, 2], [2, 11, 2, 2]) + lines([[6, 4, 8], [6, 8, 8], [6, 12, 8]])),
  orderedList: icon(
    px([3, 1, 1, 5], [2, 2, 1, 1]) +
      px([1, 6, 3, 1], [3, 7, 1, 1], [1, 8, 3, 1], [1, 9, 1, 1], [1, 10, 3, 1]) +
      px([1, 11, 3, 1], [3, 12, 1, 1], [2, 13, 2, 1], [3, 14, 1, 1], [1, 15, 3, 1]) +
      lines([[6, 3, 9], [6, 8, 9], [6, 13, 9]]),
  ),
  taskList: icon(
    px([1, 2, 5, 1], [1, 6, 5, 1], [1, 3, 1, 3], [5, 3, 1, 3], [2, 4, 1, 1], [3, 5, 1, 1], [4, 4, 1, 1], [5, 3, 1, 1], [6, 2, 1, 1]) +
      px([1, 9, 5, 1], [1, 13, 5, 1], [1, 10, 1, 3], [5, 10, 1, 3]) +
      lines([[8, 4, 7], [8, 11, 7]]),
  ),
  outdent: icon(lines([[1, 1, 14], [7, 5, 8], [7, 8, 8], [7, 11, 8], [1, 14, 14]]) + px([1, 7, 1, 2], [2, 6, 1, 4], [3, 5, 1, 6], [4, 7, 2, 2])),
  indent: icon(lines([[1, 1, 14], [7, 5, 8], [7, 8, 8], [7, 11, 8], [1, 14, 14]]) + px([5, 7, 1, 2], [4, 6, 1, 4], [3, 5, 1, 6], [1, 7, 2, 2])),
  link: icon(px([2, 5, 5, 1], [2, 10, 5, 1], [1, 6, 1, 4], [9, 5, 5, 1], [9, 10, 5, 1], [14, 6, 1, 4], [5, 7, 6, 2])),
  hr: icon(px([1, 7, 14, 1]), `<path fill="#808080" d="${px([1, 8, 14, 1], [3, 3, 10, 1], [3, 12, 10, 1])}"/>`),
  clearFormat: icon(
    px([2, 2, 9, 2], [5, 4, 3, 8]),
    `<path fill="#c00" d="${px([8, 8, 2, 2], [9, 9, 2, 2], [10, 10, 2, 2], [11, 11, 2, 2], [12, 12, 2, 2], [13, 13, 2, 2])}"/>`,
  ),
};

export function fillIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    el.innerHTML = ICONS[el.dataset.icon!] ?? "";
  });
}
