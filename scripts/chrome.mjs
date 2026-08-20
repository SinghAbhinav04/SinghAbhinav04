/**
 * The macOS furniture: desktop wallpaper, window frames with traffic lights,
 * the menu bar, the Dock, sidebars, and the small vector glyph set.
 *
 * Panels never draw a rounded rectangle by hand — they ask for a `win()` and
 * fill the content rect it hands back.
 */
import { C, n, rect, rrect, rpath, hline, circle, measure, midline, linearGradient } from "./theme.mjs";
import { LAYOUT } from "./config.mjs";
import * as si from "simple-icons";

/* ---------------------------------------------------------------- wallpaper */

/**
 * A single continuous Sonoma-style aurora that runs the height of the whole
 * README. Each slice renders its own window into it — `pageY` is where this
 * slice starts in page space, `pageH` the total stack height — so the gradient
 * and the light blooms line up across image boundaries.
 */
export function wallpaper(doc, { w, h, pageY, pageH }) {
  const id = `w${Math.round(pageY)}`;
  doc.def(
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(-pageY)}" x2="${n(w * 0.35)}" y2="${n(pageH - pageY)}">` +
      `<stop offset="0" stop-color="${C.deskTop}"/>` +
      `<stop offset="0.42" stop-color="${C.deskMid}"/>` +
      `<stop offset="1" stop-color="${C.deskBot}"/>` +
      `</linearGradient>`,
  );
  doc.add(rect(0, 0, w, h, `url(#${id})`));

  // Blooms sit at fixed page coordinates and are simply translated into view.
  // Kept faint and neutral — they should read as light falling on a desktop,
  // never as colour.
  const blooms = [
    { x: 0.1, y: 0.02, r: 520, color: C.deskGlow1, o: 0.42 },
    { x: 0.92, y: 0.14, r: 460, color: C.deskGlow3, o: 0.24 },
    { x: 0.5, y: 0.38, r: 620, color: C.deskGlow2, o: 0.26 },
    { x: 0.05, y: 0.62, r: 500, color: C.deskGlow3, o: 0.2 },
    { x: 0.95, y: 0.8, r: 560, color: C.deskGlow1, o: 0.3 },
    { x: 0.35, y: 0.97, r: 520, color: C.deskGlow2, o: 0.24 },
  ];
  for (const b of blooms) {
    const cy = b.y * pageH - pageY;
    if (cy < -b.r || cy > h + b.r) continue; // off this slice entirely
    const gid = `b${Math.round(pageY)}_${Math.round(b.x * 100)}_${Math.round(b.y * 1000)}`;
    doc.def(
      `<radialGradient id="${gid}"><stop offset="0" stop-color="${b.color}" stop-opacity="${b.o}"/>` +
        `<stop offset="1" stop-color="${b.color}" stop-opacity="0"/></radialGradient>`,
    );
    doc.add(circle(b.x * w, cy, b.r, `url(#${gid})`));
  }
}

/* ------------------------------------------------------------------ shadows */

let shadowDefined = new WeakSet();
function shadowFilter(doc) {
  if (!shadowDefined.has(doc)) {
    doc.def(
      `<filter id="wsh" x="-20%" y="-20%" width="140%" height="150%">` +
        `<feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.45"/>` +
        `<feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.4"/>` +
        `</filter>`,
    );
    shadowDefined.add(doc);
  }
  return "url(#wsh)";
}

/* ----------------------------------------------------------- traffic lights */

/**
 * The three lights, left-aligned in the titlebar. Passing `hoverGlyphs` etches
 * the ×, − and + marks that macOS reveals when the pointer is over the group.
 */
