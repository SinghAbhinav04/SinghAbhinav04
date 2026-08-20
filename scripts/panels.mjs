/**
 * The panels themselves.
 *
 * Two rules hold everywhere in this file:
 *
 *  1. Nothing is drawn that cannot be clicked. There are no decorative search
 *     fields, back buttons or toolbar chips — a control on screen is either the
 *     link target of its own slice or it does not exist.
 *  2. Every string is measured against the space it has before it is drawn.
 *     `ellipsize` and `wrap` take an explicit budget; no text is emitted
 *     without one.
 *
 * Windows taller than a single README image are drawn *in full* by each of
 * their slices at a negative y offset — the SVG viewport does the cutting, so
 * one window can span several independently-linkable images and stay
 * continuous across the seams.
 */
import {
  C,
  LANG,
  n,
  rect,
  rrect,
  rpath,
  hline,
  circle,
  measure,
  midline,
  topline,
  ellipsize,
  wrap,
  linearGradient,
} from "./theme.mjs";
import { win, glyph, brandIcon, brand, pill, menuBar, dock } from "./chrome.mjs";
import { CONFIG, LAYOUT } from "./config.mjs";
import { compact } from "./data.mjs";

const W = LAYOUT.width;
const M = 22; // wallpaper margin around a window
const WIN_W = W - M * 2; // 896
const BAR = LAYOUT.titlebar;

/* ------------------------------------------------------------------ helpers */

const monogram = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

/** Blend two #rrggbb colours; `t` is how far toward `b`. */
function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    "#" +
    pa
      .map((v, i) => Math.round(v + (pb[i] - v) * t))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Brand colours are tuned for white backgrounds; nudge the extremes inward. */
function shade(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.22) return mix(hex, "#8a8a92", 0.45); // near-black marks
  if (lum > 0.86) return mix(hex, "#3a3a42", 0.3); // near-white marks
  return hex;
}

/** A tinted squircle app icon with a glyph or brand mark inside. */
function appIcon(doc, { x, y, size, tint, glyphName, brandSlug, ink = "#ffffff" }) {
  const g = linearGradient(doc, [
    [0, mix(tint, "#ffffff", 0.28)],
    [1, mix(tint, "#000000", 0.22)],
  ]);
  const r = size * 0.235;
  const inner = size * 0.54;
  return [
    `<path d="${rpath(x, y, size, size, r)}" fill="${g}"/>`,
    `<path d="${rpath(x + 0.5, y + 0.5, size - 1, size - 1, r - 0.5)}" fill="none" stroke="#ffffff" stroke-opacity="0.25"/>`,
    `<path d="${rpath(x + 2, y + 2, size - 4, size * 0.4, [r - 2, r - 2, size * 0.28, size * 0.28])}" fill="#ffffff" opacity="0.1"/>`,
    brandSlug
      ? brandIcon(brandSlug, { x: x + (size - inner) / 2, y: y + (size - inner) / 2, size: inner, fill: ink })
      : glyph(glyphName, { x: x + (size - inner) / 2, y: y + (size - inner) / 2, size: inner, fill: ink }),
  ].join("");
}

/** Small-caps section label used inside window bodies. */
function sectionLabel(doc, text, { x, y }) {
  return doc.text("ui6", text.toUpperCase(), { x, y: topline("ui6", 9.5, y), size: 9.5, fill: C.text4, ls: 0.7 });
}

/**
 * One text line, clamped to `max` px. Returns the y for the next line so
 * callers stack without hand-computing baselines.
 */
function line(doc, key, str, { x, y, size, fill, max, anchor, step }) {
  doc.add(doc.text(key, ellipsize(key, str, size, max), { x, y: topline(key, size, y), size, fill, anchor }));
  return y + (step ?? size * 1.45);
}

/** Wrapped paragraph, clamped to `max` px and `lines` rows. */
function para(doc, key, str, { x, y, size, fill, max, lines = 3, step }) {
  const rows = wrap(key, str, size, max, lines);
  const lh = step ?? size * 1.45;
  rows.forEach((row, i) => doc.add(doc.text(key, row, { x, y: topline(key, size, y + i * lh), size, fill })));
  return y + rows.length * lh;
}

/** The grey strip macOS puts at the bottom of a Finder window. */
function statusBar(doc, { x, y, w, h, text }) {
  doc.add(
    rect(x, y, w, h, "#ffffff", 'opacity="0.03"'),
    hline(x, y, w, C.hairline, 0.9),
    doc.text("ui", ellipsize("ui", text, 10.5, w - 32), {
      x: x + w / 2,
      y: midline("ui", 10.5, y, h),
      size: 10.5,
      fill: C.text4,
      anchor: "middle",
    }),
  );
}

/**
 * Turns one tall window into a run of images. Each slice draws the *whole*
 * window at a negative offset and lets the SVG viewport crop it, so the frame
 * and shadow stay continuous. The first slice carries the wallpaper margin
 * above the window and the last the margin below; the rest butt straight up
 * against their neighbours, which is why only slice 0 gets the `+M`.
 */
function sliceWindow(draw, cuts) {
  let consumed = 0;
  return cuts.map((cut, i) => {
    const top = i === 0 ? M : -consumed;
    consumed += cut.h;
    return {
      ...cut,
      h: cut.h + (i === 0 ? M : 0) + (i === cuts.length - 1 ? M : 0),
      draw: (doc) => draw(doc, top),
    };
  });
}

/* ----------------------------------------------------------------- menu bar */

export const MENU_H = 28;

const menuArgs = (data) => ({
  x: 0,
  y: 0,
  w: W,
  h: MENU_H,
  name: CONFIG.name,
  menus: CONFIG.menu.map((m) => m.label),
  right: data
    ? [
        { icon: "wifi", size: 15 },
        { icon: "battery", size: 17 },
        {
          text: data.generatedAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        },
      ]
    : [],
});

/** Draws the whole bar; each slice renders it shifted left by its own offset. */
export function menuStrip(doc, xOffset, data) {
  doc.add(`<g transform="translate(${n(-xOffset)},0)">`);
  menuBar(doc, menuArgs(data));
  doc.add(`</g>`);
}

