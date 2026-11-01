// Hosts this folder on an ephemeral port and opens it in Chrome. Shared by the browser tools.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
export const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "../../package.json"));
export const { chromium } = require("playwright-core");
const TYPES = { ".html": "text/html", ".js": "text/javascript" };
export async function host(frameHtml) {
    const server = createServer(async (req, res) => {
        const path = new URL(req.url, "http://x").pathname;
        try {
            if (path === "/frame.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(frameHtml ?? ""); return; }
            const body = await readFile(join(root, path === "/" ? "index.html" : path));
            res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] ?? "application/octet-stream", "access-control-allow-origin": "*" }); res.end(body);
        } catch { res.writeHead(404); res.end(); }
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    return { server, url: `http://127.0.0.1:${server.address().port}/` };
}
export const launch = () => chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
