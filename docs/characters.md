# Character actions and attachments

Open `/characters.html` for the isometric table demo, eight-direction action previews, reaction controls, size sliders, real-canvas attachment checks, and a 100/500/1,000-character benchmark. The lab loads the appearance saved in the main workshop; it does not change the shop game.

All new art uses the engine's standard 25-color palette, rounded silhouettes, and black outlines. Reactions are drawn icons, not operating-system emoji. Pawns remain armless and legless. Cards and other objects attach at their chest/side; the seated posture lifts the existing silhouette onto a seat without generating limb animations.

## Use the character layer

```js
import { createPawnCharacters } from "/pawn-character.js";

// One owner per scene. Every character shares its pose cache and effects atlas.
const cast = createPawnCharacters({ maxCacheBytes: 192 * 1024 * 1024 });
const visitor = cast.create(savedAppearance, {
  x: 300, y: 220, direction: "north-east", posture: "seated",
  onActionComplete(action, character, target) {
    if (action === "play-card") {
      // The game places the real table card at the animated landing point.
      placeTableCard(target, character);
    }
  },
});
await cast.warm([visitor]); // Current facing, all expressions, and shared effects.
visitor.act("hold-cards", { cardCount: 5 });
visitor.react("love", { duration: 2 });
visitor.setStatus("stinky", true);

// Once per update, in seconds. Supply actual movement after game collision.
visitor.update(dt, actualDx, actualDy);
visitor.draw(context);
// After ALL world furniture and actors:
visitor.drawOverhead(context);

visitor.dispose(); // Remove one character; shared art stays for the others.
cast.dispose();    // Scene shutdown: frees all characters, textures and effects.
```

`PawnCharacter` is also exported for a game-specific subclass; construct it with a live `cast`. No NPC decisions, transactions, navigation, collision, or inventory rules live in this presentation class.

Movement is actual screen/world-pixel displacement, not tile coordinates or velocity. `update()` uses distance for walking animation, retains facing when stopped, and stands up when movement begins. `face(direction)`, `teleport(x,y)`, `setPosture("standing"|"seated")`, and `setAppearance(look)` update presentation explicitly. `visible=false` skips drawing; continue updating time when an offscreen reaction should expire.

## Actions found in the shop

The existing shop's `CustomerSystem`, `StaffSystem`, and tournament runtime informed these primitives. This is a visual mapping, not a replacement for those systems.

| Shop behavior | Character presentation | Game-owned result |
| --- | --- | --- |
| Browse or notice merchandise | `browse`; idea, love, confused, or talk bubble | Select a fixture and evaluate its actual offer |
| Physical checkout/trade queue or event wait | `wait`; persistent clock bubble unless another reaction replaces it | Queue order, patience, and seat admission |
| Casual/tournament card play | Seated `hold-cards`, `shuffle`, `play-card` | Turn rules, hand contents, table card placement, winner |
| Sell or negotiate cards | `trade` with card fan; talk, angry, happy, or sad bubble | Offer acceptance and money/inventory changes |
| Checkout | `pay` with moving coin and receipt; sale bubble | Commit the validated transaction |
| Customer or staff booster opening | `open-pack` with lifting card and sparkles | Actual pack contents and rare-pull reaction |
| Carry purchases | `carry-bag` | Basket contents |
| Fetch/deliver stock or shipping work | `restock` with stock box | Stock movement and completed work |
| Sweep litter | `clean` with broom and glints | Remove the selected litter / restore cleanliness |
| Smelly visitor and freshening | `setStatus("stinky", true/false)`; fresh bubble | Hygiene rules, who performs cleanup, and its cost |
| Table dispute / judge ruling | `judge` with flag; confused, angry, talk, or happy bubble | Ruling and match continuation |
| Inspect/appraise/grade a card | `inspect` with card and magnifier | Actual condition, authenticity, or grade |
| Match win or special pull | `celebrate`; win or happy bubble | Award results and rewards |

`idle` is the neutral action. `CHARACTER_ACTIONS` exports labels, durations, and next actions. `play-card`, `shuffle`, and `open-pack` finish in `hold-cards`; `pay`, `judge`, and `celebrate` finish in `idle`. Other actions loop until changed. `act()` starts/restarts the action; call it on a gameplay event, not every frame.

One-shot completion invokes `onActionComplete(action, character, target)` exactly once. `target` is the snapshot supplied to `act()`, including its projection, or null. The callback may start another action. Holding/playing a card never changes the real hand or automatically decrements its count. Counts are bounded to 1–7 visible cards.

## Isometric table surfaces

Held cards follow the body mount. A played card travels from that mount to a supplied world/screen point; it can flatten onto any affine tabletop, including an isometric one:

```js
visitor.act("play-card", {
  cardCount: 5,
  target: {
    x: landingPoint.x,
    y: landingPoint.y,
    // Unit projected tabletop axes: x-right/down and y-left/down.
    projection: { a: .894427, b: .447214, c: -.894427, d: .447214 },
  },
});
```