/** Where to cut the bar so every title becomes its own clickable image. */
export function menuCuts() {
  const { items } = menuBar(null, { ...menuArgs(null), measureOnly: true });
  const profile = `https://github.com/${CONFIG.github}`;

  // The Apple mark and the name share the leading region.
  const starts = [
    { url: profile, alt: CONFIG.name, start: 0 },
    ...items.map((item, i) => ({ url: CONFIG.menu[i].url, alt: CONFIG.menu[i].label, start: item.x - 10 })),
  ];
  return starts.map((cut, i) => ({ ...cut, w: (starts[i + 1]?.start ?? W) - cut.start }));
}

/* --------------------------------------------------------------------- hero */

const HERO_WIN_H = 306;
export const HERO_H = 18 + HERO_WIN_H + 24;

export function hero(doc, data) {
  const body = win(doc, {
    x: M,
    y: 18,
    w: WIN_W,
    h: HERO_WIN_H,
    title: `${CONFIG.github.toLowerCase()} — zsh`,
    fill: "#161618",
  });

  const px = body.x + 30;
  const mono = 13.5;
  const lh = 23;
  // The monogram tile owns the right end of the window; text stops short of it.
  const tile = 116;
  const tx = body.x + body.w - 30 - tile;
  const textMax = tx - 34 - px;
  let ty = body.y + 28;

  const prompt = (label) => {
    const path = " ~ ";
    doc.add(
      doc.text("mono7", "➜", { x: px, y: topline("mono7", mono, ty), size: mono, fill: C.green }),
      doc.text("mono", path, { x: px + 16, y: topline("mono", mono, ty), size: mono, fill: C.teal }),
      doc.text("mono", label, {
        x: px + 16 + measure("mono", path, mono),
        y: topline("mono", mono, ty),
        size: mono,
        fill: C.text,
      }),
    );
  };

  prompt("whoami");
  ty += lh + 8;

  doc.add(doc.text("ui7", CONFIG.name, { x: px, y: topline("ui7", 44, ty), size: 44, fill: C.text, ls: -1.2 }));
  ty += 52;
  ty = line(doc, "ui5", CONFIG.role, { x: px, y: ty, size: 15, fill: C.text2, max: textMax, step: 32 });

  prompt("cat ~/.now");
  ty += lh;

  typeCycle(doc, {
    x: px,
    y: ty,
    size: mono,
    fill: C.pink,
    max: textMax,
    phrases: [
      "shipping event-driven services at Bajaj Finserv",
      "building agentic systems that remember",
      "Java · Python · TypeScript · Rust",
      "5,000+ downloads on my memory layer",
    ],
  });
  ty += lh + 16;

  const badges = [
    { label: CONFIG.location, icon: "location", tint: C.text2 },
    { label: `${data.live.followers ?? "—"} followers`, icon: "person", tint: C.text2 },
    { label: `${data.live.stars ?? "—"} stars`, icon: "star", tint: C.yellow },
    { label: `${data.live.pypiDownloads ?? "5k+"} downloads`, icon: "arrowDown", tint: C.purple },
  ];
  let bx = px;
  for (const b of badges) bx += pill(doc, { x: bx, y: ty, ...b, h: 24, size: 11 }) + 8;

  const tyy = body.y + 30;
  doc.add(
    appIcon(doc, { x: tx, y: tyy, size: tile, tint: C.pink, glyphName: "terminal" }),
    doc.text("ui7", monogram(CONFIG.name), {
      x: tx + tile / 2,
      y: midline("ui7", 44, tyy, tile),
      size: 44,
      fill: "#ffffff",
      anchor: "middle",
      ls: -1,
    }),
    doc.text("ui5", "@" + CONFIG.github, {
      x: tx + tile / 2,
      y: topline("ui5", 11.5, tyy + tile + 13),
      size: 11.5,
      fill: C.text3,
      anchor: "middle",
    }),
  );

  const availY = tyy + tile + 36;
  const availText = "Available for work";
  const availW = measure("ui5", availText, 11) + 14;
  doc.add(
    circle(tx + tile / 2 - availW / 2 + 4, availY + 8, 3.5, C.green),
    doc.text("ui5", availText, {
      x: tx + tile / 2 - availW / 2 + 14,
      y: midline("ui5", 11, availY, 16),
      size: 11,
      fill: C.green,
    }),
  );
}

/** A terminal line that types itself out, cycling through `phrases` forever. */
function typeCycle(doc, { x, y, size, fill, phrases, per = 3.8, max }) {
  const total = phrases.length * per;
  const h = size * 1.5;
  phrases.forEach((raw, i) => {
    const phrase = ellipsize("mono", raw, size, max);
    const w = measure("mono", phrase, size);
    const id = `t${i}_${Math.round(y)}`;
    const t0 = (i * per) / total;
    const t1 = (i * per + 1.2) / total;
    const t2 = ((i + 1) * per - 0.6) / total;
    const t3 = ((i + 1) * per - 0.25) / total;
    const keyTimes = `0;${t0.toFixed(4)};${t1.toFixed(4)};${t2.toFixed(4)};${t3.toFixed(4)};1`;

    doc.def(
      `<clipPath id="${id}"><rect x="${n(x)}" y="${n(y - 2)}" height="${n(h)}" width="0">` +
        `<animate attributeName="width" values="0;0;${n(w)};${n(w)};0;0" keyTimes="${keyTimes}" dur="${total}s" repeatCount="indefinite"/>` +
        `</rect></clipPath>`,
    );
    doc.add(
      `<g clip-path="url(#${id})">` +
        doc.text("mono", phrase, { x, y: topline("mono", size, y), size, fill }) +
        `</g>`,
    );
    doc.add(
      `<rect x="${n(x)}" y="${n(y)}" width="8" height="${n(size * 1.15)}" fill="${C.text}" opacity="0">` +
        `<animate attributeName="x" values="${n(x)};${n(x)};${n(x + w)};${n(x + w)};${n(x)};${n(x)}" keyTimes="${keyTimes}" dur="${total}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;${t0.toFixed(4)};${t3.toFixed(4)};1" dur="${total}s" repeatCount="indefinite"/>` +
        `</rect>`,
    );
  });
}

/* -------------------------------------------------------------------- about */

const ABOUT_GAP = 16;
const ABOUT_LEFT_W = Math.round((WIN_W - ABOUT_GAP) * 0.56);
const ABOUT_RIGHT_W = WIN_W - ABOUT_GAP - ABOUT_LEFT_W;

/**
 * Height of the Now column, walked in the same increments the draw uses. Both
 * columns are measured rather than guessed, so a longer `openTo` string or a
 * fourth Learning row grows the window instead of spilling out of it.
 */
