import { createPawnRenderer, DIRECTIONS, EXPRESSIONS, directionFromVector } from "./pawn-engine.js";
import { createPawnEffects, EFFECT_BYTES, REACTIONS, FANS, PROPS, BUBBLES, STINK, CONFETTI, SPARKLE, CLEAN_SWEEP } from "./pawn-effects.js";
export { REACTIONS } from "./pawn-effects.js";

const definition = (label, duration = 0, next = "idle") => Object.freeze({ label, duration, next });
export const CHARACTER_ACTIONS = Object.freeze({
  idle: definition("Idle"), browse: definition("Browse / inspect a display"), wait: definition("Wait in line"),
  "hold-cards": definition("Hold cards"), "play-card": definition("Play a card", .85, "hold-cards"),
  shuffle: definition("Shuffle cards", 1.4, "hold-cards"), "open-pack": definition("Open a booster", 1.6, "hold-cards"),
  pay: definition("Pay / checkout", 1), trade: definition("Offer cards for trade"),
  "carry-bag": definition("Carry shopping"), restock: definition("Carry stock"), clean: definition("Sweep / clean"),
  judge: definition("Make a ruling", 1.5), inspect: definition("Inspect / grade a card"), celebrate: definition("Celebrate", 1.6),
});
const MOODS = Object.freeze({ happy: "happy", love: "happy", angry: "neutral", confused: "surprised", idea: "excited", waiting: "neutral", sale: "happy", win: "excited", sad: "sleepy", surprised: "surprised", talk: "neutral", fresh: "happy" });
const FORWARD_X = [0, -.707, -1, -.707, 0, .707, 1, .707];
const FORWARD_Y = [1, .707, 0, -.707, -1, -.707, 0, .707];
const DEFAULT_DRAW = Object.freeze({ foreground: true });
const contexts = new WeakMap();
function finite(value, name) { if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`); }
function cards(value) { if (!Number.isInteger(value) || value < 1 || value > 7) throw new Error("Card count must be an integer from 1 to 7."); return value; }

/** Runtime presentation only. The game owns navigation, transactions and rules. */
export class PawnCharacter {
  #context; #handle; #released = false; #reaction = null; #lift = 0; #target = null;
  #rig = {}; #view = { x: 0, y: 0, direction: "south", state: "idle", progress: 0, expression: "happy", lift: 0 };
  #actionTime = 0; #time = 0; #distance = 0; #walking = false; #phase;
  constructor(cast, appearance = {}, { x = 0, y = 0, direction = "south", posture = "standing", cardCount = 4, onActionComplete = null } = {}) {
    const context = contexts.get(cast);
    if (!context || context.closed) throw new Error("Create a character with a live character renderer.");
    finite(x, "x"); finite(y, "y");
    if (!DIRECTIONS.includes(direction)) throw new Error(`Unsupported direction: ${direction}.`);
    if (!["standing", "seated"].includes(posture)) throw new Error("Posture must be standing or seated.");
    if (onActionComplete !== null && typeof onActionComplete !== "function") throw new Error("onActionComplete must be a function.");
    this.cardCount = cards(cardCount); this.x = x; this.y = y; this.direction = direction;
    this.posture = posture; this.expression = "happy"; this.action = "idle"; this.stinky = false; this.visible = true;
    this.onActionComplete = onActionComplete;
    this.#context = context; this.#handle = context.renderer.prepare(appearance);
    this.#lift = posture === "seated" ? 6 * this.appearance.proportions.height : 0;
    this.#phase = context.serial++ * .61803398875 % 1; context.characters.add(this);
  }
  #live() { if (this.#released || this.#context.closed) throw new Error("Character has been disposed."); }
  get appearance() { return this.#handle.appearance; }
  get actionProgress() { const duration = CHARACTER_ACTIONS[this.action].duration; return duration ? Math.min(1, this.#actionTime / duration) : this.#actionTime % 1; }
  get reaction() { return this.#reaction?.kind ?? null; }
  get displayExpression() { return this.#reaction ? MOODS[this.#reaction.kind] : this.expression; }
  setAppearance(appearance) {
    this.#live(); const next = this.#context.renderer.prepare(appearance);
    this.#context.renderer.release(this.#handle); this.#handle = next;
    this.#lift = this.posture === "seated" ? 6 * this.appearance.proportions.height : 0;
    return this;
  }
  face(direction) {
    this.#live(); if (!DIRECTIONS.includes(direction)) throw new Error(`Unsupported direction: ${direction}.`);
    this.direction = direction; return this;
  }
  teleport(x, y) { this.#live(); finite(x, "x"); finite(y, "y"); this.x = x; this.y = y; this.#walking = false; return this; }
  setPosture(posture) {
    this.#live(); if (posture !== "standing" && posture !== "seated") throw new Error("Posture must be standing or seated.");
    this.posture = posture; return this;
  }
  setStatus(status, enabled) {
    this.#live(); if (status !== "stinky") throw new Error(`Unsupported status: ${status}.`);
    if (typeof enabled !== "boolean") throw new Error("Status enabled must be a boolean.");
    this.stinky = enabled; return this;
  }
  act(action, { cardCount = this.cardCount, target = null } = {}) {
    this.#live(); if (!Object.hasOwn(CHARACTER_ACTIONS, action)) throw new Error(`Unsupported action: ${action}.`);
    cards(cardCount);
    if (target) {
      finite(target.x, "Target x"); finite(target.y, "Target y");
      if (target.projection) {
        const p = target.projection;
        for (const key of ["a", "b", "c", "d"]) finite(p[key], `Projection ${key}`);
        if (Math.abs(p.a * p.d - p.b * p.c) < 1e-6) throw new Error("Table projection must have a nonzero area.");
      }
    }
    this.action = action; this.cardCount = cardCount; this.#actionTime = 0;
    this.#target = target ? { x: target.x, y: target.y, projection: target.projection ? { a: target.projection.a, b: target.projection.b, c: target.projection.c, d: target.projection.d } : null } : null; return this;
  }
  react(kind, { duration = 2 } = {}) {
    this.#live(); if (!REACTIONS.includes(kind)) throw new Error(`Unsupported reaction: ${kind}.`);
    if (!Number.isFinite(duration) || duration < .25 || duration > 10) throw new Error("Reaction duration must be between .25 and 10 seconds.");
    // One replaceable bubble: reactions cannot create an unbounded queue.
    this.#reaction = { kind, duration, remaining: duration }; return this;
  }
  clearReaction() { this.#live(); this.#reaction = null; return this; }
  update(seconds, dx = 0, dy = 0) {
    this.#live(); finite(seconds, "Elapsed seconds"); finite(dx, "dx"); finite(dy, "dy");
    if (seconds < 0) throw new Error("Elapsed seconds cannot be negative.");
    this.#walking = Math.hypot(dx, dy) > 1e-6;
    if (this.#walking) {
      this.x += dx; this.y += dy; this.direction = directionFromVector(dx, dy, this.direction);
      this.#distance += Math.hypot(dx, dy) / 48; this.posture = "standing";
    }
    this.#time = (this.#time + seconds) % 3600; this.#actionTime += seconds;
    const targetLift = this.posture === "seated" ? 6 * this.appearance.proportions.height : 0;
    this.#lift += (targetLift - this.#lift) * (1 - Math.exp(-seconds * 18));
    if (this.#reaction) { this.#reaction.remaining -= seconds; if (this.#reaction.remaining <= 0) this.#reaction = null; }
    const definition = CHARACTER_ACTIONS[this.action];
    if (definition.duration && this.#actionTime >= definition.duration) {
      const completed = this.action, target = this.#target; this.action = definition.next; this.#actionTime = 0; this.#target = null;
      this.onActionComplete?.(completed, this, target);
    } else if (!definition.duration) this.#actionTime %= 60;
    return this;
  }
  layout(out = this.#rig) {
    this.#live(); const view = this.#view;
    view.x = this.x; view.y = this.y; view.direction = this.direction; view.state = this.#walking ? "walk" : "idle";
    view.progress = this.#walking ? this.#distance : this.#time * .5; view.lift = this.#lift;
    view.expression = this.displayExpression;
    return this.#context.renderer.layout(this.#handle, view, out);
  }
  #props(ctx, rig) {
    if (this.action === "idle" || this.action === "wait" || this.action === "celebrate") return;
    const fx = this.#context.effects, scale = rig.propScale;
    const x = rig.heldX, y = rig.heldY, wave = Math.sin((this.#actionTime + this.#phase) * Math.PI * 2);
    const profile = rig.index === 2 || rig.index === 6, narrow = profile ? .65 : 1;
    const fan = FANS[this.cardCount - 1], p = this.actionProgress;
    if (this.action === "hold-cards" || this.action === "trade" || this.action === "play-card") {
      fx.draw(ctx, fan, x, y + wave * .35, scale, 0, 1, narrow);
      if (this.action === "play-card") {
        const tx = this.#target?.x ?? x + FORWARD_X[rig.index] * 28 * scale;
        const ty = this.#target?.y ?? y + FORWARD_Y[rig.index] * 22 * scale;
        const cx = x + (tx - x) * p, cy = y + (ty - y) * p - Math.sin(p * Math.PI) * 10 * scale;
        if (this.#target?.projection) fx.drawProjected(ctx, PROPS.card, cx, cy, scale, this.#target.projection, Math.max(0, (p - .2) / .8));
        else fx.draw(ctx, PROPS.card, cx, cy, scale, p * .3);
      }
    } else if (this.action === "shuffle") {
      for (let i = -1; i <= 1; i += 2) fx.draw(ctx, FANS[Math.min(2, this.cardCount - 1)], x + i * (3 + wave * 3) * scale, y, scale, i * .15, 1, narrow);
    } else if (this.action === "open-pack") {
      if (p < .65) fx.draw(ctx, PROPS.pack, x, y, scale, wave * .08);
      if (p > .35) fx.draw(ctx, PROPS.card, x, y - Math.sin((p - .35) / .65 * Math.PI / 2) * 12 * scale, scale, .1);
      if (p > .4) fx.draw(ctx, SPARKLE + Math.min(7, Math.floor((p - .4) / .6 * 8)), x, y - 6 * scale, scale);
    } else if (this.action === "pay") {
      const t = Math.min(1, p * 1.5), tx = this.#target?.x ?? x + FORWARD_X[rig.index] * 20 * scale, ty = this.#target?.y ?? y + FORWARD_Y[rig.index] * 16 * scale;
      fx.draw(ctx, p < .7 ? PROPS.coin : PROPS.receipt, x + (tx - x) * t, y + (ty - y) * t - Math.sin(t * Math.PI) * 5 * scale, scale);
    } else if (this.action === "restock" || this.action === "carry-bag") fx.draw(ctx, this.action === "restock" ? PROPS.box : PROPS.bag, x, y + wave * .3, scale);
    else if (this.action === "clean") {
      fx.draw(ctx, CLEAN_SWEEP[Math.floor((this.#actionTime + this.#phase) % 1 * 8)], x + wave * 4 * scale, rig.bodyY + 72 - 10 * this.appearance.proportions.height, scale);
      fx.draw(ctx, SPARKLE + Math.floor((this.#time + this.#phase) % 1 * 8), x + wave * 5 * scale, rig.floorY - this.#lift - 3, scale * .6);
    } else if (this.action === "browse" || this.action === "inspect") {
      if (this.action === "inspect") fx.draw(ctx, PROPS.card, x, y, scale, 0, 1, narrow);
      fx.draw(ctx, PROPS.magnifier, x + wave * 3 * scale, y - 2 * scale, scale * .75);
    } else if (this.action === "judge") fx.draw(ctx, PROPS.flag, x, y - 5 * scale, scale, wave * .12);
  }
  draw(ctx, { foreground = true } = DEFAULT_DRAW) {
    this.#live(); if (!this.visible) return;
    const rig = this.layout();
    if (this.stinky) {
      const frame = Math.floor((this.#time * .65 + this.#phase) % 1 * 8);
      const scale = Math.max(this.appearance.proportions.width, this.appearance.proportions.height) * .8;
      const y = rig.bodyY + 72 - 18 * this.appearance.proportions.height;
      this.#context.effects.draw(ctx, STINK + frame, rig.headX - rig.bodyWidth * .48, y, scale);
      this.#context.effects.draw(ctx, STINK + (frame + 3) % 8, rig.headX + rig.bodyWidth * .48, y, scale);
    }
    if (rig.rear) this.#props(ctx, rig);
    this.#context.renderer.draw(ctx, this.#handle, this.#view);
    if (!rig.rear && foreground) this.#props(ctx, rig);
  }
  /** Use after a tabletop for a character first drawn with foreground:false. */
  drawForeground(ctx) { this.#live(); if (!this.visible) return; const rig = this.layout(); if (!rig.rear) this.#props(ctx, rig); }
  /** Draw after all world furniture/actors, so bubbles cannot hide behind it. */
  drawOverhead(ctx) {
    this.#live(); if (!this.visible || (!this.#reaction && this.action !== "wait" && this.action !== "celebrate")) return;
    const rig = this.layout(), fx = this.#context.effects;
    const reaction = this.#reaction, kind = reaction?.kind ?? (this.action === "wait" ? "waiting" : null);
    if (kind) {
      const age = reaction ? reaction.duration - reaction.remaining : 1;
      const pop = 1 - Math.pow(1 - Math.min(1, age / .18), 3);
      const alpha = reaction ? Math.max(0, Math.min(1, age / .1, reaction.remaining / .25)) : 1;
      const scale = rig.headScale * (.7 + pop * .3);
      fx.draw(ctx, BUBBLES[kind], rig.headX, rig.topY - 17 * rig.headScale + Math.sin(this.#time * 3 + this.#phase) * .4, scale, 0, alpha);
    }
    if (this.action === "celebrate") fx.draw(ctx, CONFETTI + Math.min(7, Math.floor(this.actionProgress * 8)), rig.headX, rig.topY - 8 * rig.headScale, rig.headScale * 1.3);
  }
  warmRequest(directions) { this.#live(); return { pawn: this.#handle, directions }; }
  dispose() {
    if (this.#released) return;
    this.#context.renderer.release(this.#handle); this.#context.characters.delete(this); this.#released = true;
    this.#reaction = this.#target = null; this.onActionComplete = null;
  }
}

/** Own one per scene. All characters share its body cache and 1 MiB FX atlas. */
export function createPawnCharacters({ maxCacheBytes = 128 * 1048576 } = {}) {
  const renderer = createPawnRenderer({ maxCacheBytes: maxCacheBytes - EFFECT_BYTES });
  const context = { renderer, effects: createPawnEffects(), characters: new Set(), serial: 0, closed: false };
  function live() { if (context.closed) throw new Error("Character renderer has been disposed."); }
  const cast = {
    create(appearance, options) { live(); return new PawnCharacter(cast, appearance, options); },
    async warm(characters, { directions, ...options } = {}) {
      live(); const requests = [];
      for (const character of characters) {
        if (!context.characters.has(character)) throw new Error("Warm characters owned by this renderer.");
        requests.push(character.warmRequest(directions ?? [character.direction]));
      }
      context.effects.warm(); await renderer.warm(requests, options); return cast.stats();
    },
    stats() { const base = renderer.stats(), effects = context.effects.stats(); return { ...base, bytes: base.bytes + effects.bytes, maxBytes: maxCacheBytes, effectBytes: effects.bytes, effectBuilds: effects.builds, characters: context.characters.size }; },
    dispose() { if (context.closed) return; for (const character of context.characters) character.dispose(); context.effects.dispose(); renderer.dispose(); context.closed = true; },
  };
  contexts.set(cast, context); return cast;
}
