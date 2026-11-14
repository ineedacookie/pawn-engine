import { DIRECTIONS } from "./pawn-engine.js";
import { createPawnCharacters } from "./pawn-character.js";

const canvas = document.querySelector("#game"), context = canvas.getContext("2d");
const status = document.querySelector("#status"), keys = new Set();
// One cast per scene; every character shares the same bounded sprite cache.
const cast = createPawnCharacters({ maxCacheBytes: 16 * 1024 * 1024 });
const pawn = cast.create({ hair: "bob", outfit: "sweater" }, { x: 320, y: 220, direction: "south-east" });
const movementKeys = new Set(["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"]);
let frameId, previous, closed = false;
function stop() {
  if (closed) return;
  closed = true; cancelAnimationFrame(frameId); cast.dispose();
}
window.addEventListener("pagehide", stop, { once: true });
window.addEventListener("blur", () => keys.clear());
window.addEventListener("keydown", event => {
  if (event.target.closest("input, textarea, select, button, [contenteditable]")) return;
  const key = event.key.toLowerCase();
  if (movementKeys.has(key)) { event.preventDefault(); keys.add(key); }
});
window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));

try {
  // Eight views are cheap for one pawn. Warm only likely views for large crowds.
  await cast.warm([pawn], { directions: DIRECTIONS });
  if (!closed) {
    const react = document.querySelector("#react"), cards = document.querySelector("#cards");
    react.disabled = cards.disabled = false;
    react.addEventListener("click", () => pawn.react("love"));
    cards.addEventListener("click", () => pawn.act(pawn.action === "hold-cards" ? "idle" : "hold-cards"));
    function frame(now) {
      const dt = previous === undefined ? 0 : Math.max(0, Math.min(.05, (now - previous) / 1000));
      previous = now;
      const dx = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
      const dy = Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup"));
      const step = 100 * dt / (Math.hypot(dx, dy) || 1);
      // Apply game boundaries first, then pass actual displacement to the pawn.
      const x = Math.max(32, Math.min(608, pawn.x + dx * step));
      const y = Math.max(100, Math.min(344, pawn.y + dy * step));
      pawn.update(dt, x - pawn.x, y - pawn.y);
      context.clearRect(0, 0, canvas.width, canvas.height);
      pawn.draw(context);
      // Draw furniture and other actors before this final overhead pass.
      pawn.drawOverhead(context);
      const label = `Facing ${pawn.direction} · ${pawn.action}`;
      if (status.textContent !== label) status.textContent = label;
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
  }
} catch (error) {
  status.textContent = error.message;
  stop();
}
