/**
 * Assembles the README.
 *
 * The profile is one continuous macOS desktop cut into a stack of SVG images.
 * Every image is wrapped in a real <a> in README.md, so clicking a window, a
 * single project row, a menu title or a Dock icon opens the matching page
 * instead of the raw SVG — which is what GitHub does to any image that is not
 * already a link.
 *
 *   node scripts/build.mjs
 */
import { writeFile, readdir, unlink, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { Doc, esc, n } from "./theme.mjs";
import { wallpaper } from "./chrome.mjs";
import { CONFIG, LAYOUT } from "./config.mjs";
import { collect } from "./data.mjs";
import * as P from "./panels.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "assets");
const W = LAYOUT.width;

const profile = `https://github.com/${CONFIG.github}`;
const source = `${profile}/${CONFIG.github}`;
const repos = `${profile}?tab=repositories`;

/* -------------------------------------------------------------- the stack */

/**
 * The ordered list of slices. Each is `{ file, url, alt, h, draw }`; full-width
 * slices stack vertically, while slices flagged `inline` share one README line
 * with their neighbours (the menu bar and the Dock).
 */
function buildStack(data) {
  const stack = [];

  // The menu bar: one image per title, so every title is a working link.
  P.menuCuts().forEach((cut, i) => {
    stack.push({
      file: `menu-${i}.svg`,
      url: cut.url,
      alt: cut.alt,
      h: P.MENU_H,
      w: cut.w,
      xOffset: cut.start,
      inline: true,
      draw: (doc) => P.menuStrip(doc, cut.start, data),
    });
  });

  stack.push({
    file: "hero.svg",
    url: profile,
    alt: `${CONFIG.name} — ${CONFIG.role}`,
    h: P.HERO_H,
    draw: (doc) => P.hero(doc, data),
  });

  stack.push({
    file: "about.svg",
    url: source,
    alt: "About this developer, and what he is working on now",
    h: P.ABOUT_H,
    draw: (doc) => P.about(doc),
  });

  stack.push({
    file: "experience.svg",
    url: "https://www.linkedin.com/in/singhabhinav04/",
    alt: `${CONFIG.experience[0].role} at ${CONFIG.experience[0].company}`,
    h: P.EXP_H,
    draw: (doc) => P.experience(doc),
  });

  stack.push({
    file: "stack.svg",
    url: repos,
    alt: "Tech stack",
    h: P.STACK_H,
    draw: (doc) => P.stack(doc),
  });

  stack.push(...P.projectsWindow(data));

  stack.push({
    file: "resume.svg",
    url: `${source}/blob/main/${CONFIG.resume.file}`,
    alt: `Résumé — ${CONFIG.name}`,
    h: P.RESUME_H,
    draw: (doc) => P.resume(doc),
  });

  stack.push(...P.achievementsWindow(data));

  stack.push({
    file: "stats.svg",
    url: profile,
    alt: "Activity and language mix",
    h: P.STATS_H,
    draw: (doc) => P.stats(doc, data),
  });

  stack.push({
    file: "contributions.svg",
    url: profile,
    alt: "Contribution graph",
    h: P.CONTRIB_H,
    draw: (doc) => P.contributions(doc, data),
  });

  stack.push({
    file: "connect.svg",
    url: `mailto:${CONFIG.email}`,
    alt: "Contact card",
    h: P.CONNECT_H,
    draw: (doc) => P.connect(doc, data),
  });

  // The Dock: one drawing cut vertically, so each icon carries its own link.
  const dockW = W / CONFIG.dock.length;
  CONFIG.dock.forEach((item, i) => {
    stack.push({
      file: `dock-${item.id}.svg`,
      url: item.url,
      alt: item.label,
      h: P.DOCK_H,
      w: dockW,
      xOffset: i * dockW,
      inline: true,
      draw: (doc) => P.dockStrip(doc, i * dockW),
    });
  });

  return stack;
}

/* ------------------------------------------------------------------ render */

/**
 * Page position of every slice. The wallpaper gradient spans the whole README,
 * so each slice has to know where it sits; a run of `inline` slices shares one
 * row and is therefore counted once.
 */
function layout(stack) {
  const positions = new Array(stack.length);
  let pageH = 0;
  let i = 0;
  while (i < stack.length) {
    if (!stack[i].inline) {
      positions[i] = pageH;
      pageH += stack[i].h;
      i += 1;
      continue;
    }
    const start = i;
    let rowH = 0;
    while (i < stack.length && stack[i].inline) {
      rowH = Math.max(rowH, stack[i].h);
      i += 1;
    }
    for (let k = start; k < i; k++) positions[k] = pageH;
    pageH += rowH;
  }
  return { positions, pageH };
}

async function render(stack) {
  const { positions, pageH } = layout(stack);

  const out = [];
  for (const [i, s] of stack.entries()) {
    const width = s.w ?? W;
    const doc = new Doc(width);

    // Horizontally-sliced rows draw the full-width wallpaper shifted into view;
    // their own `draw` applies the matching translate to the content.
    if (s.xOffset != null) doc.add(`<g transform="translate(${n(-s.xOffset)},0)">`);
    wallpaper(doc, { w: s.xOffset != null ? W : width, h: s.h, pageY: positions[i], pageH });
    if (s.xOffset != null) doc.add(`</g>`);

    s.draw(doc);

    out.push({ ...s, svg: await doc.render(s.h), width });
  }
  return out;
}

/* ------------------------------------------------------------------ readme */

function readme(slices) {
  const lines = [];
  let run = [];

  const flush = () => {
    if (!run.length) return;
    // Widths are percentages of one shared row, and the tags are emitted with
    // no whitespace between them — that is what keeps the bar continuous.
    const total = run.reduce((sum, s) => sum + s.width, 0);
    lines.push(
      run
        .map((s) => {
          const pct = ((s.width / total) * 99.6).toFixed(3);
          return `<a href="${esc(s.url)}"><img src="assets/${s.file}" width="${pct}%" alt="${esc(s.alt)}"/></a>`;
        })
        .join(""),
    );
    run = [];
  };

  for (const s of slices) {
    if (s.inline) {
      run.push(s);
      continue;
    }
    flush();
    lines.push(`<a href="${esc(s.url)}"><img src="assets/${s.file}" width="100%" alt="${esc(s.alt)}"/></a>`);
  }
  flush();

  return `<div align="center">

${lines.join("\n")}

</div>

<!--
  This README is generated — do not edit it by hand.

  Edit scripts/config.mjs, then run:  npm run build

  The whole profile is one macOS desktop sliced into SVG images. Every slice is
  wrapped in a link, so clicking a window, a project row, a menu title or a Dock
  icon opens the matching page. Project rows open their interactive demo under
  docs/. .github/workflows/readme.yml refreshes the live numbers — stars,
  commits, PyPI downloads, contribution graph — every day.
-->
`;
}

/* -------------------------------------------------------------------- main */

const data = await collect();
const stack = buildStack(data);
const slices = await render(stack);

await mkdir(ASSETS, { recursive: true });

// Drop SVGs from an earlier run that this one no longer produces.
const keep = new Set(slices.map((s) => s.file));
for (const file of await readdir(ASSETS)) {
  if (file.endsWith(".svg") && !keep.has(file)) {
    await unlink(path.join(ASSETS, file));
    console.log(`  - ${file}`);
  }
}

let bytes = 0;
for (const s of slices) {
  await writeFile(path.join(ASSETS, s.file), s.svg);
  bytes += s.svg.length;
  console.log(
    `  ${s.file.padEnd(30)} ${String(Math.round(s.width)).padStart(4)}×${String(Math.round(s.h)).padEnd(4)} ${(s.svg.length / 1024).toFixed(1).padStart(6)} KB`,
  );
}

await writeFile(path.join(ROOT, "README.md"), readme(slices));
console.log(`\n${slices.length} slices · ${(bytes / 1024).toFixed(0)} KB total · README.md written`);
