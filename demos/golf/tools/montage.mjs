// Contact sheets of a shot folder. usage: node tools/montage.mjs <dir> <out-prefix>
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const require = createRequire(resolve(import.meta.dirname, "../../../package.json"));
const { chromium } = require("playwright-core");
const [dir, out] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, channel: "chrome" });
for (const [tag, w] of [["-phone.png", 170], ["-phone-landscape.png", 400], ["-desktop.png", 330]]) {
    const files = readdirSync(dir).filter((f) => f.endsWith(tag)).sort();
    const html = `<body style="margin:0;background:#222;display:flex;flex-wrap:wrap;gap:6px;width:${tag === "-phone.png" ? 1400 : 1240}px;font:11px sans-serif;color:#fff">` + files.map((f) => `<div><img src="data:image/png;base64,${readFileSync(join(dir, f)).toString("base64")}" style="width:${w}px;display:block"><div>${f}</div></div>`).join("");
    const p = await b.newPage({ viewport: { width: tag === "-phone.png" ? 1400 : 1240, height: 900 } });
    await p.setContent(html); await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}${tag}`, fullPage: true });
    await p.close();
}
await b.close();