function nowBodyHeight() {
  const bw = ABOUT_RIGHT_W - 44;
  let y = 18;
  y += 20 + 19; // "Building" label, then the title row
  y += wrap("ui", CONFIG.now.buildingNote, 11, bw - 22, 2).length * 15;
  y += 12 + 14; // gap, rule, gap
  y += 20 + CONFIG.now.learning.length * 24;
  y += 4 + 14;
  y += 20 + wrap("ui5", CONFIG.now.openTo, 11.5, bw, 3).length * 17;
  return y + 18;
}

const ABOUT_BODY_H = Math.max(
  nowBodyHeight(),
  22 + 88 + 22 + CONFIG.specs.length * 22 + 16, // avatar block, then the spec table
);
export const ABOUT_H = M * 2 + BAR + ABOUT_BODY_H;

export function about(doc) {
  const gap = ABOUT_GAP;
  const leftW = ABOUT_LEFT_W;
  const rightW = ABOUT_RIGHT_W;
  const h = ABOUT_H - M * 2;

  /* --- About This Developer -------------------------------------------- */
  const a = win(doc, { x: M, y: M, w: leftW, h, title: "About This Developer" });

  const tile = 88;
  const tx = a.x + 28;
  const ty = a.y + 22;
  doc.add(
    appIcon(doc, { x: tx, y: ty, size: tile, tint: C.indigo, glyphName: "person" }),
    doc.text("ui7", monogram(CONFIG.name), {
      x: tx + tile / 2,
      y: midline("ui7", 32, ty, tile),
      size: 32,
      fill: "#ffffff",
      anchor: "middle",
    }),
  );

  const cx = tx + tile + 22;
  const cw = a.x + a.w - 28 - cx;
  let cy = ty + 2;
  cy = line(doc, "ui7", CONFIG.name, { x: cx, y: cy, size: 21, fill: C.text, max: cw, step: 27 });
  cy = line(doc, "ui5", CONFIG.role, { x: cx, y: cy, size: 12, fill: C.text2, max: cw, step: 19 });
  para(doc, "ui", CONFIG.tagline, { x: cx, y: cy, size: 11.5, fill: C.text3, max: cw, lines: 3, step: 16 });

  // spec table — the label column is measured, never assumed
  let sy = ty + tile + 22;
  const labelW = Math.max(...CONFIG.specs.map(([label]) => measure("ui5", label, 11.5)));
  const valueX = tx + labelW + 16;
  const valueMax = a.x + a.w - 28 - valueX;
  for (const [label, value] of CONFIG.specs) {
    doc.add(
      doc.text("ui5", label, {
        x: tx + labelW,
        y: midline("ui5", 11.5, sy, 20),
        size: 11.5,
        fill: C.text3,
        anchor: "end",
      }),
      doc.text("ui5", ellipsize("ui5", value, 11.5, valueMax), {
        x: valueX,
        y: midline("ui5", 11.5, sy, 20),
        size: 11.5,
        fill: C.text,
      }),
    );
    sy += 22;
  }

  /* --- Now -------------------------------------------------------------- */
  const rx = M + leftW + gap;
  const b = win(doc, { x: rx, y: M, w: rightW, h, title: "Now", subtitle: "Reminders", tint: C.orange });

  const bx = b.x + 22;
  const bw = b.w - 44;
  let ny = b.y + 18;

  doc.add(sectionLabel(doc, "Building", { x: bx, y: ny }));
  ny += 20;
  doc.add(
    circle(bx + 7, ny + 8, 7, "none", `stroke="${C.pink}" stroke-width="1.6"`),
    circle(bx + 7, ny + 8, 3.4, C.pink),
  );
  line(doc, "ui6", CONFIG.now.building, { x: bx + 22, y: ny + 1, size: 13, fill: C.text, max: bw - 22 });
  ny += 19;
  ny = para(doc, "ui", CONFIG.now.buildingNote, {
    x: bx + 22,
    y: ny,
    size: 11,
    fill: C.text3,
    max: bw - 22,
    lines: 2,
    step: 15,
  });
  ny += 12;

  doc.add(hline(bx, ny, bw, C.hairline, 0.8));
  ny += 14;
  doc.add(sectionLabel(doc, "Learning", { x: bx, y: ny }));
  ny += 20;
  for (const item of CONFIG.now.learning) {
    doc.add(circle(bx + 7, ny + 8, 7, "none", `stroke="${C.text4}" stroke-width="1.5"`));
    doc.add(
      doc.text("ui5", ellipsize("ui5", item, 11.5, bw - 24), {
        x: bx + 22,
        y: midline("ui5", 11.5, ny, 16),
        size: 11.5,
        fill: C.text2,
      }),
    );
    ny += 24;
  }

  ny += 4;
  doc.add(hline(bx, ny, bw, C.hairline, 0.8));
  ny += 14;
  doc.add(sectionLabel(doc, "Open to", { x: bx, y: ny }));
  ny += 20;
  para(doc, "ui5", CONFIG.now.openTo, { x: bx, y: ny, size: 11.5, fill: C.green, max: bw, lines: 3, step: 17 });
}

/* --------------------------------------------------------------- experience */

/** Body height of the Experience window, measured off the real bullet text. */
function expBodyHeight() {
  const bw = WIN_W - 70; // matches the bullet column computed in the draw
  let y = 22 + 54 + 16; // top pad, company tile, gap
  for (const bullet of CONFIG.experience[0].bullets) {
    y += wrap("ui", bullet, 11.5, bw, 2).length * 16 + 7;
  }
  return y + 38; // room for the stack pills and the bottom margin
}

export const EXP_H = M * 2 + BAR + expBodyHeight();