export function trafficLights(doc, { x, cy, hoverGlyphs = false }) {
  const r = 6;
  const lights = [
    [C.tlRed, C.tlRedEdge, "close"],
    [C.tlYellow, C.tlYellowEdge, "min"],
    [C.tlGreen, C.tlGreenEdge, "max"],
  ];
  const out = [];
  lights.forEach(([fill, edge, kind], i) => {
    const cx = x + i * 20;
    out.push(
      circle(cx, cy, r, fill),
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r - 0.5)}" fill="none" stroke="${edge}" stroke-opacity="0.9" stroke-width="1"/>`,
      // a hint of the glossy top edge each light carries
      `<path d="M${n(cx - 3.2)},${n(cy - 3.4)} A ${n(r)} ${n(r)} 0 0 1 ${n(cx + 3.2)},${n(cy - 3.4)}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
    );
    if (hoverGlyphs) {
      const g = C.tlGlyph;
      if (kind === "close")
        out.push(
          `<path d="M${n(cx - 2.2)},${n(cy - 2.2)} L${n(cx + 2.2)},${n(cy + 2.2)} M${n(cx + 2.2)},${n(cy - 2.2)} L${n(cx - 2.2)},${n(cy + 2.2)}" stroke="${g}" stroke-width="1.3" stroke-linecap="round"/>`,
        );
      if (kind === "min")
        out.push(
          `<path d="M${n(cx - 2.6)},${n(cy)} H${n(cx + 2.6)}" stroke="${g}" stroke-width="1.3" stroke-linecap="round"/>`,
        );
      if (kind === "max")
        out.push(
          `<path d="M${n(cx - 2.4)},${n(cy + 2.4)} L${n(cx - 2.4)},${n(cy - 0.4)} L${n(cx + 0.4)},${n(cy - 2.4)} L${n(cx + 2.4)},${n(cy - 2.4)} L${n(cx + 2.4)},${n(cy + 0.4)} L${n(cx - 0.4)},${n(cy + 2.4)} Z" fill="${g}"/>`,
        );
    }
  });
  doc.add(...out);
}

/* ------------------------------------------------------------------- window */

/**
 * Draws a window frame and returns the content rect inside it.
 *
 * @param {object} o
 * @param {string} o.title      centred titlebar label
 * @param {string} [o.subtitle] smaller second line under the title
 * @param {string} [o.fill]     body colour
 * @param {number} [o.sidebar]  width of a Finder-style sidebar, 0 for none
 * @param {string} [o.toolbar]  extra height for a toolbar strip below the bar
 * @returns {{x,y,w,h, barBottom, sidebarRect}} the body area under the chrome
 */
export function win(doc, { x, y, w, h, title, subtitle, fill = C.winFill, sidebar = 0, toolbar = 0, tint = null }) {
  const r = LAYOUT.radius;
  const bar = LAYOUT.titlebar;
  const clip = `wc${Math.round(x)}_${Math.round(y)}_${Math.round(w)}`;

  doc.def(`<clipPath id="${clip}"><path d="${rpath(x, y, w, h, r)}"/></clipPath>`);

  const barGrad = linearGradient(doc, [
    [0, C.barTop],
    [1, C.barBot],
  ]);

  doc.add(
    // the frame itself, shadowed
    `<path d="${rpath(x, y, w, h, r)}" fill="${fill}" filter="${shadowFilter(doc)}"/>`,
    `<g clip-path="url(#${clip})">`,
  );

  // sidebar behind everything, so the titlebar's vibrancy sits on top of it
  if (sidebar) doc.add(rect(x, y, sidebar, h, C.sidebar));

  doc.add(
    rect(x, y, w, bar, barGrad),
    tint ? rect(x, y, w, bar, tint, 'opacity="0.14"') : "",
    hline(x, y + bar - 1, w, "#000000", 0.55),
    // toolbar strip, a touch darker than the titlebar
    toolbar ? rect(x, y + bar, w, toolbar, C.winFill2) : "",
    toolbar ? hline(x, y + bar + toolbar - 1, w, C.hairline, 0.9) : "",
    // the 1px specular line macOS runs along the top edge of every window
    `<path d="M${n(x + r)},${n(y + 0.5)} H${n(x + w - r)}" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1"/>`,
    `</g>`,
    `<path d="${rpath(x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5)}" fill="none" stroke="${C.stroke}" stroke-opacity="0.13"/>`,
  );

  trafficLights(doc, { x: x + 19, cy: y + bar / 2, hoverGlyphs: false });

  if (title) {
    const cy = subtitle ? y + bar / 2 - 5 : y + bar / 2;
    doc.add(
      doc.text("ui6", title, {
        x: x + w / 2,
        y: midline("ui6", 12.5, cy - 8, 16),
        size: 12.5,
        fill: C.text,
        anchor: "middle",
      }),
    );
    if (subtitle)
      doc.add(
        doc.text("ui", subtitle, {
          x: x + w / 2,
          y: midline("ui", 10, y + bar / 2 + 2, 14),
          size: 10,
          fill: C.text3,
          anchor: "middle",
        }),
      );
  }

  const top = y + bar + toolbar;
  return {
    x: x + sidebar,
    y: top,
    w: w - sidebar,
    h: h - bar - toolbar,
    barBottom: top,
    sidebarRect: sidebar ? { x, y: top, w: sidebar, h: h - bar - toolbar } : null,
  };
}

