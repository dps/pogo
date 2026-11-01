// node tools/montage.mjs out.png cols height a.png b.png ... : a contact sheet, so many shots can be read at once.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(resolve(import.meta.dirname, "../../../package.json"));
const { chromium } = require("playwright-core");
const [out, cols, h, ...files] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
const imgs = files.map((f) => `<img style="height:${h}px;display:block" src="data:image/png;base64,${readFileSync(f).toString("base64")}">`).join("");
await p.setContent(`<body style="margin:0;background:#222"><div id=g style="display:inline-grid;gap:4px;grid-template-columns:repeat(${cols},auto)">${imgs}</div>`);
const el = await p.$("#g");
await el.screenshot({ path: out });
await b.close();