export function experience(doc) {
  const job = CONFIG.experience[0];
  const h = EXP_H - M * 2;
  const body = win(doc, { x: M, y: M, w: WIN_W, h, title: "Experience", subtitle: job.company, tint: C.blue });

  const tile = 54;
  const tx = body.x + 26;
  const ty = body.y + 22;
  doc.add(
    appIcon(doc, { x: tx, y: ty, size: tile, tint: job.tint, glyphName: "chart" }),
    doc.text("ui7", job.short, {
      x: tx + tile / 2,
      y: midline("ui7", 15, ty, tile),
      size: 15,
      fill: "#ffffff",
      anchor: "middle",
    }),
  );

  const periodW = measure("ui6", job.period, 12) + 20;
  const hx = tx + tile + 20;
  const hw = body.x + body.w - 26 - hx;
  let hy = ty + 1;
  hy = line(doc, "ui7", job.role, { x: hx, y: hy, size: 17, fill: C.text, max: hw - periodW, step: 23 });
  line(doc, "ui5", `${job.company} · ${job.place}`, { x: hx, y: hy, size: 12, fill: C.text2, max: hw - periodW });
  doc.add(
    doc.text("ui6", job.period, {
      x: body.x + body.w - 26,
      y: midline("ui6", 12, ty + 1, 23),
      size: 12,
      fill: job.tint,
      anchor: "end",
    }),
  );

  // bullets — each wrapped inside the column it actually has
  let by = ty + tile + 16;
  const bx = tx + 4;
  const bw = body.x + body.w - 26 - bx - 14;
  for (const bullet of job.bullets) {
    doc.add(circle(bx + 3, by + 6, 2.6, job.tint));
    by = para(doc, "ui", bullet, { x: bx + 14, y: by, size: 11.5, fill: C.text2, max: bw, lines: 2, step: 16 }) + 7;
  }

  let px = bx;
  const py = body.y + body.h - 32;
  for (const tech of job.stack)
    px += pill(doc, { x: px, y: py, label: tech, size: 10, h: 19, padX: 8, tint: C.text3 }) + 7;
}

/* ---------------------------------------------------------------- launchpad */

const TILE = 50;
const PITCH = 66;
const GROUP_H = 20 + TILE + 8 + 13 + 20;
export const STACK_H = M * 2 + BAR + 16 + Math.ceil(CONFIG.stack.length / 2) * GROUP_H + 8;

export function stack(doc) {
  const h = STACK_H - M * 2;
  const body = win(doc, { x: M, y: M, w: WIN_W, h, title: "Launchpad", subtitle: "The stack he actually ships with" });

  const colW = (body.w - 44) / 2;

  CONFIG.stack.forEach((group, gi) => {
    const col = gi % 2;
    const row = Math.floor(gi / 2);
    const gx = body.x + 22 + col * colW;
    const gy = body.y + 12 + row * GROUP_H;

    doc.add(sectionLabel(doc, group.group, { x: gx + 3, y: gy }));

    group.items.forEach((item, i) => {
      const entry = item.slug ? brand(item.slug) : null;
      const label = item.label ?? entry.title;
      const tint = item.hex ?? shade("#" + entry.hex);
      const x = gx + i * PITCH;
      const y = gy + 20;
      doc.add(
        appIcon(doc, { x, y, size: TILE, tint, brandSlug: item.slug, glyphName: item.glyph, ink: "#ffffff" }),
        doc.text("ui5", ellipsize("ui5", label, 9.5, PITCH - 4), {
          x: x + TILE / 2,
          y: topline("ui5", 9.5, y + TILE + 9),
          size: 9.5,
          fill: C.text2,
          anchor: "middle",
        }),
      );
    });
  });
}

/* ----------------------------------------------------------------- projects */

const PROJ_HEADROW = 28;
const PROJ_ROW = 100;
const PROJ_MORE = 36;
const PROJ_STATUS = 28;

// Right-hand columns, measured back from the window's right edge.
const COL_LANG = 300;
const COL_STARS = 176;
const COL_UPDATED = 108;
const COL_CHEVRON = 26;
const TEXT_GUTTER = 318; // where the name/description column has to stop

export function projectsWindow(data) {
  const featured = CONFIG.featured;
  const more = CONFIG.moreProjects;
  const headH = BAR + PROJ_HEADROW;
  const footH = 26 + more.length * PROJ_MORE + 10 + PROJ_STATUS;
  const winH = headH + featured.length * PROJ_ROW + footH;

  const draw = (doc, top) => {
    const body = win(doc, {
      x: M,
      y: top,
      w: WIN_W,
      h: winH,
      title: "Projects",
      subtitle: `${featured.length + more.length} items · tap a row to open its live demo`,
    });

    const hy = top + BAR;
    doc.add(
      rect(body.x, hy, body.w, PROJ_HEADROW, "#ffffff", 'opacity="0.025"'),
      hline(body.x, hy + PROJ_HEADROW - 1, body.w, C.hairline, 0.9),
    );
    for (const [label, cx] of [
      ["Name", body.x + 22],
      ["Language", body.x + body.w - COL_LANG],
      ["Stars", body.x + body.w - COL_STARS],
      ["Updated", body.x + body.w - COL_UPDATED],
    ])
      doc.add(
        doc.text("ui5", label, { x: cx, y: midline("ui5", 10.5, hy, PROJ_HEADROW), size: 10.5, fill: C.text4 }),
      );

    let ry = hy + PROJ_HEADROW;
    featured.forEach((p, i) => {
      projectRow(doc, { x: body.x, y: ry, w: body.w, h: PROJ_ROW, project: p, data, zebra: i % 2 === 1 });
      ry += PROJ_ROW;
    });

    doc.add(sectionLabel(doc, "Also on the shelf", { x: body.x + 22, y: ry + 9 }));
    ry += 26;
    for (const item of more) {
      const repo = data.gh?.byName.get(item.repo.toLowerCase());
      const nameX = body.x + 46;
      const noteX = nameX + measure("ui5", item.repo, 12) + 14;
      const noteMax = body.x + body.w - TEXT_GUTTER - noteX;
      doc.add(
        glyph("folder", { x: body.x + 22, y: ry + 10, size: 16, fill: C.blue, opacity: 0.85 }),
        doc.text("ui5", item.repo, { x: nameX, y: midline("ui5", 12, ry, PROJ_MORE), size: 12, fill: C.text2 }),
        doc.text("ui", ellipsize("ui", item.note, 11, noteMax), {
          x: noteX,
          y: midline("ui", 11, ry, PROJ_MORE),
          size: 11,
          fill: C.text4,
        }),
      );
      if (repo?.primaryLanguage)
        langDot(doc, { x: body.x + body.w - COL_LANG, cy: ry + PROJ_MORE / 2, lang: repo.primaryLanguage.name });
      if (repo)
        doc.add(
          doc.text("ui", String(repo.stargazerCount), {
            x: body.x + body.w - COL_STARS,
            y: midline("ui", 11, ry, PROJ_MORE),
            size: 11,
            fill: C.text4,
          }),
          doc.text("ui", ago(repo.pushedAt), {
            x: body.x + body.w - COL_UPDATED,
            y: midline("ui", 11, ry, PROJ_MORE),
            size: 11,
            fill: C.text4,
          }),
        );
      ry += PROJ_MORE;
    }

    statusBar(doc, {
      x: body.x,
      y: top + winH - PROJ_STATUS,
      w: body.w,
      h: PROJ_STATUS,
      text: `${data.live.repos ?? "32"} repositories · ${data.live.stars ?? "—"} stars`,
    });
  };

  const repoTab = `https://github.com/${CONFIG.github}?tab=repositories`;
  return sliceWindow(draw, [
    { file: "projects-head.svg", h: headH, url: repoTab, alt: "Projects" },
    ...featured.map((p) => ({
      file: `project-${p.repo.toLowerCase()}.svg`,
      h: PROJ_ROW,
      url: `${CONFIG.pages}/${p.demo}.html`,
      alt: `${p.name} — ${p.tagline} (interactive demo)`,
    })),
    { file: "projects-foot.svg", h: footH, url: repoTab, alt: "More projects" },
  ]);
}