/* ----------------------------------------------------------------- menu bar */

/**
 * The translucent strip across the top of the desktop.
 *
 * Returns the x/width of every menu title so build.mjs can cut the bar into one
 * image per title — that is what makes the menu genuinely clickable rather than
 * a picture of a menu. Pass `measureOnly` (with `doc` null) to get the geometry
 * without drawing.
 */
export function menuBar(doc, { x = 0, y = 0, w, h = 26, name, menus, right = [], measureOnly = false }) {
  const draw = (...parts) => {
    if (!measureOnly) doc.add(...parts);
  };
  const label = (key, str, cx) =>
    measureOnly ? "" : doc.text(key, str, { x: cx, y: midline("ui5", 11.5, y, h), size: 11.5, fill: C.text });

  draw(rect(x, y, w, h, "#000000", 'opacity="0.34"'), hline(x, y + h - 1, w, "#ffffff", 0.08));

  let cx = x + 16;
  draw(glyph("apple", { x: cx, y: y + (h - 14) / 2, size: 14, fill: C.text }));
  cx += 26;

  // The bold app name is part of the leading region, not a menu of its own.
  draw(label("ui7", name, cx));
  cx += measure("ui7", name, 11.5) + 24;

  const items = menus.map((m) => {
    const item = { label: m, x: cx, w: measure("ui5", m, 11.5) };
    draw(label("ui5", m, cx));
    cx += item.w + 22;
    return item;
  });

  // right side: status glyphs, then the clock
  let rx = x + w - 16;
  for (const item of [...right].reverse()) {
    if (item.text) {
      rx -= measure("ui5", item.text, 11.5);
      draw(label("ui5", item.text, rx));
      rx -= 16;
    } else {
      const size = item.size ?? 15;
      rx -= size;
      draw(glyph(item.icon, { x: rx, y: y + (h - size) / 2, size, fill: C.text }));
      rx -= 13;
    }
  }

  return { items };
}

/* --------------------------------------------------------------------- dock */

/**
 * One frosted-glass Dock bar. Rendered into a canvas `w` wide at page position
 * `pageY`; build.mjs slices the same drawing into per-icon images so each tile
 * can carry its own link.
 */
