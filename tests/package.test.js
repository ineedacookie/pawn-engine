import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("release tarball works as an isolated JavaScript and TypeScript dependency", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const temporary = await mkdtemp(join(tmpdir(), "pawn-package-"));
  try {
    const [packed] = JSON.parse(execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", temporary], { cwd: root, encoding: "utf8" }));
    const paths = packed.files.map(file => file.path);
    for (const path of ["public/pawn-engine.js", "public/pawn-engine.d.ts", "public/pawn-character.js", "public/pawn-character.d.ts", "public/pawn-effects.js", "public/example.html", "public/example.js"])
      assert.ok(paths.includes(path), `Missing ${path}`);
    assert.ok(paths.every(path => !/^(tests|node_modules|output|\.github)\//.test(path)));
    assert.ok(!paths.includes("server.mjs"));
    const installed = join(temporary, "node_modules/pawn-engine");
    await mkdir(installed, { recursive: true });
    execFileSync("tar", ["-xf", join(temporary, packed.filename), "--strip-components=1", "-C", installed]);
    // Neither the consumer nor the tarball has access to the source tree's files.
    execFileSync(process.execPath, ["--input-type=module", "-e", `
      import assert from "node:assert/strict";
      import { normalizeAppearance, DIRECTIONS, atlasMetadata } from "pawn-engine";
      import { createPawnCharacters, REACTIONS } from "pawn-engine/characters";
      assert.equal(normalizeAppearance().version, 2);
      assert.equal(DIRECTIONS.length, 8);
      assert.equal(atlasMetadata().rows, 8);
      const cast = createPawnCharacters();
      const character = cast.create().react(REACTIONS[0]);
      assert.equal(character.reaction, "happy");
      cast.dispose();
    `], { cwd: temporary, stdio: "pipe" });
    await copyFile(join(root, "tests/types/consumer.ts"), join(temporary, "consumer.mts"));
    execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "--strict", "--noEmit", "--target", "ES2022", "--module", "NodeNext", "--lib", "ES2022,DOM", join(temporary, "consumer.mts")], { cwd: temporary, stdio: "pipe" });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