function projectRow(doc, { x, y, w, h, project, data, zebra }) {
  const repo = data.gh?.byName.get(project.repo.toLowerCase());
  if (zebra) doc.add(rect(x, y, w, h, "#ffffff", 'opacity="0.018"'));
  doc.add(hline(x, y + h - 1, w, C.hairline, 0.55));

  const size = 46;
  const ix = x + 22;
  doc.add(appIcon(doc, { x: ix, y: y + 20, size, tint: project.tint, glyphName: project.icon }));

  const tx = ix + size + 18;
  const textMax = x + w - TEXT_GUTTER - tx;
  let ty = y + 15;
  // Display name first, then the repository it actually ships as — several of
  // these differ (Vault lives in `make-it-personal`) and hiding that is unkind
  // to anyone trying to find the source.
  const nameW = Math.min(measure("ui6", project.name, 14.5), textMax);
  doc.add(
    doc.text("ui6", ellipsize("ui6", project.name, 14.5, textMax), {
      x: tx,
      y: topline("ui6", 14.5, ty),
      size: 14.5,
      fill: C.text,
    }),
    doc.text("mono", ellipsize("mono", project.repo, 10.5, textMax - nameW - 12), {
      x: tx + nameW + 12,
      y: topline("ui6", 14.5, ty),
      size: 10.5,
      fill: C.text4,
    }),
  );
  ty += 21;
  ty = line(doc, "ui", project.tagline, { x: tx, y: ty, size: 11.5, fill: C.text2, max: textMax, step: 17 });
  line(doc, "ui", project.blurb, { x: tx, y: ty, size: 10.5, fill: C.text4, max: textMax });

  // Tags sit in their own band at the bottom of the row and stop at the same
  // gutter, so they can never slide under the Language column.
  const pxLimit = x + w - TEXT_GUTTER;
  let px = tx;
  const py = y + h - 27;
  for (const tag of project.tags) {
    if (px + measure("ui5", tag, 9.5) + 14 > pxLimit) break;
    px += pill(doc, { x: px, y: py, label: tag, size: 9.5, h: 17, padX: 7, tint: C.text3 }) + 6;
  }
  if (project.badge === "pypi" && data.live.pypiDownloads) {
    const label = `${data.live.pypiDownloads} downloads`;
    if (px + measure("ui5", label, 9.5) + 29 <= pxLimit)
      pill(doc, { x: px, y: py, label, size: 9.5, h: 17, padX: 7, icon: "arrowDown", tint: C.purple });
  }

  const cy = y + h / 2;
  if (repo?.primaryLanguage) langDot(doc, { x: x + w - COL_LANG, cy, lang: repo.primaryLanguage.name });
  doc.add(
    glyph("star", { x: x + w - COL_STARS - 2, y: cy - 6, size: 12, fill: C.yellow }),
    doc.text("ui5", String(repo?.stargazerCount ?? 0), {
      x: x + w - COL_STARS + 14,
      y: midline("ui5", 11.5, cy - 8, 16),
      size: 11.5,
      fill: C.text2,
    }),
    doc.text("ui", repo ? ago(repo.pushedAt) : "—", {
      x: x + w - COL_UPDATED,
      y: midline("ui", 11.5, cy - 8, 16),
      size: 11.5,
      fill: C.text3,
    }),
    glyph("chevron", { x: x + w - COL_CHEVRON, y: cy - 6, size: 12, fill: C.text4 }),
  );
}

function langDot(doc, { x, cy, lang }) {
  doc.add(
    circle(x + 5, cy, 5, LANG[lang] ?? LANG.Other),
    doc.text("ui", ellipsize("ui", lang, 11.5, COL_LANG - COL_STARS - 30), {
      x: x + 16,
      y: midline("ui", 11.5, cy - 8, 16),
      size: 11.5,
      fill: C.text3,
    }),
  );
}

