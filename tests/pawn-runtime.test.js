import test from "node:test";
import assert from "node:assert/strict";
import * as engine from "../public/pawn-engine.js";
const { createPawnRenderer, DIRECTIONS, EXPRESSIONS } = engine;
const PAGE_BYTES = 1024 * 672 * 4, AUX_BYTES = 4096 + 3328 + 64 * 84 * 4;

async function withCanvas(check) {
  const previous = globalThis.document, draws = [];
  const ctx = new Proxy({}, {
    get: (_, key) => key === "createRadialGradient" ? () => ({ addColorStop() {} }) : key === "drawImage" ? (...args) => draws.push(args) : () => {},
    set: () => true,
  });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
  try { await check(ctx, draws); }
  finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
}

test("1,000 unique pawns change expression every draw without rebuilding warmed bodies or faces", () => withCanvas(async ctx => {
  const renderer = createPawnRenderer({ maxCacheBytes: 192 * 1048576 });
  const pawns = Array.from({ length: 1000 }, (_, i) => renderer.prepare({
    hair: engine.PAWN_OPTIONS.hair[i % 14], hat: engine.PAWN_OPTIONS.hat[Math.floor(i / 14) % 17],
    proportions: { head: .85 + i * .0003 },
  }));
  await renderer.warm(pawns.map(pawn => ({ pawn, directions: DIRECTIONS })));
  const warmed = renderer.stats();
  assert.equal(warmed.looks, 1000); assert.equal(warmed.builds, 8000);
  assert.equal(warmed.faceBuilds, 14 * 16 * 5);
  assert.equal(warmed.faceSprites, warmed.faceSheets * EXPRESSIONS.length);
  for (let frame = 0; frame < 40; frame++) for (const [i, pawn] of pawns.entries())
    renderer.draw(ctx, pawn, { x: 100, y: 100, direction: DIRECTIONS[(i + frame) % 8], expression: EXPRESSIONS[(i + frame) % 5], state: "walk", progress: frame / 8 });
  const after = renderer.stats();
  assert.equal(after.builds, warmed.builds); assert.equal(after.faceBuilds, warmed.faceBuilds);
  assert.equal(after.evictions, 0); assert.equal(after.preparations, 1000);
  assert.ok(after.bytes <= after.maxBytes); renderer.dispose(); assert.equal(renderer.stats().bytes, 0);
}));

test("colors and proportions share a face sheet; expressions select separate crops", () => withCanvas((ctx, draws) => {
  const renderer = createPawnRenderer();
  const first = renderer.prepare({ hair: "long", colors: { hair: "#e48378" } });
  const second = renderer.prepare({ hair: "long", colors: { hair: "#79a76b" }, proportions: { head: 1.15, width: 1.2, height: .85 } });
  renderer.draw(ctx, first, { x: 0, y: 0, expression: "happy" }); const firstFace = draws.at(-1);
  renderer.draw(ctx, second, { x: 0, y: 0, expression: "surprised" }); const secondFace = draws.at(-1);
  assert.equal(renderer.stats().looks, 2); assert.equal(renderer.stats().poses, 2);
  assert.equal(renderer.stats().faceSheets, 1); assert.equal(renderer.stats().faceBuilds, 1);
  assert.deepEqual(firstFace.slice(3, 5), [32, 26]); assert.deepEqual(secondFace.slice(3, 5), [32, 26]);
  assert.equal(secondFace[2] - firstFace[2], 56);
  assert.equal(secondFace[7], 16 * 1.15); assert.equal(secondFace[8], 13 * 1.15);
  renderer.release(first); assert.equal(renderer.stats().faceSheets, 1);
  renderer.release(second); assert.equal(renderer.stats().faceSheets, 0); assert.equal(renderer.stats().looks, 0);
  renderer.dispose();
}));

test("rear views and closed helmets neither draw nor allocate faces", () => withCanvas((ctx, draws) => {
  const renderer = createPawnRenderer(), plain = renderer.prepare({}), helmet = renderer.prepare({ hat: "greathelm" });
  for (const direction of ["north-west", "north", "north-east"]) {
    renderer.draw(ctx, plain, { x: 0, y: 0, direction, shadow: false });
    assert.equal(draws.at(-1)[3], 64);
  }
  for (const direction of DIRECTIONS) renderer.draw(ctx, helmet, { x: 0, y: 0, direction });
  assert.equal(renderer.stats().faceSheets, 0); assert.equal(renderer.stats().faceBuilds, 0);
  renderer.dispose();
}));

test("faces keep head scale and follow the same animation offset as the body", () => withCanvas(async (ctx, draws) => {
  const renderer = createPawnRenderer(), pawn = renderer.prepare({ proportions: { height: 1.15, head: .85, width: 1.2 } });
  await renderer.warm([{ pawn, directions: ["south-east"] }]);
  const options = { x: 100.25, y: 100.75, direction: "south-east", shadow: false };
  renderer.draw(ctx, pawn, options);
  const idleBody = draws.at(-2), idleFace = draws.at(-1);
  renderer.draw(ctx, pawn, { ...options, state: "walk", progress: .25, expression: "excited" });
  const walkBody = draws.at(-2), walkFace = draws.at(-1);
  assert.deepEqual(walkFace.slice(7), [16 * .85, 13 * .85]);
  assert.equal(walkFace[5], idleFace[5]);
  assert.ok(Math.abs((walkFace[6] - idleFace[6]) - (walkBody[6] - idleBody[6])) < 1e-10);
  assert.ok(Math.abs(walkBody[6] - idleBody[6] + 1.1 * 1.15) < 1e-10);
  renderer.dispose();
}));

