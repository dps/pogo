// Contact sheet: node tools/sheet.mjs out.png a.png b.png ...
import { readFileSync } from "node:fs";
import { chromium } from "../../../node_modules/playwright-core/index.mjs";
const [out, ...files] = process.argv.slice(2), h = 640;
const imgs = files.map((f) => `<img src="data:image/png;base64,${readFileSync(f).toString("base64")}" style="height:${h}px;margin:2px">`).join("");
const b = await chromium.launch({ channel: "chrome" }), p = await b.newPage({ viewport: { width: 1900, height: 10 } });
await p.setContent(`<body style="margin:0;background:#222;display:flex;flex-wrap:wrap">${imgs}</body>`);
await p.waitForTimeout(200); await p.screenshot({ path: out, fullPage: true }); await b.close();