function ago(iso) {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months} mo ago`;
  return `${Math.round(days / 365)} yr ago`;
}

/* ------------------------------------------------------------- achievements */

const TILE_H = 96;
const CERT_ROW = 38;

export function achievementsWindow(data) {
  const certs = CONFIG.achievements.certificates;
  const headH = BAR + 18 + TILE_H + 20;
  const footH = 24 + certs.length * CERT_ROW + 12 + PROJ_STATUS;
  const winH = headH + footH;

  const draw = (doc, top) => {
    const body = win(doc, {
      x: M,
      y: top,
      w: WIN_W,
      h: winH,
      title: "Achievements",
      subtitle: "Milestones and certificates",
      tint: C.yellow,
    });

    const tiles = CONFIG.achievements.milestones;
    const pad = 24;
    const gap = 14;
    const tw = (body.w - pad * 2 - gap * (tiles.length - 1)) / tiles.length;
    const tyy = body.y + 18;
    tiles.forEach((tile, i) => {
      const tx = body.x + pad + i * (tw + gap);
      const value = data.live[tile.live] ?? tile.value;
      doc.add(
        rrect(tx, tyy, tw, TILE_H, 10, "#ffffff", 'opacity="0.045"'),
        `<path d="${rpath(tx + 0.5, tyy + 0.5, tw - 1, TILE_H - 1, 9.5)}" fill="none" stroke="${tile.tint}" stroke-opacity="0.35"/>`,
        rrect(tx, tyy, tw, 3, [3, 3, 0, 0], tile.tint, 'opacity="0.8"'),
        doc.text("ui7", value, { x: tx + 18, y: topline("ui7", 32, tyy + 22), size: 32, fill: C.text, ls: -1 }),
      );
      const inner = tw - 36;
      line(doc, "ui6", tile.label, { x: tx + 18, y: tyy + 62, size: 11.5, fill: tile.tint, max: inner, step: 17 });
      line(doc, "ui", tile.sub, { x: tx + 18, y: tyy + 79, size: 10, fill: C.text4, max: inner });
    });

    let cy = top + headH;
    doc.add(sectionLabel(doc, `Certificates · ${certs.length} files`, { x: body.x + 24, y: cy + 6 }));
    cy += 24;
    const titleMax = body.w - 24 - 50 - 190;
    certs.forEach((cert, i) => {
      if (i % 2 === 1) doc.add(rect(body.x, cy, body.w, CERT_ROW, "#ffffff", 'opacity="0.018"'));
      doc.add(
        glyph("pdf", { x: body.x + 24, y: cy + 9, size: 18, fill: C.red, opacity: 0.85 }),
        doc.text("ui5", ellipsize("ui5", cert.title, 12, titleMax), {
          x: body.x + 50,
          y: midline("ui5", 12, cy, CERT_ROW),
          size: 12,
          fill: C.text,
        }),
        doc.text("ui", ellipsize("ui", cert.issuer, 11, 150), {
          x: body.x + body.w - 46,
          y: midline("ui", 11, cy, CERT_ROW),
          size: 11,
          fill: C.text3,
          anchor: "end",
        }),
        glyph("chevron", { x: body.x + body.w - 26, y: cy + CERT_ROW / 2 - 6, size: 12, fill: C.text4 }),
      );
      cy += CERT_ROW;
    });

    statusBar(doc, {
      x: body.x,
      y: top + winH - PROJ_STATUS,
      w: body.w,
      h: PROJ_STATUS,
      text: `${certs.length} certificates · originals in the Certificates repository`,
    });
  };

  return sliceWindow(draw, [
    {
      file: "achievements.svg",
      h: headH,
      url: `https://github.com/${CONFIG.github}`,
      alt: "Achievements and milestones",
    },
    {
      file: "certificates.svg",
      h: footH,
      url: `https://github.com/${CONFIG.github}/${CONFIG.achievements.certificatesRepo}`,
      alt: "Certificates",
    },
  ]);
}

/* ------------------------------------------------------------------- résumé */

export const RESUME_H = 334;

export function resume(doc) {
  const h = RESUME_H - M * 2;
  const body = win(doc, {
    x: M,
    y: M,
    w: WIN_W,
    h,
    title: CONFIG.resume.file,
    subtitle: `Preview · updated ${CONFIG.resume.updated}`,
  });

  // The paper, in A4 proportions.
  const paperH = body.h - 36;
  const paperW = Math.round(paperH * 0.707);
  const paperX = body.x + 32;
  const paperY = body.y + 18;
  doc.add(
    `<path d="${rpath(paperX, paperY, paperW, paperH, 3)}" fill="#f7f7f5" filter="url(#wsh)"/>`,
    rect(paperX, paperY, paperW, 4, C.pink),
  );

  // A real miniature of the document rather than placeholder bars.
  const ppx = paperX + 16;
  const ppw = paperW - 32;
  doc.add(
    doc.text("ui7", ellipsize("ui7", CONFIG.name, 13, ppw), {
      x: ppx,
      y: topline("ui7", 13, paperY + 18),
      size: 13,
      fill: "#15151a",
    }),
    doc.text("ui5", ellipsize("ui5", CONFIG.role, 6.5, ppw), {
      x: ppx,
      y: topline("ui5", 6.5, paperY + 36),
      size: 6.5,
      fill: "#6a6a72",
    }),
    hline(ppx, paperY + 47, ppw, "#d8d8d4"),
  );
  let ly = paperY + 56;
  for (const section of CONFIG.resume.sections) {
    doc.add(
      doc.text("ui6", section.head.toUpperCase(), {
        x: ppx,
        y: topline("ui6", 6, ly),
        size: 6,
        fill: "#9a9aa2",
        ls: 0.4,
      }),
    );
    ly += 11;
    for (const [primary, secondary] of section.rows) {
      doc.add(
        doc.text("ui6", ellipsize("ui6", primary, 6.8, ppw), {
          x: ppx,
          y: topline("ui6", 6.8, ly),
          size: 6.8,
          fill: "#2a2a30",
        }),
      );
      ly += 9;
      if (secondary) {
        doc.add(
          doc.text("ui", ellipsize("ui", secondary, 6, ppw), {
            x: ppx,
            y: topline("ui", 6, ly),
            size: 6,
            fill: "#7c7c86",
          }),
        );
        ly += 9;
      }
    }
    ly += 8;
  }

  /* --- highlights + the download button -------------------------------- */
  const hx = paperX + paperW + 32;
  const hw = body.x + body.w - 30 - hx;
  let hy = body.y + 22;
  doc.add(sectionLabel(doc, "Highlights", { x: hx, y: hy }));
  hy += 22;
  for (const highlight of CONFIG.resume.highlights) {
    doc.add(glyph("circleCheck", { x: hx, y: hy + 1, size: 14, fill: C.green, opacity: 0.9 }));
    hy =
      para(doc, "ui5", highlight, { x: hx + 22, y: hy, size: 12, fill: C.text2, max: hw - 24, lines: 2, step: 17 }) + 9;
  }

  // The one button on the page — and it is the link target of this whole slice.
  const btnW = 178;
  const btnH = 30;
  const btnY = body.y + body.h - btnH - 20;
  doc.add(
    rrect(hx, btnY, btnW, btnH, 7, C.blue),
    `<path d="${rpath(hx + 0.5, btnY + 0.5, btnW - 1, btnH - 1, 6.5)}" fill="none" stroke="#ffffff" stroke-opacity="0.22"/>`,
    glyph("arrowDown", { x: hx + 16, y: btnY + 8, size: 14, fill: "#ffffff" }),
    doc.text("ui6", "Download résumé (PDF)", {
      x: hx + 38,
      y: midline("ui6", 11.5, btnY, btnH),
      size: 11.5,
      fill: "#ffffff",
    }),
  );
}

