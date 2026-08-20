/**
 * Writes .preview.html — the built slices laid out the way GitHub stacks them,
 * inside a column the width of a real README. Open it to check the seams
 * between slices before pushing.
 *
 *   node scripts/preview.mjs && open .preview.html
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const md = await readFile(path.join(ROOT, "README.md"), "utf8");
const body = md.replace(/<!--[\s\S]*?-->/g, "").trim();

await writeFile(
  path.join(ROOT, ".preview.html"),
  `<!doctype html>
<meta charset="utf-8">
<title>README preview</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0d1117; font: 14px -apple-system, system-ui, sans-serif; color: #7d8590; }
  .toolbar { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center;
             padding: 10px 16px; background: #161b22; border-bottom: 1px solid #30363d; }
  .toolbar button { background: #21262d; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px;
                    padding: 4px 10px; font: inherit; cursor: pointer; }
  .toolbar button[aria-pressed="true"] { background: #1f6feb; border-color: #1f6feb; }
  .page { max-width: 872px; margin: 24px auto 80px; }
  .page.light { background: #fff; }
  .page.wide { max-width: 1012px; }
  img { display: inline-block; vertical-align: top; }
  .seams img { outline: 1px solid #ff000055; }
</style>
<div class="toolbar">
  <strong style="color:#e6edf3">README preview</strong>
  <button id="light" aria-pressed="false">Light page</button>
  <button id="wide" aria-pressed="false">Wide layout</button>
  <button id="seams" aria-pressed="false">Show slice seams</button>
  <span id="info"></span>
</div>
<div class="page" id="page" align="center">
${body}
</div>
<script>
  const page = document.getElementById("page");
  for (const id of ["light", "wide", "seams"]) {
    const btn = document.getElementById(id);
    btn.onclick = () => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      page.classList.toggle(id, on);
    };
  }
  addEventListener("load", () => {
    document.getElementById("info").textContent =
      document.images.length + " slices · " + Math.round(page.getBoundingClientRect().height) + "px tall";
  });
</script>
`,
);

console.log("wrote .preview.html");
