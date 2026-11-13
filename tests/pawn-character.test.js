import test from "node:test";
import assert from "node:assert/strict";
import { createPawnCharacters, PawnCharacter, CHARACTER_ACTIONS, REACTIONS } from "../public/pawn-character.js";
import { createPawnEffects, EFFECT_BYTES } from "../public/pawn-effects.js";
import { DIRECTIONS, PAWN_OPTIONS, PAWN_PALETTE } from "../public/pawn-engine.js";

async function withCanvas(check) {
  const previous = globalThis.document, calls = [], colors = [], strokes = [], canvases = [];
  const context = () => {
    const state = { globalAlpha: 1 }, saved = [];
    return new Proxy(state, {
      get: (target, key) => {
        if (key in target) return target[key];
        if (key === "save") return () => saved.push({ ...state });
        if (key === "restore") return () => Object.assign(state, saved.pop());
        if (key === "createRadialGradient") return () => ({ addColorStop() {} });
        if (key === "drawImage") return (...args) => calls.push(args);
        return () => {};
      },
      set: (target, key, value) => { if (key === "fillStyle") colors.push(value); if (key === "strokeStyle") strokes.push(value); target[key] = value; return true; },
    });
  };
  globalThis.document = { createElement() { const ctx = context(), canvas = { width: 0, height: 0, getContext: () => ctx }; canvases.push(canvas); return canvas; } };
  try { await check(context(), calls, { colors, strokes, canvases }); }
  finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
}

test("1,000 acting characters share one effects atlas and never rebuild appearances during play", () => withCanvas(async ctx => {
  const cast = createPawnCharacters({ maxCacheBytes: 192 * 1048576 });
  const characters = Array.from({ length: 1000 }, (_, i) => cast.create({ hair: PAWN_OPTIONS.hair[i % 14], hat: PAWN_OPTIONS.hat[Math.floor(i / 14) % 17], proportions: { head: .85 + i * .0003 } }));
  const returned = await cast.warm(characters, { directions: DIRECTIONS }); const warm = cast.stats();
  assert.equal(returned.bytes, warm.bytes); assert.equal(returned.maxBytes, 192 * 1048576);
  assert.equal(warm.looks, 1000); assert.equal(warm.effectBuilds, 1); assert.equal(warm.effectBytes, EFFECT_BYTES);
  const create = document.createElement, clone = globalThis.structuredClone, stringify = JSON.stringify;
  try {
    document.createElement = globalThis.structuredClone = JSON.stringify = () => { throw new Error("Unexpected allocation during character playback"); };
    for (let frame = 0; frame < 16; frame++) for (const [i, c] of characters.entries()) {
      c.direction = DIRECTIONS[(i + frame) % 8];
      if (!frame) c.act(Object.keys(CHARACTER_ACTIONS)[i % Object.keys(CHARACTER_ACTIONS).length]).setStatus("stinky", i % 5 === 0).react(REACTIONS[i % REACTIONS.length]);
      c.update(1 / 30); c.draw(ctx); c.drawOverhead(ctx);
    }
  } finally { document.createElement = create; globalThis.structuredClone = clone; JSON.stringify = stringify; }
  const after = cast.stats();
  assert.equal(after.builds, warm.builds); assert.equal(after.faceBuilds, warm.faceBuilds);
  assert.equal(after.effectBuilds, 1); assert.equal(after.preparations, 1000); assert.equal(after.evictions, 0);
  assert.ok(after.bytes <= after.maxBytes); cast.dispose(); assert.equal(cast.stats().bytes, 0);
}));

test("reaction bubbles clear the tallest headgear and follow head size independently of body proportions", () => withCanvas(async (ctx, calls) => {
  const cast = createPawnCharacters(), c = cast.create({ hat: "wizard", proportions: { width: .8, height: 1.15, head: .85 } }, { x: 100, y: 150 });
  await cast.warm([c]); c.react("happy"); c.update(.2); c.drawOverhead(ctx);
  const small = calls.at(-1), rig = c.layout({});
  assert.equal(small[7], 32 * .85); assert.equal(small[8], 32 * .85);
  assert.ok(small[6] + small[8] < rig.topY + 1); assert.ok(Math.abs(small[5] + small[7] / 2 - rig.headX) < 1e-10);
  c.setAppearance({ hat: "wizard", proportions: { width: 1.2, height: .85, head: .85 } }); c.drawOverhead(ctx);
  assert.equal(calls.at(-1)[7], small[7]);
  c.setAppearance({ proportions: { head: 1.15 } }); c.drawOverhead(ctx);
  assert.equal(calls.at(-1)[7], 32 * 1.15); cast.dispose();
}));