export function dock(doc, { x, y, w, h, items, tileSize = 52, gap = 12 }) {
  const inner = 10;
  const barW = items.length * tileSize + (items.length - 1) * gap + inner * 2;
  const barX = x + (w - barW) / 2;
  const barH = tileSize + inner * 2;
  const barY = y + (h - barH) / 2;

  const glass = linearGradient(doc, [
    [0, "#ffffff", 0.16],
    [1, "#ffffff", 0.07],
  ]);
  doc.add(
    `<path d="${rpath(barX, barY, barW, barH, 22)}" fill="#0e0e14" opacity="0.5"/>`,
    `<path d="${rpath(barX, barY, barW, barH, 22)}" fill="${glass}"/>`,
    `<path d="${rpath(barX + 0.5, barY + 0.5, barW - 1, barH - 1, 21.5)}" fill="none" stroke="#ffffff" stroke-opacity="0.2"/>`,
  );

  const tiles = [];
  items.forEach((item, i) => {
    const tx = barX + inner + i * (tileSize + gap);
    const ty = barY + inner;
    dockTile(doc, { x: tx, y: ty, size: tileSize, item });
    // running indicator dot, as macOS shows under open apps
    doc.add(circle(tx + tileSize / 2, barY + barH + 6, 2, "#ffffff", 'opacity="0.55"'));
    tiles.push({ ...item, cx: tx + tileSize / 2 });
  });
  return { barX, barW, tiles };
}

/** App-icon tints and glyphs for the Dock. */
const DOCK_ICONS = {
  finder: { glyph: "finder", from: "#3ea9ff", to: "#0a6dd8" },
  resume: { glyph: "doc", from: "#f5f5f7", to: "#c9c9d1", ink: "#1c1c1e" },
  trophy: { glyph: "trophy", from: "#ffd85e", to: "#f0a319" },
  github: { brand: "github", from: "#4a4a52", to: "#1c1c22" },
  linkedin: { glyph: "linkedin", from: "#3aa0e8", to: "#0a66c2" },
  discord: { brand: "discord", from: "#8b9dfb", to: "#5865f2" },
  mail: { glyph: "mail", from: "#5ec8ff", to: "#1176e8" },
  terminal: { glyph: "terminal", from: "#3a3a42", to: "#141418", ink: "#32d74b" },
};

function dockTile(doc, { x, y, size, item }) {
  const spec = DOCK_ICONS[item.id] ?? DOCK_ICONS.finder;
  const r = size * 0.235; // the macOS squircle, approximated
  const g = linearGradient(doc, [
    [0, spec.from],
    [1, spec.to],
  ]);
  doc.add(
    `<path d="${rpath(x, y, size, size, r)}" fill="${g}"/>`,
    `<path d="${rpath(x + 0.5, y + 0.5, size - 1, size - 1, r - 0.5)}" fill="none" stroke="#ffffff" stroke-opacity="0.28"/>`,
    // top-edge sheen
    `<path d="${rpath(x + 2, y + 2, size - 4, size * 0.42, [r - 2, r - 2, size * 0.3, size * 0.3])}" fill="#ffffff" opacity="0.09"/>`,
  );
  const inner = size * 0.54;
  const ix = x + (size - inner) / 2;
  const iy = y + (size - inner) / 2;
  if (spec.brand) doc.add(brandIcon(spec.brand, { x: ix, y: iy, size: inner, fill: "#ffffff" }));
  else doc.add(glyph(spec.glyph, { x: ix, y: iy, size: inner, fill: spec.ink ?? "#ffffff" }));
}

/* -------------------------------------------------------------------- pills */

/** Small rounded status pill — used for tags, counters and toolbar chips. */
export function pill(doc, { x, y, label, size = 10.5, tint = C.text2, bg = null, h = 20, padX = 9, icon = null }) {
  const iconW = icon ? size + 5 : 0;
  const w = measure("ui5", label, size) + padX * 2 + iconW;
  doc.add(
    rrect(x, y, w, h, h / 2, bg ?? "#ffffff", bg ? "" : 'opacity="0.08"'),
    bg ? "" : `<path d="${rpath(x + 0.5, y + 0.5, w - 1, h - 1, (h - 1) / 2)}" fill="none" stroke="#ffffff" stroke-opacity="0.1"/>`,
  );
  if (icon) doc.add(glyph(icon, { x: x + padX, y: y + (h - size) / 2, size, fill: tint }));
  doc.add(
    doc.text("ui5", label, { x: x + padX + iconW, y: midline("ui5", size, y, h), size, fill: tint }),
  );
  return w;
}