/* -------------------------------------------------------------------- stats */

export const STATS_H = 268;

export function stats(doc, data) {
  const gap = 16;
  const leftW = Math.round((WIN_W - gap) * 0.52);
  const rightW = WIN_W - gap - leftW;
  const h = STATS_H - M * 2;
  const gh = data.gh;

  /* --- Activity Monitor ------------------------------------------------- */
  const a = win(doc, { x: M, y: M, w: leftW, h, title: "Activity Monitor", subtitle: "Last 12 months", tint: C.green });

  const cells = [
    { label: "Commits", value: gh ? compact(gh.commits) : "—", icon: "code", tint: C.green },
    { label: "Contributions", value: gh ? compact(gh.contributions) : "—", icon: "bolt", tint: C.orange },
    { label: "Pull requests", value: gh ? String(gh.prs) : "—", icon: "fork", tint: C.purple },
    { label: "Stars earned", value: gh ? String(gh.stars) : "—", icon: "star", tint: C.yellow },
    { label: "Repositories", value: gh ? String(gh.repoCount) : "—", icon: "package", tint: C.blue },
    { label: "Longest streak", value: gh ? `${gh.streak.best}d` : "—", icon: "flame", tint: C.pink },
  ];
  const cw = (a.w - 48) / 3;
  const ch = 74;
  cells.forEach((cell, i) => {
    const cx = a.x + 24 + (i % 3) * cw;
    const cy = a.y + 18 + Math.floor(i / 3) * (ch + 10);
    doc.add(
      rrect(cx, cy, cw - 10, ch, 9, "#ffffff", 'opacity="0.04"'),
      glyph(cell.icon, { x: cx + 14, y: cy + 13, size: 14, fill: cell.tint }),
      doc.text("ui7", cell.value, { x: cx + 14, y: topline("ui7", 22, cy + 33), size: 22, fill: C.text, ls: -0.6 }),
    );
    line(doc, "ui", cell.label, { x: cx + 14, y: cy + 60, size: 10, fill: C.text4, max: cw - 34 });
  });

  /* --- Language mix ------------------------------------------------------ */
  const rx = M + leftW + gap;
  const b = win(doc, { x: rx, y: M, w: rightW, h, title: "Languages", subtitle: "By bytes written", tint: C.blue });

  const langs = gh?.languages ?? [];
  const barX = b.x + 24;
  const barW = b.w - 48;
  const barY = b.y + 22;

  let lx = barX;
  doc.def(`<clipPath id="lb"><rect x="${n(barX)}" y="${n(barY)}" width="${n(barW)}" height="10" rx="5"/></clipPath>`);
  doc.add(`<g clip-path="url(#lb)">`);
  for (const lang of langs) {
    const seg = (lang.pct / 100) * barW;
    doc.add(rect(lx, barY, seg + 0.5, 10, LANG[lang.name] ?? LANG.Other));
    lx += seg;
  }
  doc.add(rect(lx, barY, Math.max(0, barX + barW - lx), 10, LANG.Other), `</g>`);

  let ly = barY + 24;
  const colW2 = barW / 2;
  langs.slice(0, 6).forEach((lang, i) => {
    const cx = barX + (i % 2) * colW2;
    const cy = ly + Math.floor(i / 2) * 24;
    doc.add(
      circle(cx + 5, cy + 8, 5, LANG[lang.name] ?? LANG.Other),
      doc.text("ui5", ellipsize("ui5", lang.name, 11.5, colW2 - 78), {
        x: cx + 16,
        y: midline("ui5", 11.5, cy, 16),
        size: 11.5,
        fill: C.text2,
      }),
      doc.text("ui", `${lang.pct.toFixed(1)}%`, {
        x: cx + colW2 - 22,
        y: midline("ui", 11, cy, 16),
        size: 11,
        fill: C.text4,
        anchor: "end",
      }),
    );
  });

  ly += Math.ceil(Math.min(langs.length, 6) / 2) * 24 + 6;
  doc.add(hline(barX, ly, barW, C.hairline, 0.8));
  ly += 16;
  for (const [label, value] of [
    ["Followers", gh ? String(gh.followers) : "—"],
    ["Forks of my work", gh ? String(gh.forks) : "—"],
  ]) {
    doc.add(
      doc.text("ui", label, { x: barX, y: midline("ui", 11.5, ly, 16), size: 11.5, fill: C.text3 }),
      doc.text("ui6", value, {
        x: barX + barW,
        y: midline("ui6", 11.5, ly, 16),
        size: 11.5,
        fill: C.text,
        anchor: "end",
      }),
    );
    ly += 20;
  }
}

/* ------------------------------------------------------------ contributions */

const CELL = 11;
const CELL_GAP = 3;
export const CONTRIB_H = M * 2 + BAR + 26 + 7 * (CELL + CELL_GAP) + 14 + 34 + 18;