test("default warm-up prepares each current facing rather than eight unused variants", () => withCanvas(async () => {
  const cast = createPawnCharacters(), left = cast.create({}, { direction: "west" }), right = cast.create({}, { direction: "east" });
  const warmed = await cast.warm([left, right]);
  assert.equal(warmed.poses, 2); assert.equal(warmed.faceSheets, 2);
  assert.equal(warmed.effectBytes, EFFECT_BYTES);
  cast.dispose();
}));

test("held anchors follow every direction and sitting lift without resizing the head", () => withCanvas(() => {
  const cast = createPawnCharacters(), c = cast.create({}, { x: 120, y: 150 });
  for (const direction of DIRECTIONS) {
    c.face(direction); const standing = c.layout({}); c.setPosture("seated").update(2); const seated = c.layout({});
    assert.equal(seated.headScale, standing.headScale);
    assert.ok(Math.abs((standing.heldY - seated.heldY) - (standing.headY - seated.headY)) < 1e-10);
    assert.ok(seated.headY < standing.headY - 5); assert.equal(seated.floorY, standing.floorY);
    c.setPosture("standing").update(2);
  }
  cast.dispose();
}));

test("rear props render behind the pawn, foreground props can follow a tabletop, and bubbles use a final pass", () => withCanvas(async (ctx, calls) => {
  const cast = createPawnCharacters(), c = cast.create({}).act("hold-cards"); await cast.warm([c]);
  calls.length = 0; c.draw(ctx); assert.equal(calls.at(-1)[0].width, 512);
  calls.length = 0; c.draw(ctx, { foreground: false }); assert.ok(calls.every(call => call[0].width !== 512));
  c.drawForeground(ctx); assert.equal(calls.at(-1)[0].width, 512);
  c.face("north"); calls.length = 0; c.draw(ctx); assert.equal(calls[0][0].width, 512); assert.equal(calls.at(-1)[0].width, 1024);
  c.react("love").update(.2); c.drawOverhead(ctx); assert.equal(calls.at(-1)[0].width, 512); cast.dispose();
}));

test("one-shot actions complete once, transition predictably, and leave game rules to the callback", () => withCanvas(() => {
  const events = [], cast = createPawnCharacters(), c = cast.create({}, { onActionComplete: (action, character) => events.push([action, character]) });
  c.act("play-card", { cardCount: 7, target: { x: 40, y: 30 } }).update(3);
  assert.equal(c.action, "hold-cards"); assert.equal(c.cardCount, 7); assert.deepEqual(events, [["play-card", c]]);
  c.update(10); assert.equal(events.length, 1);
  for (const [action, definition] of Object.entries(CHARACTER_ACTIONS)) if (definition.duration) { c.act(action).update(definition.duration + .1); assert.equal(c.action, definition.next); }
  c.act("clean").update(20); assert.equal(c.action, "clean"); cast.dispose();
}));

test("reactions replace rather than queue, expire with elapsed time, and restore the base expression", () => withCanvas(() => {
  const cast = createPawnCharacters(), c = cast.create({}); c.expression = "neutral";
  c.react("happy").update(.3); assert.equal(c.displayExpression, "happy");
  c.react("surprised", { duration: .5 }); assert.equal(c.reaction, "surprised");
  c.update(.5); assert.equal(c.reaction, null); assert.equal(c.displayExpression, "neutral");
  c.react("love").clearReaction(); assert.equal(c.reaction, null); cast.dispose();
}));

