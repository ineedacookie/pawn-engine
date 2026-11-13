# Workshop and game integration

For card-table actions, reaction bubbles, seated characters, and stink effects, use the [character layer](characters.md).

Run `npm start` and open `/pawns.html`. Customize clothing, hair, headgear, bags, back equipment, belt equipment, colors, and proportions. Class presets include warrior, knight, monk, archer, ranger, mage, cleric, rogue, and bard. Colors map to the shared 25-color palette; contours use solid black.

Expressions are independent runtime state. Changing the workshop's expression control does not prepare another appearance. The crowd benchmark offers independent reaction events and a stress mode in which every pawn changes expression every frame. `/pawn-review.html` reviews wardrobe angles and runs real-canvas expression alignment and occlusion checks.

## Rendering a reacting crowd

```js
import { createPawnRenderer, DIRECTIONS } from "/pawn-engine.js";

const renderer = createPawnRenderer({ maxCacheBytes: 192 * 1024 * 1024 });
const pawn = renderer.prepare({ hair: "long", outfit: "ranger" });
await renderer.warm([{ pawn, directions: DIRECTIONS }], { budgetMs: 4 });

// Inside the game loop. Each entity owns its reaction state.
renderer.draw(context, pawn, {
  x: entity.x, y: entity.y,
  direction: entity.direction,
  state: entity.walking ? "walk" : "idle",
  progress: entity.animationProgress,
  expression: entity.expression,
});

renderer.release(pawn); // When this prepared handle is no longer needed.
renderer.dispose();    // When the scene is unloaded.
```

Supported expressions are exported as `EXPRESSIONS`: `happy`, `neutral`, `excited`, `sleepy`, and `surprised`. `draw()` defaults to `happy` and rejects unsupported expressions. The game decides reactions, durations, and transitions; the engine displays the selected expression immediately. There is no behavior or AI system.

Positions are floor anchors. Directions use screen coordinates and the exported `DIRECTIONS` compass names. Use `directionFromVector(dx, dy, previousFacing)` to retain facing at rest. Movement, collision, offscreen culling, and depth sorting belong to the game.

## Cache and ownership

Prepare only when appearance changes. Handles are immutable snapshots; identical appearances share body poses. Release every prepared handle. Expressions are not part of appearance or its cache key.

Each body direction occupies one 64×84 slot. Each visible face direction uses one additional shared slot holding all five 32×26 expression sprites (double resolution for a compact 16×13 head-space window). Face sheets are shared by hair/headgear combination, across skin colors, clothing, body proportions, and head sizes. Head scale and attachment are applied during drawing. Faces are masked behind hair/headgear and omitted in rear views and closed helmets.

Body poses and face sheets share a bounded LRU pool of 1024×672 RGBA pages (2.625 MiB each). No full-character variants are created for expression changes. After warm-up, switching expressions only changes the face source rectangle; drawing performs no appearance normalization, JSON serialization, or canvas allocation. A visible pawn normally costs three image draws: shadow, body, and face; hidden faces skip the third draw.

The default 128 MiB limit holds 6,144 combined body/face slots. The pool also accounts for a 4 KiB shadow, 3.25 KiB temporary face mask, and 21 KiB reusable raster buffer. Face overhead depends on wardrobe diversity, not pawn count. With every current hair/headgear combination represented, at most 1,120 face sheets are needed (five visible directions; closed helmets need none).

For 1,000 unique looks with all eight directions resident, use 192 MiB. The workshop's full-diversity stress case uses about 189 MiB of pixel buffers, including shared expression sheets. These counts exclude GPU copies, browser heap, and other game assets.

`warm([{pawn, directions}], options)` prepares requested bodies and **all expressions** for those directions. It yields between batches, accepts `signal` and `onProgress({completed,total})`, and rejects a requested working set larger than cache capacity. A cache miss still compiles synchronously during `draw()`. Prewarm likely direction changes to avoid hitches; do not regenerate looks when reactions change.

`release()` frees body slots when the last identical handle is released; shared face slots remain while another appearance of that style needs them. Allocated pages stay pooled for reuse. `clear()` releases pixel buffers but leaves live handles valid: warm again before play. `dispose()` releases the entire renderer and makes it unusable.

`renderer.stats()` reports allocated bytes, page count, resident body poses, face sheets/sprites, appearances, body builds, face builds, cache hits/misses/evictions, preparations, and slot capacity. Monitor both build counters after warm-up. Avoid keeping more active directions than the chosen budget can hold.

## Appearance files and exports

Appearance schema version 2 contains wardrobe selections, colors, and proportions. It has no expression or shoe color. Version-1 imports, the removed `braids` style, and `appearance.expression` are unsupported. There are no migration adapters, mutable-appearance drawing methods, or global renderer wrappers; use a renderer instance.

```js
import { createAtlas, atlasMetadata } from "/pawn-engine.js";

const options = { scale: 2, expression: "excited" };
const canvas = createAtlas(pawn.appearance, options);
const metadata = atlasMetadata(pawn.appearance, options);
```

Atlas exports draw original vector geometry at native or double resolution. Each atlas contains one selected expression, eight direction rows, and twelve columns (four idle plus eight walking frames). Version-2 metadata includes the expression separately from appearance, frame rectangles, animation timing, foot anchor, and collision radius. Export multiple expressions explicitly if another engine needs separate full sprite sheets.

## Verification

Run `npm test` for appearance, export layout, ownership, bounded-cache, cancellation, and expression switching tests. Runtime unit tests use a stub canvas and are not performance measurements.

For real rendering, open `/pawn-review.html`, inspect all angles at default/minimum/maximum proportions, and click **Check expression layers**. The audit compares expression changes against vector atlas exports, checks changes remain in the face region, verifies alignment/occlusion within documented raster sampling tolerances, and checks hidden faces remain unchanged.

The crowd benchmark supports 100, 500, or 1,000 unique looks, fixed facings or all-direction turns, and staggered or every-frame expression changes. It reports frame rate, p95 crowd drawing time, pixel-buffer memory, expression change count, and both build counters after warm-up. Measure on target hardware with the rest of the game running. Saved browser samples and limitations are in `benchmark.json`.
