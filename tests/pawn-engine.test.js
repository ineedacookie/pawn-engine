import test from "node:test";
import assert from "node:assert/strict";
import { ANIMATION, PAWN_PALETTE, PAWN_OUTLINE, nearestPaletteColor, CLASS_PRESETS, DIRECTIONS, PAWN_OPTIONS, createAtlas, atlasMetadata, directionFromVector, frameIndex, normalizeAppearance } from "../public/pawn-engine.js";

test("normalizes version 2 appearance defaults and preserves parts and maps custom colors to the standard palette", () => {
  assert.deepEqual(normalizeAppearance(), normalizeAppearance({ version: 2 }));
  const look = normalizeAppearance({ hair: "curly", colors: { clothes: "#123456" }, proportions: { width: 1.2 } });
  assert.equal(look.hair, "curly"); assert.equal(look.colors.clothes, "#533b37"); assert.equal(look.proportions.width, 1.2);
});

test("rejects invalid parts, colors, proportions and versions with readable errors", () => {
  for (const input of [{ version: 1 }, { hat: "unknown" }, { colors: { skin: "red" } }, { proportions: { height: 2 } }])
    assert.throws(() => normalizeAppearance(input), /Unsupported|Color|height/);
});

test("maps screen movement to eight directions and retains facing when stopped", () => {
  assert.equal(DIRECTIONS.length, 8);
  assert.equal(directionFromVector(0, 1), "south");
  assert.equal(directionFromVector(1, 0), "east");
  assert.equal(directionFromVector(-1, -1), "north-west");
  assert.equal(directionFromVector(0, 0, "north-east"), "north-east");
});

test("selects bounded idle and walk frames", () => {
  assert.equal(frameIndex("idle", 0), 0); assert.equal(frameIndex("idle", .99), 3);
  assert.equal(frameIndex("walk", .999), 7); assert.equal(frameIndex("walk", 1), 0);
  assert.throws(() => frameIndex("run"), /Unsupported animation/);
  assert.equal(ANIMATION.walk.frames, 8);
});

test("exports atlas metadata with eight rows, twelve frames per row, anchors and scale", () => {
  const meta = atlasMetadata({}, {scale:1});
  assert.equal(meta.width, 768); assert.equal(meta.height, 640);
  assert.deepEqual(meta.footAnchor, { x: 32, y: 72 });
  assert.equal(meta.frames.south.idle.length, 4); assert.equal(meta.frames.north.walk.length, 8);
  assert.equal(atlasMetadata({}, {scale:2}).width, 1536);
  assert.throws(() => atlasMetadata({}, {scale:3}), /scale/);
});


test("wardrobe options survive saved look and atlas metadata round trips", () => {
  for (const part of ["hair", "outfit", "hat", "bag", "back", "belt"]) {
    for (const value of PAWN_OPTIONS[part]) {
      const appearance = normalizeAppearance({ [part]: value });
      assert.equal(normalizeAppearance(JSON.parse(JSON.stringify(appearance)))[part], value);
      assert.equal(atlasMetadata(appearance).appearance[part], value);
    }
  }
});

test("expressions are draw/export state rather than appearance and legacy values are rejected", () => {
  assert.equal("expression" in normalizeAppearance(), false);
  assert.throws(() => normalizeAppearance({expression:"happy"}), /Pass expression to draw/);
  assert.throws(() => normalizeAppearance({hair:"braids"}), /Unsupported hair/);
  assert.throws(() => normalizeAppearance({version:1}), /Unsupported appearance version/);
  const meta = atlasMetadata({}, {expression:"surprised",scale:2});
  assert.equal(meta.version,2);assert.equal(meta.appearance.version,2);
  assert.equal(meta.expression,"surprised");assert.equal(meta.width,1536);
  assert.throws(() => atlasMetadata({}, {expression:"invalid"}), /Unsupported expression/);
  for (const exportAsset of [atlasMetadata, createAtlas]) {
    assert.throws(() => exportAsset({}, 2), /options must be an object/);
    assert.throws(() => exportAsset({}, {expression:"constructor"}), /Unsupported expression/);
  }
});

test("fantasy presets and equipment export as editable version 2 appearances", () => {
  for (const preset of Object.values(CLASS_PRESETS)) {
    const look = normalizeAppearance(preset);
    assert.equal(atlasMetadata(look).appearance.back, preset.back);
    assert.equal(atlasMetadata(look).appearance.belt, preset.belt);
  }
  const oldLook = normalizeAppearance({outfit:"tunic"});
  assert.equal(oldLook.back,"none"); assert.equal(oldLook.belt,"none");
  assert.equal(normalizeAppearance({...oldLook,back:"quiver",belt:"sword",bag:"pouch"}).belt,"sword");
  assert.throws(()=>normalizeAppearance({back:"unknown"}),/Unsupported back/);
});




test("all appearance colors use the shared palette with solid black ink", () => {
  assert.equal(PAWN_OUTLINE,"#000000");
  const allowed=new Set(PAWN_PALETTE.map(swatch=>swatch.color));
  for(const swatch of PAWN_PALETTE)assert.equal(nearestPaletteColor(swatch.color.toUpperCase()),swatch.color);
  for(const preset of [{},...Object.values(CLASS_PRESETS)]){
    const look=normalizeAppearance(preset);
    for(const color of Object.values(look.colors))assert.ok(allowed.has(color));
    assert.deepEqual(normalizeAppearance(look),look);
  }
  const original={colors:{skin:"#abcdef"}};
  assert.ok(allowed.has(normalizeAppearance(original).colors.skin));
  assert.equal(original.colors.skin,"#abcdef");
});