test("played cards retain the supplied isometric landing target and projection", () => withCanvas(async ctx => {
  const cast = createPawnCharacters(); let landed = null;
  const c = cast.create({}, { onActionComplete: (_action, _character, target) => { landed = target; } });
  await cast.warm([c]); const warm = cast.stats();
  const target = { x: 120, y: 90, projection: { a: .894427, b: .447214, c: -.894427, d: .447214 } };
  c.act("play-card", { target }); target.x = 999; target.projection.a = 999;
  c.update(.6); c.draw(ctx); c.face("west"); c.update(.4);
  assert.equal(landed.x, 120); assert.equal(landed.y, 90); assert.equal(landed.projection.a, .894427);
  assert.equal(cast.stats().builds, warm.builds); assert.equal(cast.stats().effectBuilds, warm.effectBuilds);
  // Matrix-like objects may expose their coefficients through prototype getters.
  c.act("play-card", { target: { x: 1, y: 2, projection: Object.create({ a: .9, b: .4, c: -.9, d: .4 }) } }).update(1);
  assert.deepEqual(landed.projection, { a: .9, b: .4, c: -.9, d: .4 });
  assert.throws(() => c.act("play-card", { target: { x: 0, y: 0, projection: { a: 1, b: 1, c: 1, d: 1 } } }), /nonzero area/);
  cast.dispose();
}));

test("stink clears immediately and remains independent of actions and reactions", () => withCanvas(async (ctx, calls) => {
  const cast = createPawnCharacters(), c = cast.create({}); await cast.warm([c]);
  c.setStatus("stinky", true).react("angry").update(.2); calls.length = 0; c.draw(ctx);
  assert.equal(calls[0][0].width, 512); c.act("restock"); assert.equal(c.stinky, true);
  c.setStatus("stinky", false).act("idle"); calls.length = 0; c.draw(ctx);
  assert.ok(calls.every(call => call[0].width !== 512)); assert.equal(c.reaction, "angry"); cast.dispose();
}));

test("movement uses actual displacement, stands up, and retains facing on release", () => withCanvas(() => {
  const cast = createPawnCharacters(), c = cast.create({}, { x: 50, y: 50, posture: "seated" });
  c.update(.1, 3, -4); assert.equal(c.x, 53); assert.equal(c.y, 46); assert.equal(c.direction, "north-east"); assert.equal(c.posture, "standing");
  c.update(.1); assert.equal(c.direction, "north-east"); assert.equal(c.x, 53); cast.dispose();
}));

test("effects use only the concept palette and black outlines", () => withCanvas((ctx, calls, { colors, strokes }) => {
  const effects = createPawnEffects(); effects.warm();
  const palette = new Set(PAWN_PALETTE.map(swatch => swatch.color));
  assert.ok(colors.length > 100); for (const color of colors) assert.ok(palette.has(color), color);
  assert.ok(strokes.length > 100); for (const stroke of strokes) assert.equal(stroke, "#000000");
  assert.equal(effects.stats().bytes, 1048576); effects.dispose(); assert.equal(effects.stats().bytes, 0);
}));

test("invalid state and ownership fail clearly; disposal releases shared assets", () => withCanvas(async () => {
  const cast = createPawnCharacters(), other = createPawnCharacters(), c = cast.create({}), sibling = cast.create({});
  assert.ok(c instanceof PawnCharacter);
  assert.throws(() => c.act("unknown"), /Unsupported action/); assert.throws(() => c.act("hold-cards", { cardCount: 8 }), /Card count/);
  assert.throws(() => c.act("play-card", { target: { x: NaN, y: 1 } }), /finite/);
  assert.throws(() => c.react("not-an-icon"), /Unsupported reaction/); assert.throws(() => c.react("happy", { duration: 50 }), /duration/);
  assert.throws(() => c.setStatus("fire", true), /Unsupported status/); assert.throws(() => c.setPosture("lying"), /Posture/);
  assert.throws(() => c.update(-1), /negative/); assert.throws(() => c.update(Infinity), /finite/);
  await assert.rejects(other.warm([c]), /owned/);
  await cast.warm([c, sibling]); assert.equal(cast.stats().looks, 1);
  c.dispose(); assert.equal(cast.stats().characters, 1); assert.equal(cast.stats().looks, 1);
  cast.dispose(); assert.equal(cast.stats().characters, 0); assert.equal(cast.stats().bytes, 0);
  assert.throws(() => sibling.update(.1), /disposed/); assert.throws(() => cast.create({}), /disposed/); cast.dispose(); other.dispose();
}));
