import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createWorkshopServer } from "../server.mjs";

async function withServer(check) {
  const server = createWorkshopServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await check(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("standalone workshop serves its entry points and all browser dependencies", () => withServer(async base => {
  for (const [path, type] of [["/", "text/html"], ["/characters.html", "text/html"], ["/characters.css", "text/css"], ["/characters.js", "text/javascript"], ["/character-checks.js", "text/javascript"], ["/pawn-character.js", "text/javascript"], ["/pawn-effects.js", "text/javascript"], ["/pawns.html", "text/html"], ["/pawn-review.html", "text/html"], ["/pawn-engine.js", "text/javascript"], ["/expression-checks.js", "text/javascript"], ["/pawns.js", "text/javascript"], ["/pawns.css", "text/css"], ["/favicon.svg", "image/svg+xml"]]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get("content-type").startsWith(type), path);
    assert.ok((await response.text()).length > 0, path);
  }
}));

test("server only exposes workshop files and rejects writes", () => withServer(async base => {
  for (const path of ["/package.json", "/.git/config", "/README.md", "/%2e%2e/package.json", "/missing"]) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  const head = await fetch(base + "/pawn-engine.js", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  const write = await fetch(base + "/pawns.html", { method: "POST" });
  assert.equal(write.status, 405);
  assert.equal(write.headers.get("allow"), "GET, HEAD");
}));
