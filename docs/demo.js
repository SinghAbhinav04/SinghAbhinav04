/**
 * Tiny timeline runner shared by the demo pages.
 *
 * A demo is an array of steps; each step is `{ at, run }` in milliseconds from
 * the start of the scene. `Scene` plays them, can be replayed, and cancels
 * cleanly so a restart never leaves stale timers running.
 */
export class Scene {
  constructor(steps, { loop = false, gap = 2600 } = {}) {
    this.steps = steps;
    this.loop = loop;
    this.gap = gap;
    this.timers = [];
    this.onstate = null;
  }

  get duration() {
    return this.steps.reduce((max, s) => Math.max(max, s.at), 0);
  }

  play() {
    this.stop();
    this.state("playing");
    for (const step of this.steps) {
      this.timers.push(setTimeout(step.run, step.at));
    }
    this.timers.push(
      setTimeout(() => {
        this.state("done");
        if (this.loop) this.timers.push(setTimeout(() => this.play(), this.gap));
      }, this.duration + 400),
    );
  }

  stop() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  state(value) {
    this.current = value;
    if (this.onstate) this.onstate(value);
  }
}

/** Types `text` into `el` one character at a time, resolving when done. */
export function type(el, text, { speed = 26, className = "" } = {}) {
  const span = document.createElement("span");
  if (className) span.className = className;
  el.appendChild(span);

  const caret = document.createElement("span");
  caret.className = "caret";
  el.appendChild(caret);

  let i = 0;
  return new Promise((resolve) => {
    const tick = () => {
      span.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, speed);
      else {
        caret.remove();
        resolve(span);
      }
    };
    tick();
  });
}

/** Appends a line of pre-rendered HTML to a terminal, scrolled into view. */
export function say(el, html, className = "") {
  const div = document.createElement("div");
  div.className = `fade ${className}`.trim();
  div.innerHTML = html;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  return div;
}

/** Wires a Replay button to a scene and keeps its label honest. */
export function replayButton(button, scene) {
  scene.onstate = (state) => {
    button.disabled = state === "playing";
    button.textContent = state === "playing" ? "Playing…" : "↻ Replay";
  };
  button.addEventListener("click", () => scene.play());
}

/** The clock in the fake menu bar, so the page does not look frozen. */
export function startClock(el) {
  const tick = () => {
    el.textContent = new Date().toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };
  tick();
  setInterval(tick, 20000);
}
