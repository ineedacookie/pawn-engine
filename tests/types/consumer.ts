import {
  createPawnRenderer, normalizeAppearance, createAtlas, atlasMetadata,
  DIRECTIONS, CLASS_PRESETS, PAWN_OPTIONS, directionFromVector, frameIndex,
  type AppearanceInput, type Direction, type Expression, type PawnLayout,
} from "pawn-engine";
import { createPawnCharacters, PawnCharacter, CHARACTER_ACTIONS, REACTIONS, type ActionTarget } from "pawn-engine/characters";

declare const context: CanvasRenderingContext2D;
const appearance: AppearanceInput = { ...CLASS_PRESETS.ranger, hair: PAWN_OPTIONS.hair[0], proportions: { head: 1.1 } };
const renderer = createPawnRenderer({ maxCacheBytes: 32 * 1024 * 1024 });
const handle = renderer.prepare(normalizeAppearance(appearance));
const direction: Direction = directionFromVector(1, -1, "south");
const expression: Expression = "excited";
await renderer.warm([{ pawn: handle, directions: DIRECTIONS }], { signal: new AbortController().signal, onProgress: p => p.completed + p.total });
renderer.draw(context, handle, { x: 1, y: 2, direction, expression, state: "walk", progress: .25 });
const layout: PawnLayout & { tag: string } = renderer.layout(handle, { x: 1, y: 2 }, { tag: "seat" });
layout.tag.toUpperCase();
frameIndex("walk", .25);
createAtlas(appearance, { scale: 2, expression });
atlasMetadata(appearance).frames[direction].walk[0].width.toFixed();
renderer.stats().layoutHits.toFixed();
renderer.release(handle);
renderer.clear(); renderer.dispose();

const cast = createPawnCharacters();
class Visitor extends PawnCharacter { greet() { return this.react("happy"); } }
const visitor = new Visitor(cast, appearance, { posture: "seated", onActionComplete: (action, character, target) => {
  CHARACTER_ACTIONS[action].label.toUpperCase(); character.face("west"); target?.projection?.a.toFixed();
} });
const target: ActionTarget = { x: 1, y: 2, projection: { a: .9, b: .4, c: -.9, d: .4 } };
await cast.warm([visitor], { directions: new Set(DIRECTIONS), budgetMs: 4 });
visitor.act("play-card", { cardCount: 5, target }).react(REACTIONS[0], { duration: 2 }).setStatus("stinky", true);
visitor.expression = expression; visitor.direction = direction; visitor.visible = false;
visitor.update(.016, 1, 0).teleport(2, 3).setPosture("standing").setAppearance({ hair: "long" });
visitor.draw(context, { foreground: false }); visitor.drawForeground(context); visitor.drawOverhead(context);
visitor.layout({ label: "table" }).headX.toFixed();
visitor.displayExpression satisfies Expression;
cast.stats().effectBytes.toFixed();
visitor.clearReaction().dispose(); cast.dispose();

// These errors must remain errors in the installed package as well as this repo.
// @ts-expect-error unsupported catalogue part
normalizeAppearance({ hair: "braids" });
// @ts-expect-error expressions are runtime state, never appearance
renderer.prepare({ expression: "happy" });
// @ts-expect-error unsupported action
visitor.act("teleport");
// @ts-expect-error unsupported reaction
visitor.react("fire");
// @ts-expect-error coordinates are required
renderer.draw(context, handle, { direction: "south" });
// @ts-expect-error prepared appearances are immutable
handle.appearance.proportions.head = 2;
// @ts-expect-error prepared handles cannot be forged
renderer.draw(context, { appearance: normalizeAppearance() }, { x: 0, y: 0 });
// @ts-expect-error only native and double export scales exist
createAtlas({}, { scale: 3 });