export function contributions(doc, data) {
  const h = CONTRIB_H - M * 2;
  const gh = data.gh;
  const body = win(doc, {
    x: M,
    y: M,
    w: WIN_W,
    h,
    title: "Contribution Graph",
    subtitle: gh ? `${compact(gh.contributions)} contributions in the last year` : "",
    tint: C.green,
  });

  const weeks = gh?.weeks ?? [];
  const gridW = weeks.length * (CELL + CELL_GAP) - CELL_GAP;
  const gx = body.x + Math.max(24, (body.w - gridW) / 2);
  const gy = body.y + 26;

  const max = Math.max(1, ...weeks.flat().map((d) => d.contributionCount));
  const ramp = ["#1e1e21", "#0e4429", "#006d32", "#26a641", "#39d353"];
  const level = (count) => {
    if (!count) return ramp[0];
    const q = count / max;
    if (q <= 0.15) return ramp[1];
    if (q <= 0.35) return ramp[2];
    if (q <= 0.65) return ramp[3];
    return ramp[4];
  };

  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week[0];
    if (!first) return;
    const d = new Date(first.date);
    if (d.getMonth() !== lastMonth && d.getDate() <= 7) {
      lastMonth = d.getMonth();
      doc.add(
        doc.text("ui", d.toLocaleDateString("en-US", { month: "short" }), {
          x: gx + wi * (CELL + CELL_GAP),
          y: topline("ui", 9.5, gy - 14),
          size: 9.5,
          fill: C.text4,
        }),
      );
    }
    week.forEach((day) => {
      const di = new Date(day.date).getDay();
      doc.add(
        rrect(gx + wi * (CELL + CELL_GAP), gy + di * (CELL + CELL_GAP), CELL, CELL, 2.5, level(day.contributionCount)),
      );
    });
  });

  const fy = gy + 7 * (CELL + CELL_GAP) + 12;
  let lx = body.x + 24;
  doc.add(doc.text("ui", "Less", { x: lx, y: midline("ui", 10, fy, 16), size: 10, fill: C.text4 }));
  lx += measure("ui", "Less", 10) + 7;
  for (const color of ramp) {
    doc.add(rrect(lx, fy + 3, 10, 10, 2.5, color));
    lx += 13;
  }
  doc.add(doc.text("ui", "More", { x: lx, y: midline("ui", 10, fy, 16), size: 10, fill: C.text4 }));

  const facts = [
    {
      label: "Current streak",
      value: gh ? `${gh.streak.current} day${gh.streak.current === 1 ? "" : "s"}` : "—",
      tint: C.pink,
    },
    { label: "Longest streak", value: gh ? `${gh.streak.best} days` : "—", tint: C.orange },
    { label: "Busiest day", value: gh ? `${max} contributions` : "—", tint: C.green },
  ];
  let fx = body.x + body.w - 24;
  for (const fact of [...facts].reverse()) {
    fx -= Math.max(measure("ui6", fact.value, 11.5), measure("ui", fact.label, 10.5));
    doc.add(
      doc.text("ui6", fact.value, { x: fx, y: topline("ui6", 11.5, fy - 2), size: 11.5, fill: fact.tint }),
      doc.text("ui", fact.label, { x: fx, y: topline("ui", 10.5, fy + 14), size: 10.5, fill: C.text4 }),
    );
    fx -= 34;
  }
}

/* ------------------------------------------------------------------ connect */

export const CONNECT_H = 292;

export function connect(doc, data) {
  const gap = 16;
  const leftW = Math.round((WIN_W - gap) * 0.58);
  const rightW = WIN_W - gap - leftW;
  const h = CONNECT_H - M * 2;

  /* --- Contact card ------------------------------------------------------ */
  const a = win(doc, { x: M, y: M, w: leftW, h, title: "Contact Card", subtitle: CONFIG.name, tint: C.blue });

  const rows = [
    { icon: "mail", label: "email", value: CONFIG.email, tint: C.teal },
    { icon: "linkedin", label: "linkedin", value: `in/${CONFIG.linkedin}`, tint: "#4d9fe8" },
    { brandSlug: "github", label: "github", value: `@${CONFIG.github}`, tint: "#b9b9c2" },
    { brandSlug: "discord", label: "discord", value: "join the server", tint: "#7f8ff7" },
    { icon: "phone", label: "phone", value: CONFIG.phone, tint: C.green },
  ];
  const rx = a.x + 24;
  const rw = a.w - 48;
  // Derive the row pitch from the space the window really has, so adding a
  // sixth contact row can never push the last one through the bottom edge.
  const pad = 12;
  const step = (a.h - pad * 2) / rows.length;
  const rowH = step - 6;
  let ry = a.y + pad;
  for (const row of rows) {
    doc.add(
      rrect(rx, ry, rw, rowH, 8, "#ffffff", 'opacity="0.035"'),
      row.brandSlug
        ? brandIcon(row.brandSlug, { x: rx + 13, y: ry + 10, size: 16, fill: row.tint })
        : glyph(row.icon, { x: rx + 13, y: ry + 10, size: 16, fill: row.tint }),
      doc.text("ui", row.label, { x: rx + 42, y: midline("ui", 10.5, ry, rowH), size: 10.5, fill: C.text4 }),
      doc.text("ui5", ellipsize("ui5", row.value, 12, rw - 150), {
        x: rx + rw - 16,
        y: midline("ui5", 12, ry, rowH),
        size: 12,
        fill: C.text,
        anchor: "end",
      }),
    );
    ry += step;
  }

  /* --- Sticky note ------------------------------------------------------- */
  const nx = M + leftW + gap;
  const noteGrad = linearGradient(doc, [
    [0, "#ffe27a"],
    [1, "#f7c948"],
  ]);
  doc.add(
    `<path d="${rpath(nx, M + 8, rightW, h - 16, 6)}" fill="${noteGrad}" filter="url(#wsh)"/>`,
    `<path d="${rpath(nx, M + 8, rightW, 22, [6, 6, 0, 0])}" fill="#ffffff" opacity="0.35"/>`,
    doc.text("ui6", "Stickies", { x: nx + 14, y: midline("ui6", 10.5, M + 8, 22), size: 10.5, fill: "#8a6d1a" }),
    doc.text("ui", data.generatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), {
      x: nx + rightW - 14,
      y: midline("ui", 10, M + 8, 22),
      size: 10,
      fill: "#8a6d1a",
      anchor: "end",
    }),
  );

  let qy = M + 8 + 46;
  for (const row of wrap("ui6", `“${CONFIG.quote}”`, 16, rightW - 40, 5)) {
    doc.add(doc.text("ui6", row, { x: nx + 20, y: topline("ui6", 16, qy), size: 16, fill: "#3d3006" }));
    qy += 24;
  }

  doc.add(
    doc.text("ui5", `— ${CONFIG.name}`, {
      x: nx + rightW - 20,
      y: topline("ui5", 11.5, M + 8 + (h - 16) - 32),
      size: 11.5,
      fill: "#7a5f12",
      anchor: "end",
    }),
  );
}

/* --------------------------------------------------------------------- dock */

export const DOCK_H = 110;

/** Draws the whole Dock; each slice renders it shifted left by its own offset. */
export function dockStrip(doc, xOffset) {
  doc.add(`<g transform="translate(${n(-xOffset)},0)">`);
  const tileSize = 54;
  const gap = 14;
  const { tiles } = dock(doc, { x: 0, y: 8, w: W, h: DOCK_H - 32, items: CONFIG.dock, tileSize, gap });
  for (const tile of tiles) {
    doc.add(
      doc.text("ui5", ellipsize("ui5", tile.label, 10.5, tileSize + gap - 6), {
        x: tile.cx,
        y: topline("ui5", 10.5, DOCK_H - 22),
        size: 10.5,
        fill: "#ffffffcc",
        anchor: "middle",
      }),
    );
  }
  doc.add(`</g>`);
}
