import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const files = new Map([
  ["pawns.html", "text/html; charset=utf-8"],
  ["pawn-review.html", "text/html; charset=utf-8"],
  ["pawn-engine.js", "text/javascript; charset=utf-8"],
  ["pawns.js", "text/javascript; charset=utf-8"],
  ["pawns.css", "text/css; charset=utf-8"],
  ["favicon.svg", "image/svg+xml"],
]);

export function createWorkshopServer() {
  return createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let pathname;
    try {
      pathname = new URL(req.url, "http://localhost").pathname;
    } catch {
      res.writeHead(400).end();
      return;
    }
    const name = pathname === "/" ? "pawns.html" : pathname.slice(1);
    const contentType = files.get(name);
    if (!contentType) {
      res.writeHead(404).end("Not found");
      return;
    }
    try {
      const content = await readFile(new URL(`./public/${name}`, import.meta.url));
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": content.length,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      res.writeHead(500).end("Could not load workshop file");
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const server = createWorkshopServer();
  server.on("error", error => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(Number(process.env.PORT || 4174), "127.0.0.1", () => {
    console.log(`Pawn workshop: http://127.0.0.1:${server.address().port}`);
  });
}