/* -------------------------------------------------------------------- icons */

/**
 * Hand-drawn SF-Symbols-ish glyph set, all authored on a 24×24 grid.
 * Values are either a fill path (string) or {d, stroke, width}.
 */
const GLYPHS = {
  apple:
    "M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.74 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.65-2.14.83-1.23 1.18-2.42 1.2-2.48-.03-.01-2.3-.88-2.32-3.5zM14.9 6.1c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.06 1.7-.93 2.7.97.08 1.97-.5 2.59-1.23z",
  finder: {
    d: "M4 5.5 A1 1 0 0 1 5 4.5 H11 V19.5 H5 A1 1 0 0 1 4 18.5 Z M13 4.5 H19 A1 1 0 0 1 20 5.5 V18.5 A1 1 0 0 1 19 19.5 H13 Z M7.6 9.2 V11.4 M16.4 9.2 V11.4 M14.4 15.4 Q16.4 17 18.4 15.4",
    stroke: true,
    width: 1.7,
  },
  folder:
    "M3 6.6c0-1 .8-1.8 1.8-1.8h4.1c.6 0 1.2.3 1.5.8l.9 1.3h7c1 0 1.8.8 1.8 1.8v8.9c0 1-.8 1.8-1.8 1.8H4.8c-1 0-1.8-.8-1.8-1.8z",
  doc: "M6 3.2h7.2L19 9v11.4c0 .9-.7 1.6-1.6 1.6H6c-.9 0-1.6-.7-1.6-1.6V4.8c0-.9.7-1.6 1.6-1.6zm7 1.5V8c0 .6.4 1 1 1h3.3zM7.2 12h9v1.5h-9zm0 3.2h9v1.5h-9zm0 3.2h5.6V20H7.2z",
  docFill: "M6 3.2h7.2L19 9v11.4c0 .9-.7 1.6-1.6 1.6H6c-.9 0-1.6-.7-1.6-1.6V4.8c0-.9.7-1.6 1.6-1.6z",
  pdf: "M6 2.6h7.6L19.4 8.4V21c0 .9-.7 1.6-1.6 1.6H6c-.9 0-1.6-.7-1.6-1.6V4.2c0-.9.7-1.6 1.6-1.6z",
  trophy:
    "M7 3.4h10v1.2h2.8c.6 0 1.1.5 1.1 1.1v1.6c0 2.2-1.6 4-3.7 4.4-.7 1.6-2.1 2.8-3.8 3.1v2.6h2.7c.5 0 .9.4.9.9v1.3H7v-1.3c0-.5.4-.9.9-.9h2.7v-2.6c-1.7-.3-3.1-1.5-3.8-3.1C4.7 11.3 3.1 9.5 3.1 7.3V5.7c0-.6.5-1.1 1.1-1.1H7zm0 2.6H4.9v1.3c0 1.1.7 2.1 1.7 2.5A9 9 0 0 1 7 8.4zm10 0v2.4c0 .5 0 1-.1 1.4 1-.4 1.7-1.4 1.7-2.5V6z",
  star: "M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5-4.8-4.6 6.6-.9z",
  gear: "M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2zm9 4.6v-2l-2.2-.4a7 7 0 0 0-.7-1.7l1.3-1.8-1.4-1.4-1.8 1.3a7 7 0 0 0-1.7-.7L14.1 4h-2l-.4 2.3a7 7 0 0 0-1.7.7L8.2 5.7 6.8 7.1l1.3 1.8a7 7 0 0 0-.7 1.7L5 11v2l2.3.4c.2.6.4 1.2.7 1.7l-1.3 1.8 1.4 1.4 1.8-1.3c.5.3 1.1.5 1.7.7l.4 2.3h2l.4-2.3c.6-.2 1.2-.4 1.7-.7l1.8 1.3 1.4-1.4-1.3-1.8c.3-.5.5-1.1.7-1.7z",
  mail: {
    d: "M3.4 7.4 A2 2 0 0 1 5.4 5.4 H18.6 A2 2 0 0 1 20.6 7.4 V16.6 A2 2 0 0 1 18.6 18.6 H5.4 A2 2 0 0 1 3.4 16.6 Z M4 7.2 L12 13 L20 7.2",
    stroke: true,
    width: 1.8,
  },
  terminal: { d: "M5.5 8.4 L9.6 12 L5.5 15.6 M11.6 16.2 H18", stroke: true, width: 2 },
  chevron: { d: "M9.5 5.5 L16 12 L9.5 18.5", stroke: true, width: 2 },
  arrowDown: { d: "M12 4.5 V17 M6.5 11.5 L12 17.2 L17.5 11.5", stroke: true, width: 2 },
  search: { d: "M11 4.6a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8z M15.7 15.7 L20 20", stroke: true, width: 1.9 },
  house: "M12 3.2 2.8 11h2.4v8.4c0 .6.5 1 1 1h4v-5.8h3.6v5.8h4c.6 0 1-.4 1-1V11h2.4z",
  clock: { d: "M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8z M12 7.2 V12 L15.4 14", stroke: true, width: 1.8 },
  person: "M12 3.4a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zm0 10c4.3 0 7.8 2.4 7.8 5.3v1.9H4.2v-1.9c0-2.9 3.5-5.3 7.8-5.3z",
  brain:
    "M9.3 2.8c1.2 0 2.2.8 2.5 1.9h.4c.3-1.1 1.3-1.9 2.5-1.9 1.4 0 2.6 1.1 2.6 2.5v.2c1.2.4 2 1.5 2 2.7 0 .7-.2 1.3-.6 1.8.5.5.8 1.2.8 2 0 1-.5 1.8-1.2 2.4v.3c0 1.6-1.3 2.9-2.9 2.9h-.3c-.4.9-1.3 1.6-2.4 1.6-1.4 0-2.6-1.1-2.6-2.6V6.5H8.9c-.3 0-.5-.2-.5-.5v-.7c0-1.4 1.1-2.5 2.5-2.5zM8.6 4.4c-1.3.1-2.4 1.2-2.4 2.6v.1c-1.2.4-2 1.5-2 2.7 0 .7.2 1.3.6 1.8-.5.5-.8 1.2-.8 2 0 1 .5 1.8 1.2 2.4v.3c0 1.6 1.3 2.9 2.9 2.9h.3c.2.5.6.9 1 1.2V4.4z",
  layers:
    "M12 2.6 2.4 7.4 12 12.2l9.6-4.8zM4.6 11.2 2.4 12.3 12 17.1l9.6-4.8-2.2-1.1L12 14.9zm0 4.9-2.2 1.1L12 22l9.6-4.8-2.2-1.1L12 19.8z",
  waveform: {
    d: "M2.8 12 H5 M7.6 7.4 V16.6 M11 3.8 V20.2 M14.4 6.6 V17.4 M17.8 9.6 V14.4 M21.2 11.2 V12.8",
    stroke: true,
    width: 1.9,
    caps: "round",
  },
  lock: "M12 2.4c2.8 0 5 2.2 5 5v2.2h.8c.9 0 1.6.7 1.6 1.6v9c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6v-9c0-.9.7-1.6 1.6-1.6H7V7.4c0-2.8 2.2-5 5-5zm0 2c-1.7 0-3 1.3-3 3v2.2h6V7.4c0-1.7-1.3-3-3-3z",
  code: { d: "M8.6 6.4 3.6 12 8.6 17.6 M15.4 6.4 20.4 12 15.4 17.6 M13.4 4.2 10.6 19.8", stroke: true, width: 1.9 },
  bolt: "M13.4 2.2 4.6 13.6h5.2l-1 8.2 9-11.6h-5.4z",
  chart: "M4 19.4h16.4v1.8H2.6V3.4h1.4zM7.4 16V9.6h2.4V16zm4.4 0V5.6h2.4V16zm4.4 0v-8.6h2.4V16z",
  flame: "M12.6 2c.4 2.8-1 4.2-2.4 5.6C8.6 9.2 7 10.8 7 13.8A5.6 5.6 0 0 0 12.6 19.4 5.6 5.6 0 0 0 18.2 13.8c0-2.6-1.2-4.2-2.4-5.6-.6 1-1.4 1.6-2.2 1.8.8-2.4.6-5.4-1-8z",
  package:
    "M12 2.4 3 7v10l9 4.6 9-4.6V7zm0 2.1 6.5 3.3L12 11.1 5.5 7.8zM5 9.6l6 3v7l-6-3zm14 0v7l-6 3v-7z",
  wifi: {
    d: "M3.6 9.2a12 12 0 0 1 16.8 0 M6.6 12.4a7.8 7.8 0 0 1 10.8 0 M9.6 15.6a3.6 3.6 0 0 1 4.8 0",
    stroke: true,
    width: 1.9,
    caps: "round",
  },
  battery:
    "M3 8.4h14.2c.9 0 1.6.7 1.6 1.6v4c0 .9-.7 1.6-1.6 1.6H3c-.9 0-1.6-.7-1.6-1.6v-4c0-.9.7-1.6 1.6-1.6zm1 1.6c-.3 0-.6.3-.6.6v3.6c0 .3.3.6.6.6h12.2c.3 0 .6-.3.6-.6v-3.6c0-.3-.3-.6-.6-.6zm16 .4h.8c.6 0 1.1.5 1.1 1.1v1c0 .6-.5 1.1-1.1 1.1H20z",
  batteryFull: "M4.4 10.6h11.4v2.8H4.4z",
  control: { d: "M4 7.5 H20 M4 16.5 H20 M9.5 5.2 V9.8 M15 14.2 V18.8", stroke: true, width: 1.8, caps: "round" },
  eye: "M12 5.4c-4.6 0-8.2 3.4-9.6 6.6 1.4 3.2 5 6.6 9.6 6.6s8.2-3.4 9.6-6.6c-1.4-3.2-5-6.6-9.6-6.6zm0 2.6a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 1.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z",
  fork: "M7.4 2.6a3 3 0 0 1 1 5.8v1.4c0 .9.7 1.6 1.6 1.6h4c.9 0 1.6-.7 1.6-1.6V8.4a3 3 0 1 1 2 0v1.4a3.6 3.6 0 0 1-3.6 3.6H13v2.2a3 3 0 1 1-2 0v-2.2h-1a3.6 3.6 0 0 1-3.6-3.6V8.4a3 3 0 0 1 1-5.8z",
  check: { d: "M4.8 12.6 9.8 17.4 19.2 6.8", stroke: true, width: 2.2, caps: "round" },
  circleCheck:
    "M12 2.4A9.6 9.6 0 1 0 12 21.6 9.6 9.6 0 0 0 12 2.4zm4.7 6.9-5.9 6.8-3.5-3.4 1.3-1.4 2.1 2 4.6-5.3z",
  play: "M7.4 4.6 19 12 7.4 19.4z",
  sparkle:
    "M12 2.4l1.7 5.1 5.1 1.7-5.1 1.7L12 16l-1.7-5.1-5.1-1.7 5.1-1.7zM19.4 14.6l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8zM4.6 3.4l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8L2.2 5.8l1.8-.6z",
  pin: "M12 2.4c-3.5 0-6.3 2.8-6.3 6.3 0 4.7 6.3 12.9 6.3 12.9s6.3-8.2 6.3-12.9c0-3.5-2.8-6.3-6.3-6.3zm0 8.7a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
  book: "M4 4.2c0-.7.6-1.3 1.3-1.3H11c.6 0 1 .4 1 1v16c0-.6-.4-1-1-1H5.3c-.7 0-1.3-.6-1.3-1.3zm16 0v13.4c0 .7-.6 1.3-1.3 1.3H13c-.6 0-1 .4-1 1v-16c0-.6.4-1 1-1h5.7c.7 0 1.3.6 1.3 1.3z",
  location: "M21.6 2.4 2.8 10.2c-.8.3-.8 1.4 0 1.7l7.4 2.6 2.6 7.4c.3.8 1.4.8 1.7 0z",
  grid: "M3.4 3.4h7v7h-7zm10.2 0h7v7h-7zM3.4 13.6h7v7h-7zm10.2 0h7v7h-7z",
  azure:
    "M5.48 21.3H24L14.03 4.01l-3.04 8.35 5.84 6.94zM13.23 2.7 6.11 8.68 0 19.25h5.51z",
  phone:
    "M6.6 2.6h3.1c.6 0 1.1.4 1.3 1l1.1 3.5c.2.5 0 1.1-.5 1.4l-1.9 1.2a13 13 0 0 0 5.6 5.6l1.2-1.9c.3-.5.9-.7 1.4-.5l3.5 1.1c.6.2 1 .7 1 1.3v3.1c0 1.1-.9 2-2 2C11.2 21.4 2.6 12.8 2.6 4.6c0-1.1.9-2 2-2z",
  // simple-icons dropped the LinkedIn mark over trademark, so it lives here.
  linkedin: (fill) =>
    `<circle cx="4.3" cy="4.6" r="2.6" fill="${fill}"/>` +
    `<rect x="1.9" y="9" width="4.8" height="12.8" fill="${fill}"/>` +
    `<path d="M9.3 9 H13.9 V11 Q15.2 8.6 18.3 8.6 Q23.8 8.6 23.8 14.8 V21.8 H19 V15.6 Q19 13 17 13 Q14.1 13 14.1 15.8 V21.8 H9.3 Z" fill="${fill}"/>`,
};

