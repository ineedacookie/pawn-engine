# Workshop and game integration

Open `/pawns.html` on the local server to customize people independently of room editing. The class selector offers warrior, knight, monk, archer, ranger, mage, cleric, rogue and bard starting looks. Each remains editable through clothing, headgear, bag, back equipment, belt equipment and color controls. Back equipment and belt equipment are separate slots. Appearance JSON and sprite atlas exports retain those choices; older looks receive empty equipment slots. `/pawn-review.html` shows each wardrobe part and class across all eight directions and checks animation atlas boundaries at default, minimum and maximum proportions.

Pawn colors use the shared 25-color concept palette. Existing and imported hex colors map to the nearest swatch; asset contours use solid black. Subtle interior shading remains available in the renderer.


### Game runtime for varied crowds

Use prepared handles in the game loop. The engine caches one static pose per direction in shared 1024×640 texture pages; idle/walk bobbing and floor shadows are composed while drawing. Exported PNG atlases retain their existing 96-frame format.

```js
import { createPawnRenderer, DIRECTIONS } from "/pawn-engine.js";

const renderer = createPawnRenderer({ maxCacheBytes: 96 * 1024 * 1024 });
const pawn = renderer.prepare(savedAppearance);
// Run during loading/spawn preparation, not inside the render loop.
await renderer.warm([{ pawn, directions: DIRECTIONS }], { budgetMs: 4 });

// Each frame: update position, facing and animation progress in the game.
renderer.draw(context, pawn, {
  x: entity.x, y: entity.y,
  direction: entity.direction, state: entity.walking ? "walk" : "idle",
  progress: entity.animationProgress,
});

renderer.release(pawn); // When this entity no longer needs its appearance.
renderer.dispose();    // At scene shutdown: releases all texture pages.
```

Prepare once per appearance change. Handles are immutable snapshots and identical appearances share poses. Release every handle you prepare; shared poses remain until the last handle is released. Released slots are reused; allocated pages remain pooled until `clear()` or `dispose()`. `clear()` drops textures but keeps live handles valid, so warm them again before resuming. A disposed renderer cannot be used again.

The default 96 MiB budget holds 4,864 direction poses (608 looks if all eight directions are resident). Pages allocate only as needed: 500 fully prepared looks use about 80 MiB of pixel buffers, while 1,000 looks with only their current facing use about 20 MiB. These numbers exclude browser/GPU copies and other game assets. For 1,000 looks with every facing resident, configure at least 160 MiB; the sandbox benchmark uses a 192 MiB limit.

`warm()` yields between batches, accepts an AbortSignal and progress callback, and rejects a batch larger than cache capacity. Warm only likely visible poses or increase the explicit memory budget. Eviction happens per direction pose rather than per full animation atlas. A missing direction still compiles synchronously on its first draw, so prewarm direction changes when a hitch would matter. Cull offscreen entities in the game. The backwards-compatible `drawFrame()` accepts mutable JSON but validates and serializes it each call; use `preparePawn()` / `drawPreparedPawn()` or a renderer instance for performance-sensitive drawing.

The workshop benchmark supports 100, 500 and 1,000 genuinely unique looks, fixed facings or all-direction turns. It reports warm-up time, frame rate, p95 crowd drawing time, pose memory and any pose builds after warm-up. Rendering counters are available through `renderer.stats()`. Performance depends on the target device and the rest of the game; benchmark on your intended hardware.
