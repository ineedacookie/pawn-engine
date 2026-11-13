# Pawn Engine

A dependency-free JavaScript Canvas 2D engine for customizable, rounded character pawns. Includes a standalone workshop, eight viewing directions, idle/walk animation, fantasy class presets, wardrobe review tools, sprite exports, and a crowd benchmark.

Extracted from Roompix; the engine and workshop run independently of the room editor. No AI calls, external art, runtime libraries, or build step are required.

## Run locally

Requires Node.js 22 or newer. No package installation is needed.

```sh
git clone https://github.com/ineedacookie/pawn-engine.git
cd pawn-engine
npm start
```

Open [the workshop](http://127.0.0.1:4174/) or [the wardrobe direction review](http://127.0.0.1:4174/pawn-review.html). Set `PORT` to choose another local port.

```sh
npm test
```

## Use in a game

Serve `public/pawn-engine.js` with your game and import it as a browser ES module. Keep movement, facing, collision, and depth sorting in your game. The renderer draws relative to the pawn's foot position.

```js
import { createPawnRenderer, DIRECTIONS } from "/pawn-engine.js";

const renderer = createPawnRenderer();
const pawn = renderer.prepare({ hair: "long", outfit: "ranger" });
await renderer.warm([{ pawn, directions: DIRECTIONS }]);

// Inside your render loop; progress is the animation cycle fraction.
renderer.draw(context, pawn, {
  x: 100, y: 150, direction: "south-east", state: "walk", progress: 0.25,
});

// On entity removal and scene shutdown, respectively:
renderer.release(pawn);
renderer.dispose();
```

Prepared handles share static direction poses in bounded texture pages. Idle/walk motion and floor shadows are composed while drawing. Prepare on appearance changes, warm before play, and cull offscreen pawns. The full 96-frame PNG atlas remains available for external engines.

See [workshop and integration details](docs/usage.md) for cache ownership, memory budgets, appearance controls, and exports.

## Performance

The workshop benchmarks 100, 500, or 1,000 distinct looks. Recorded local Chrome/macOS arm64 samples:

| Unique looks | Cached directions | FPS | Pose buffers |
| --- | --- | --- | --- |
| 500 | All eight | 120 | 80 MiB |
| 1,000 | All eight | 101 | 157.5 MiB |
| 1,000 | Current facing | 120 | 20 MiB |

These session measurements are not a device-independent guarantee. Pixel-buffer figures exclude browser/GPU copies and other game assets. No poses rebuilt after warm-up in these samples. Full details and limitations are in [benchmark.json](docs/benchmark.json).

## Repository contents

- `public/pawn-engine.js`: reusable engine and atlas export API.
- `public/pawns.*`: interactive customization and movement sandbox.
- `public/pawn-review.html`: wardrobe combinations, layer checks, profile checks, and runtime/export comparison.
- `tests/`: appearance, animation, atlas, cache, and standalone server checks. Cache tests use a stub canvas; visual checks run in a real browser.
- `server.mjs`: local-only static workshop server.

## Review policy

Changes to `main` require code-owner approval from `@ineedacookie`, including for administrators. Run `npm test` locally before review; GitHub Actions is not configured. See [CONTRIBUTING.md](CONTRIBUTING.md) for the owner-authored pull request limitation.
