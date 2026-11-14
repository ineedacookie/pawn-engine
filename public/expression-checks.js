// Real-canvas regression checks used by the wardrobe review page.
// Vector atlas exports are an independent reference for runtime face placement.
import { createPawnRenderer, createAtlas, DIRECTIONS, EXPRESSIONS, PAWN_OPTIONS } from "./pawn-engine.js";

const SIDE = [0, -1, -1, -1, 0, 1, 1, 1];
const sizes = [{ height: 1, head: 1, width: 1 }, { height: .85, head: .85, width: .8 }, { height: 1.15, head: 1.15, width: 1.2 }];
const looks = [
  ...PAWN_OPTIONS.hair.map(hair => ({ hair, hat: "none" })),
  ...PAWN_OPTIONS.hat.filter(hat => hat !== "none").map(hat => ({ hair: "long", hat })),
  { hair: "curly", hat: "rangerhood" }, { hair: "mohawk", hat: "goggles" },
  { hair: "undercut", hat: "helmet" }, { hair: "braid", hat: "wizard" },
];
const difference = (a, b) => {
  const weights = new Float32Array(64 * 80);
  for (let p = 0; p < weights.length; p++) for (let c = 0; c < 3; c++)
    weights[p] = Math.max(weights[p], Math.abs(a[p * 4 + c] * a[p * 4 + 3] / 255 - b[p * 4 + c] * b[p * 4 + 3] / 255));
  return weights;
};
function centroid(weights) {
  let total = 0, x = 0, y = 0;
  for (let p = 0; p < weights.length; p++) if (weights[p] > 12) {
    const weight = weights[p]; total += weight; x += p % 64 * weight; y += Math.floor(p / 64) * weight;
  }
  return total ? { x: x / total, y: y / total, total } : null;
}
export async function runExpressionChecks({ onProgress } = {}) {
  const renderer = createPawnRenderer(), canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 80;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let checks = 0, failed = 0, completed = 0;
  const failures = [], total = looks.length * sizes.length;
  const check = (valid, label) => { checks++; if (!valid) { failed++; if (failures.length < 30) failures.push(label); } };
  const runtimePixels = (pawn, direction, expression) => {
    ctx.clearRect(0, 0, 64, 80); renderer.draw(ctx, pawn, { x: 32, y: 72, direction, expression, shadow: false });
    return ctx.getImageData(0, 0, 64, 80).data;
  };
  try {
    for (const look of looks) for (const proportions of sizes) {
      const appearance = { ...look, proportions }, pawn = renderer.prepare(appearance);
      await renderer.warm([{ pawn, directions: DIRECTIONS }]);
      const baseline = DIRECTIONS.map(direction => runtimePixels(pawn, direction, "happy"));
      const reference = createAtlas(appearance), refCtx = reference.getContext("2d", { willReadFrequently: true });
      const refBaseline = DIRECTIONS.map((_, row) => refCtx.getImageData(0, row * 80, 64, 80).data);
      reference.width = reference.height = 0;
      for (const expression of EXPRESSIONS.slice(1)) {
        const atlas = createAtlas(appearance, { expression }), atlasCtx = atlas.getContext("2d", { willReadFrequently: true });
        for (const [index, direction] of DIRECTIONS.entries()) {
          const label = `${look.hair}/${look.hat}/${proportions.head}/${direction}/${expression}`;
          const actual = difference(baseline[index], runtimePixels(pawn, direction, expression));
          const expected = difference(refBaseline[index], atlasCtx.getImageData(0, index * 80, 64, 80).data);
          const a = centroid(actual), e = centroid(expected);
          const hidden = direction.startsWith("north") || look.hat === "greathelm";
          if (hidden) { check(!a && !e, `${label}: hidden face`); continue; }
          const sx = proportions.width * (["west", "east"].includes(direction) ? .84 : 1);
          const hx = 32 + SIDE[index] * .7 * sx, hy = 72 - 43 * proportions.height, head = proportions.head;
          let outside = 0, uncovered = 0; const samples = [];
          for (let pixel = 0; pixel < actual.length; pixel++) if (actual[pixel] > 12) {
            const x = pixel % 64, y = Math.floor(pixel / 64);
            if (x < hx - 16 * head - 1 || x > hx + 16 * head + 1 || y < hy - 2 * head - 1 || y > hy + 14 * head + 1) outside++;
            // Allow two pixels for native sprite sampling vs vector antialiasing.
            let nearby = false;
            for (let dy = -2; dy <= 2 && !nearby; dy++) for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < 64 && ny >= 0 && ny < 80 && expected[ny * 64 + nx] > 12) { nearby = true; break; }
            }
            if (!nearby) {uncovered++;if(samples.length<4)samples.push([x,y,actual[pixel]]);}
          }
          check(outside === 0, `${label}: changed body pixels`);
          check(uncovered === 0, `${label}: expression over occluder (${uncovered}, ${JSON.stringify(samples)})`);
          check((!a && !e) || (a && e && Math.hypot(a.x - e.x, a.y - e.y) <= 1.2), `${label}: face alignment (${JSON.stringify({a,e})})`);
        }
        atlas.width = atlas.height = 0;
      }
      renderer.release(pawn); completed++; onProgress?.({ completed, total });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return { checks, failed, failures, cases: total, directions: DIRECTIONS.length, expressions: EXPRESSIONS.length };
  } finally { renderer.dispose(); canvas.width = canvas.height = 0; }
}
