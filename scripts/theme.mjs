/**
 * macOS Sonoma (dark) design system.
 *
 * Everything a panel needs to draw itself: the palette, font metrics for
 * measuring text before it exists, and the Doc class that collects SVG parts
 * and subsets the embedded fonts down to the glyphs actually used.
 */
import * as fontkit from "fontkit";
import subsetFont from "subset-font";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = path.join(ROOT, "assets", "fonts");

/* ------------------------------------------------------------------ palette */

export const C = {
  // desktop wallpaper — graphite, no colour cast, so the windows carry the page
  deskTop: "#1a1a1d",
  deskMid: "#141417",
  deskBot: "#0b0b0d",
  deskGlow1: "#3a3a42",
  deskGlow2: "#2e3138",
  deskGlow3: "#42424c",

  // window chrome
  winFill: "#1c1c1e", // window body
  winFill2: "#202024", // alternate body (sidebar-less panels)
  barTop: "#3a3a3c", // titlebar gradient top
  barBot: "#2c2c2e", // titlebar gradient bottom
  barLine: "#000000", // hairline under the titlebar
  stroke: "#ffffff", // window edge, used at low opacity
  sidebar: "#232326",
  sidebarSel: "#3a3a3e",
  fieldBg: "#141416",
  hairline: "#38383a",

  // text
  text: "#f2f2f7", // primary label
  text2: "#aeaeb2", // secondary label
  text3: "#7c7c82", // tertiary label
  text4: "#5a5a60", // quaternary / disabled

  // traffic lights
  tlRed: "#ff5f57",
  tlRedEdge: "#e0443e",
  tlYellow: "#febc2e",
  tlYellowEdge: "#dea123",
  tlGreen: "#28c840",
  tlGreenEdge: "#1aab29",
  tlGlyph: "#00000066",

  // system accents
  blue: "#0a84ff",
  pink: "#ff5c7e", // Abhinav's brand pink, kept as the highlight
  purple: "#bf5af2",
  green: "#32d74b",
  orange: "#ff9f0a",
  yellow: "#ffd60a",
  teal: "#64d2ff",
  red: "#ff453a",
  indigo: "#5e5ce6",
  mint: "#66d4cf",
  brown: "#ac8e68",
  graphite: "#98989d",
};

/** Language dot colours, GitHub's own values. */
export const LANG = {
  Python: "#3572A5",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Java: "#b07219",
  Rust: "#dea584",
  Kotlin: "#A97BFF",
  HTML: "#e34c26",
  CSS: "#563d7c",
  "Jupyter Notebook": "#DA5B0B",
  C: "#555555",
  Shell: "#89e051",
  Dart: "#00B4AB",
  Other: "#8b8b90",
};

/* -------------------------------------------------------------------- fonts */

const FONT_FILES = {
  ui: { file: "inter-400.woff2", family: "UI", weight: 400 },
  ui5: { file: "inter-500.woff2", family: "UI", weight: 500 },
  ui6: { file: "inter-600.woff2", family: "UI", weight: 600 },
  ui7: { file: "inter-700.woff2", family: "UI", weight: 700 },
  mono: { file: "jetbrains-mono-400.woff2", family: "MN", weight: 400 },
  mono7: { file: "jetbrains-mono-700.woff2", family: "MN", weight: 700 },
};

const loaded = new Map();
function font(key) {
  if (!loaded.has(key)) {
    const meta = FONT_FILES[key];
    if (!meta) throw new Error(`unknown font "${key}"`);
    const buf = readFileSync(path.join(FONT_DIR, meta.file));
    loaded.set(key, { ...meta, buf, kit: fontkit.create(buf) });
  }
  return loaded.get(key);
}

/**
 * Advance width of `str` at `size` px. Characters the face has no glyph for
 * (emoji, box drawing) fall back to a system font; we approximate those as
 * roughly square so layout maths stays close.
 */
