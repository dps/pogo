// node tools/view.mjs out.png a.png b.png ...: tile shots for review. Rendered by Chrome.
import { readFileSync } from "node:fs"; import { createRequire } from "node:module";
const require = createRequire(new URL("../../../package.json", import.meta.url)); const { chromium } = require("playwright-core");
const [out, ...files] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, channel: "chrome" });
const pg = await b.newPage({ viewport: { width: 1560, height: 800 } });
await pg.setContent(`<body style="margin:0;background:#333;display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start">${files.map((f) => `<img style="max-height:${files.length > 4 ? 396 : 800}px;max-width:${files.length > 4 ? 760 : 900}px" src="data:image/png;base64,${readFileSync(f).toString("base64")}">`).join("")}</body>`);
await pg.waitForTimeout(150); await pg.screenshot({ path: out }); await b.close();
