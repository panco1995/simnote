const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" fill="currentColor">${body}</svg>`;

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
};

export function fillIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    el.innerHTML = ICONS[el.dataset.icon!] ?? "";
  });
}