test("prepared handles are immutable, share poses, and release by reference count", () => withCanvas(ctx => {
  const renderer = createPawnRenderer(), input = { hair: "long" };
  const first = renderer.prepare(input), second = renderer.prepare(input); input.hair = "short";
  assert.equal(first.appearance.hair, "long");
  assert.throws(() => { first.appearance.colors.clothes = "#000000"; }, TypeError);
  renderer.draw(ctx, first, { x: 0, y: 0 }); renderer.draw(ctx, second, { x: 0, y: 0 });
  assert.equal(renderer.stats().looks, 1); assert.equal(renderer.stats().builds, 1);
  renderer.release(first); renderer.draw(ctx, second, { x: 0, y: 0 }); assert.equal(renderer.stats().builds, 1);
  assert.throws(() => renderer.draw(ctx, first, { x: 0, y: 0 }), /live pawn/);
  renderer.release(second); assert.equal(renderer.stats().poses, 0); assert.equal(renderer.stats().faceSheets, 0);
  renderer.dispose();
}));

test("body and face slots obey one bounded LRU and regenerate after eviction", () => withCanvas(ctx => {
  const renderer = createPawnRenderer({ maxCacheBytes: PAGE_BYTES + AUX_BYTES });
  const pawns = Array.from({ length: 128 }, (_, i) => renderer.prepare({ proportions: { head: .85 + i * .001 } }));
  for (const pawn of pawns) renderer.draw(ctx, pawn, { x: 0, y: 0 });
  assert.equal(renderer.stats().poses + renderer.stats().faceSheets, 128);
  assert.ok(renderer.stats().evictions > 0); assert.ok(renderer.stats().bytes <= PAGE_BYTES + AUX_BYTES);
  const built = renderer.stats().builds; renderer.draw(ctx, pawns[0], { x: 0, y: 0 }); assert.equal(renderer.stats().builds, built + 1);
  renderer.clear(); assert.equal(renderer.stats().bytes, 0);
  renderer.draw(ctx, pawns[0], { x: 0, y: 0 }); assert.equal(renderer.stats().builds, 1); assert.equal(renderer.stats().faceBuilds, 1);
  renderer.dispose();
}));

test("warm-up counts shared faces in capacity and validates state and lifetime", () => withCanvas(async ctx => {
  const renderer = createPawnRenderer({ maxCacheBytes: PAGE_BYTES + AUX_BYTES });
  const pawns = Array.from({ length: 16 }, (_, i) => renderer.prepare({ proportions: { head: .85 + i * .01 } }));
  await assert.rejects(renderer.warm(pawns.map(pawn => ({ pawn, directions: DIRECTIONS }))), /capacity/);
  assert.equal(renderer.stats().builds, 0);
  for (const expression of ["invalid", "constructor", "__proto__", null]) assert.throws(() => renderer.draw(ctx, pawns[0], { x: 0, y: 0, expression }), /Unsupported expression/);
  assert.throws(() => renderer.draw(ctx, pawns[0], { direction: "constructor" }), /Unsupported direction/);
  await assert.rejects(renderer.warm([{ pawn: pawns[0], directions: ["invalid"] }]), /direction/);
  await assert.rejects(renderer.warm([{ pawn: pawns[0] }], { budgetMs: 0 }), /budget/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(renderer.warm([{ pawn: pawns[0] }], { signal: controller.signal }), { name: "AbortError" });
  renderer.dispose(); assert.throws(() => renderer.draw(ctx, pawns[0]), /disposed/);
}));

test("cooperative warm-up cancels and detects cache clearing or handle release", () => withCanvas(async () => {
  for (const action of ["abort", "clear", "release"]) {
    const renderer = createPawnRenderer(), pawn = renderer.prepare({}), controller = new AbortController();
    await assert.rejects(renderer.warm([{ pawn, directions: DIRECTIONS }], {
      budgetMs: Number.MIN_VALUE, signal: controller.signal,
      onProgress: () => { if (action === "abort") controller.abort(); else if (action === "clear") renderer.clear(); else renderer.release(pawn); },
    }), action === "abort" ? { name: "AbortError" } : /cache changed|released/);
    renderer.dispose();
  }
}));

test("expression draws never clone, serialize, or allocate canvases after warm-up", () => withCanvas(async ctx => {
  const renderer = createPawnRenderer(), pawn = renderer.prepare({}); await renderer.warm([{ pawn, directions: DIRECTIONS }]);
  const clone = globalThis.structuredClone, stringify = JSON.stringify, create = document.createElement;
  try {
    const unexpected = () => { throw new Error("Allocation in expression draw loop"); };
    globalThis.structuredClone = JSON.stringify = document.createElement = unexpected;
    for (const direction of DIRECTIONS) for (const expression of EXPRESSIONS) renderer.draw(ctx, pawn, { x: 0, y: 0, direction, expression });
  } finally { globalThis.structuredClone = clone; JSON.stringify = stringify; document.createElement = create; }
  renderer.dispose();
}));

test("legacy global renderer and mutable appearance drawing APIs are removed", () => {
  for (const name of ["drawFrame", "preparePawn", "drawPreparedPawn", "releasePawn", "warmPawns", "runtimeStats", "clearAtlasCache", "atlasCacheBytes"]) assert.equal(name in engine, false, name);
  const renderer = createPawnRenderer(); assert.equal("drawAppearance" in renderer, false); renderer.dispose();
});
