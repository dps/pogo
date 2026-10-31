// Produces dist/pogo.js (readable, for agents), dist/pogo.min.js and dist/pogo.d.ts, then copies the runtime into the template.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, statSync } from "node:fs";

mkdirSync("dist", { recursive: true });
const base = { entryPoints: ["src/index.ts"], bundle: true, format: "esm", target: "es2022", legalComments: "none", charset: "utf8" };
await build({ ...base, outfile: "dist/pogo.js" });
await build({ ...base, outfile: "dist/pogo.min.js", minify: true });
execFileSync(process.execPath, ["node_modules/dts-bundle-generator/dist/bin/dts-bundle-generator.js", "--no-check", "-o", "dist/pogo.d.ts", "src/index.ts"], { stdio: "ignore" });
for (const f of ["pogo.js", "pogo.d.ts"]) copyFileSync(`dist/${f}`, `template/${f}`);
console.log(`dist/pogo.js ${(statSync("dist/pogo.js").size / 1024).toFixed(0)} KB, min ${(statSync("dist/pogo.min.js").size / 1024).toFixed(0)} KB`);
