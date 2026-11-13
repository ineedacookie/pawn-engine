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

Open [the character actions lab](http://127.0.0.1:4174/characters.html), [the workshop](http://127.0.0.1:4174/) or [the wardrobe direction review](http://127.0.0.1:4174/pawn-review.html). Set `PORT` to choose another local port.

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
  expression: "excited", // Change per entity without preparing another look.
});

// On entity removal and scene shutdown, respectively:
renderer.release(pawn);
renderer.dispose();
```

Prepared handles share static body poses and small masked expression sheets in one bounded texture pool. Faces are shared across wardrobe colors and proportions; reacting only selects another sprite crop. Idle/walk motion and floor shadows are composed while drawing. Prepare on appearance changes, warm before play, and cull offscreen pawns. The full 96-frame PNG atlas remains available for external engines.

See [workshop and integration details](docs/usage.md) for cache ownership, memory budgets, appearance controls, and exports.

## Character actions

The [character layer](docs/characters.md) adds holding/playing/shuffling cards, booster opening, checkout, shopping bags, stock boxes, cleaning, judging, inspection, and celebrations. Twelve drawn reaction bubbles and animated stink wisps use the same palette and black outlines. Pawns stay armless and legless.

`createPawnCharacters()` shares one effects atlas across a scene. Actions, status, and reactions are independent of appearance. Body/head proportions, eight directions, seating, and isometric table landing projections are supported. The game keeps ownership of movement/collision, inventory, transactions, and NPC decisions.

## Performance

The workshop benchmarks 100, 500, or 1,000 distinct looks with independent reactions. The stress mode changes every pawn's expression every frame and turns through all eight views. After warm-up, expression changes rebuild neither bodies nor faces.

The default cache budget is 128 MiB. For 1,000 fully varied looks with all directions and expressions warm, use 192 MiB (about 189 MiB of allocated pixel buffers in the workshop). Face sheets are shared by hair/headgear/direction rather than duplicated per pawn or expression.

Recorded body/face measurements are in [benchmark.json](docs/benchmark.json); full action/reaction crowd measurements and limits are in [character-benchmark.json](docs/character-benchmark.json). Pixel-buffer figures exclude browser/GPU copies and other game assets; benchmark your target hardware.

## Repository contents

- `public/pawn-engine.js`: reusable engine, attachment layout, and atlas export API.
- `public/pawn-character.js` and `pawn-effects.js`: character lifecycle, shared action props, reaction bubbles, and status effects.
- `public/characters.*` and `character-checks.js`: isometric table sandbox, attachment verification, and character crowd test.
- `public/pawns.*`: interactive customization and movement sandbox.
- `public/pawn-review.html` and `expression-checks.js`: wardrobe combinations, layer/profile checks, and expression alignment/occlusion checks against vector exports.
- `tests/`: appearance, animation, atlas, cache, and standalone server checks. Cache tests use a stub canvas; visual checks run in a real browser.
- `server.mjs`: local-only static workshop server.

## API version

Version 0.3 uses appearance schema 2. Expressions are a `draw()` or export option, never part of appearance. Legacy global rendering helpers, mutable JSON drawing, and version-1 migration support have been removed. See [usage](docs/usage.md) for the complete interface.

## Review policy

Changes to `main` require code-owner approval from `@ineedacookie`, including for administrators. Run `npm test` locally before review; GitHub Actions is not configured. See [CONTRIBUTING.md](CONTRIBUTING.md) for the owner-authored pull request limitation.