export function measure(key, str, size, ls = 0) {
  const f = font(key);
  const chars = [...String(str)];
  const supported = chars.every((ch) => f.kit.hasGlyphForCodePoint(ch.codePointAt(0)));

  let units = 0;
  let fallback = 0;
  if (supported) {
    units = f.kit.layout(String(str)).advanceWidth; // whole run, so kerning counts
  } else {
    for (const ch of chars) {
      if (f.kit.hasGlyphForCodePoint(ch.codePointAt(0))) units += f.kit.layout(ch).advanceWidth;
      else fallback += 1;
    }
  }
  return (units / f.kit.unitsPerEm) * size + fallback * size * 1.15 + ls * Math.max(0, chars.length - 1);
}

/** Truncate to fit `max` px, appending an ellipsis when it has to cut. */
export function ellipsize(key, str, size, max, ls = 0) {
  if (measure(key, str, size, ls) <= max) return String(str);
  const chars = [...String(str)];
  while (chars.length > 1) {
    chars.pop();
    const candidate = chars.join("").trimEnd() + "…";
    if (measure(key, candidate, size, ls) <= max) return candidate;
  }
  return "…";
}

/** Greedy word wrap into at most `maxLines` lines of `max` px. */
export function wrap(key, str, size, max, maxLines = Infinity) {
  const words = String(str).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(key, next, size) <= max || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.length) {
    // Anything left over gets folded into an ellipsis on the last line.
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) lines[lines.length - 1] = ellipsize(key, lines.at(-1) + " …", size, max);
  }
  return lines;
}

/** Baseline y that vertically centres cap-height text inside a box. */
export function midline(key, size, boxY, boxH) {
  const f = font(key);
  const cap = (f.kit.capHeight ?? f.kit.ascent * 0.7) / f.kit.unitsPerEm;
  return boxY + boxH / 2 + (cap * size) / 2;
}

/** Baseline y for text whose visual cap-top should sit at `top`. */
export function topline(key, size, top) {
  const f = font(key);
  const cap = (f.kit.capHeight ?? f.kit.ascent * 0.7) / f.kit.unitsPerEm;
  return top + cap * size;
}

/* ----------------------------------------------------------------- escaping */

export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* --------------------------------------------------------------- primitives */

export const n = (v) => Math.round(v * 100) / 100;