The four projection coefficients use Canvas's affine convention: local x maps to `(a,b)` and local y to `(c,d)`. Supply finite axes with nonzero area. Omit projection for an upright/billboard card. Position and projection are copied when the action starts, so rotating a character or mutating the original point cannot move the destination midway through the animation.

The demo obtains both seats and landing points from the same projected table surface. It aligns the character's held-object anchor with the appropriate table edge. Tables, chairs, camera projection, and depth sorting belong to the game; the character layer assumes no rectangular or horizontal table.

## Sizing and depth

`character.layout(out)` exposes world-space `headX/headY/headScale`, conservative headgear `topY`, `heldX/heldY`, body position/width and prop scale, floor position, and current lift. Pass your own `out` object if retaining a snapshot; the default output is reused. The low-level pawn renderer exposes the same `layout(handle, options, out)` method.

Head and bubble size follow only head size. Body width/height affect body/held-object anchors and prop scale. Seating lift and idle/walk bob are shared by the head, body, and props. Stink wisps flank the body behind its silhouette and scale to body proportions. Floor anchors and game collision do not move with these visual offsets.

For an actor behind a table, the game can insert the tabletop before foreground-held objects:

```js
visitor.draw(context, { foreground: false }); // Rear props, stink, body and face.
drawTabletop(context);
visitor.drawForeground(context);             // Only near-side held objects.
// After remaining world objects and characters:
visitor.drawOverhead(context);               // Reactions and celebrations.
```

Rear-facing held props remain behind the pawn; the foreground pass does not redraw them. For an actor in front of the table, draw the table first and use ordinary `draw()`. Use the game's projected world depth to sort other characters and furniture.

## Reactions and status

`REACTIONS` contains happy, love, angry, confused, idea, waiting, sale, win, sad, surprised, talk, and fresh. Bubbles pop in, float subtly, and fade out. One active reaction replaces the previous one; there is no accumulating queue. The duration is .25–10 seconds. A reaction temporarily selects a suitable existing facial expression, then restores `character.expression`; `displayExpression` reports the current visible choice. `clearReaction()` dismisses it. Bubbles remain visible from behind so player-facing feedback is readable.

Stink is a separate persistent status, so a visitor can hold cards, react, and smell simultaneously. `setStatus("stinky", false)` removes the wisps immediately. The game may follow this with `react("fresh")`; the `clean` action does not silently change another character's hygiene.

## Resource ownership and verification

Every cast has one lazily created, fixed **1 MiB effects atlas** for all card counts, props, bubbles, stink frames, and bursts. Its memory is reserved inside `maxCacheBytes`, not added beyond the configured limit. Cached art is shared across every appearance, proportion, direction, and character. Drawing and changing actions/reactions never prepare another appearance. The existing body/face LRU remains bounded and is reused; there is no full sprite-sheet variant per action.

Warm characters before play. By default only each character's current facing is prepared. Pass `{directions: DIRECTIONS}` to warm all eight explicitly, or supply the likely upcoming directions. This keeps large seated crowds from allocating unused views; an unprepared facing still compiles on its first draw. `cast.stats()` includes body/face/effect bytes and build counters. Both `warm()` and `stats()` report the total budget including effects. Dispose individual characters when removed and dispose the cast when leaving the scene. A disposed character cannot be updated or drawn.

`npm test` checks action lifecycle, elapsed-time expiry, target snapshots, sizing, layering, palette, ownership, and 1,000-character reuse. The browser lab's **Check actions and attachments** compares ordinary and explicitly split drawing byte-for-byte and checks reaction clearance for all views, actions, reactions, postures, and representative proportions. The crowd benchmark measures actual browser performance at explicitly selected native or double sprite resolution, with current-facing or all-direction warm-up; unit cache tests use a stub canvas.

Actions and effects are composed at runtime. Existing PNG atlas exports remain idle/walk body-and-face frames; they do not bake every action/status combination into separate character sheets.

## Recorded local performance

Chrome 157 on macOS arm64, 960×540 crowd canvas, with every character showing a held action and a timed bubble and 20% showing stink wisps:

| Characters | Body sprite scale | Warmed views | FPS snapshot | p95 CPU draw | Pixel buffers |
| --- | --- | --- | --- | --- | --- |
| 500 | Native | Current per character | 98 | 5.9 ms | 19.4 MiB |
| 1,000 | Native | Current per character | 54 | 19.0 ms | 35.2 MiB |
| 1,000 | Native | All eight, periodic turns | 19 | 68.5 ms | 190.0 MiB |
| 1,000 | Double | All eight, periodic turns | 17 | 54.9 ms | 190.0 MiB |

Every sample had zero body, face, or effect rebuilds after warm-up and zero evictions. Timings varied between runs; these are device/session observations. The full 1,000-character overlay workload does not reliably hold 60 fps on this setup. Warm current facings by default, prewarm extra views selectively, and let the game cull offscreen characters/overheads. Buffer figures exclude browser heap and GPU copies. Full conditions and limitations are in [character-benchmark.json](character-benchmark.json).