/**
 * Draws a glyph from the set above at `size` px square.
 */
export function glyph(name, { x, y, size = 16, fill = C.text, opacity = null }) {
  const g = GLYPHS[name];
  if (!g) throw new Error(`unknown glyph "${name}"`);
  const s = size / 24;
  const o = opacity == null ? "" : ` opacity="${opacity}"`;
  const body =
    typeof g === "function"
      ? g(fill)
      : typeof g === "string"
        ? `<path d="${g}" fill="${fill}"/>`
        : `<path d="${g.d}" fill="none" stroke="${fill}" stroke-width="${g.width ?? 1.8}" stroke-linecap="${g.caps ?? "round"}" stroke-linejoin="round"/>`;
  return `<g transform="translate(${n(x)},${n(y)}) scale(${n(s)})"${o}>${body}</g>`;
}

/* ------------------------------------------------------------ brand icons */

const brandCache = new Map();
/** Look a simple-icons entry up by slug. */
export function brand(slug) {
  if (!brandCache.has(slug)) {
    const key = "si" + slug.charAt(0).toUpperCase() + slug.slice(1);
    const entry = si[key];
    if (!entry) throw new Error(`unknown simple-icons slug "${slug}" (looked for ${key})`);
    brandCache.set(slug, entry);
  }
  return brandCache.get(slug);
}

/** Draws a simple-icons brand mark at `size` px square. */
export function brandIcon(slug, { x, y, size = 24, fill = null, opacity = null }) {
  const entry = brand(slug);
  const s = size / 24;
  const o = opacity == null ? "" : ` opacity="${opacity}"`;
  return `<g transform="translate(${n(x)},${n(y)}) scale(${n(s)})"${o}><path d="${entry.path}" fill="${fill ?? "#" + entry.hex}"/></g>`;
}