export function rect(x, y, w, h, fill, extra = "") {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

/** Rounded rect; `r` may be a number or [tl, tr, br, bl] for mixed corners. */
export function rrect(x, y, w, h, r, fill, extra = "") {
  if (typeof r === "number") {
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
  }
  return `<path d="${rpath(x, y, w, h, r)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

/** Path data for a rect with per-corner radii [tl, tr, br, bl]. */
export function rpath(x, y, w, h, r) {
  const [tl, tr, br, bl] = typeof r === "number" ? [r, r, r, r] : r;
  return [
    `M${n(x + tl)},${n(y)}`,
    `H${n(x + w - tr)}`,
    tr ? `A${n(tr)},${n(tr)} 0 0 1 ${n(x + w)},${n(y + tr)}` : "",
    `V${n(y + h - br)}`,
    br ? `A${n(br)},${n(br)} 0 0 1 ${n(x + w - br)},${n(y + h)}` : "",
    `H${n(x + bl)}`,
    bl ? `A${n(bl)},${n(bl)} 0 0 1 ${n(x)},${n(y + h - bl)}` : "",
    `V${n(y + tl)}`,
    tl ? `A${n(tl)},${n(tl)} 0 0 1 ${n(x + tl)},${n(y)}` : "",
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
}

/** 1px hairline separator. */
export function hline(x, y, w, color = C.hairline, opacity = 1) {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="1" fill="${color}" opacity="${opacity}"/>`;
}

export function circle(cx, cy, r, fill, extra = "") {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

/* ------------------------------------------------------------------ gradient */

let gradSeq = 0;
/** Registers a linear gradient on `doc` and returns its url(#…) reference. */
export function linearGradient(doc, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  const id = `g${gradSeq++}`;
  doc.def(
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
      stops
        .map(
          ([offset, color, opacity]) =>
            `<stop offset="${offset}" stop-color="${color}"${opacity == null ? "" : ` stop-opacity="${opacity}"`}/>`,
        )
        .join("") +
      `</linearGradient>`,
  );
  return `url(#${id})`;
}

/** Registers a radial gradient and returns its url(#…) reference. */
export function radialGradient(doc, stops, { cx = 0.5, cy = 0.5, r = 0.5 } = {}) {
  const id = `g${gradSeq++}`;
  doc.def(
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">` +
      stops
        .map(
          ([offset, color, opacity]) =>
            `<stop offset="${offset}" stop-color="${color}"${opacity == null ? "" : ` stop-opacity="${opacity}"`}/>`,
        )
        .join("") +
      `</radialGradient>`,
  );
  return `url(#${id})`;
}

/* ------------------------------------------------------------------ document */

export class Doc {
  constructor(width) {
    this.width = width;
    this.defs = [];
    this.parts = [];
    this.used = new Map(); // fontKey -> Set of chars
    this.css = "";
  }

  add(...svg) {
    this.parts.push(...svg.filter(Boolean));
    return this;
  }

  def(...svg) {
    this.defs.push(...svg.filter(Boolean));
    return this;
  }

  style(css) {
    this.css += css;
    return this;
  }

  /** Record glyph usage so the embedded face can be subset down to it. */
  #note(key, str) {
    if (!this.used.has(key)) this.used.set(key, new Set());
    const set = this.used.get(key);
    for (const ch of String(str)) set.add(ch);
  }

  /**
   * Text node — `y` is the baseline, `anchor` is start|middle|end.
   * A colour-emoji stack is appended so pictographs still render.
   */
  text(key, str, { x, y, size, fill, anchor = "start", opacity, cls, ls = 0, extra = "" } = {}) {
    const f = font(key);
    this.#note(key, str);
    return (
      `<text x="${n(x)}" y="${n(y)}" font-family="${f.family}, 'SF Pro Text', -apple-system, 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif"` +
      ` font-weight="${f.weight}" font-size="${n(size)}" fill="${fill}"` +
      (anchor === "start" ? "" : ` text-anchor="${anchor}"`) +
      (opacity == null ? "" : ` opacity="${opacity}"`) +
      (cls ? ` class="${cls}"` : "") +
      (ls ? ` letter-spacing="${n(ls)}"` : "") +
      (extra ? " " + extra : "") +
      `>${esc(str)}</text>`
    );
  }

  /** Emoji-only glyph: skip the embedded face entirely. */
  emoji(str, { x, y, size, anchor = "start", opacity } = {}) {
    return (
      `<text x="${n(x)}" y="${n(y)}" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"` +
      ` font-size="${n(size)}"` +
      (anchor === "start" ? "" : ` text-anchor="${anchor}"`) +
      (opacity == null ? "" : ` opacity="${opacity}"`) +
      `>${esc(str)}</text>`
    );
  }

  /** Build the @font-face block, subsetting each face to the glyphs used. */
  async #fontCss() {
    const faces = [];
    for (const [key, chars] of this.used) {
      const f = font(key);
      const text = [...chars].join("");
      if (!text) continue;
      let buf;
      try {
        buf = await subsetFont(f.buf, text, { targetFormat: "woff2" });
      } catch {
        buf = f.buf; // subsetting failed: ship the full face rather than break
      }
      faces.push(
        `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};` +
          `src:url(data:font/woff2;base64,${buf.toString("base64")}) format('woff2');}`,
      );
    }
    return faces.join("");
  }

  async render(height) {
    const css = (await this.#fontCss()) + this.css;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${n(this.width)}" height="${n(height)}" ` +
      `viewBox="0 0 ${n(this.width)} ${n(height)}" fill="none" role="img">` +
      `<style>${css}</style>` +
      (this.defs.length ? `<defs>${this.defs.join("")}</defs>` : "") +
      this.parts.join("") +
      `</svg>`
    );
  }
}
