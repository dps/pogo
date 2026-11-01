// The root AGENTS.md is how agents find their way around, so every name it mentions has to be real.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, ".."), demos = join(root, "demos");
const guide = readFileSync(join(root, "AGENTS.md"), "utf8");
const catalog = JSON.parse(readFileSync(join(demos, "catalog.json"), "utf8"));
const built = readdirSync(demos, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const isBuilt = (f) => existsSync(join(demos, f, "game.js"));
const source = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name === "shots" ? [] : source(join(dir, e.name));
    return /\.(js|mjs)$/.test(e.name) && e.name !== "pogo.js" ? [readFileSync(join(dir, e.name), "utf8")] : [];
});

test("every game is in the catalogue and the guide", () => {
    for (const f of built) {
        assert.ok(catalog.some((g) => g.folder === f), `${f} is missing from demos/catalog.json`);
        assert.ok(guide.includes(`| \`${f}\` |`), `${f} is missing from the table in AGENTS.md`);
        assert.ok(guide.includes(`**\`${f}\`,`) || guide.includes(`**\`${f}\`, `), `${f} has no tweak notes in AGENTS.md`);
    }
    for (const g of catalog) assert.ok(guide.includes(`| \`${g.folder}\` |`), `${g.folder} is in the catalogue but not in AGENTS.md`);
});

test("the paths the guide names exist", () => {
    for (const [, path] of guide.matchAll(/`([a-z]+\/[\w./-]+\.(?:js|mjs))`/g)) {
        const folder = path.split("/")[0];
        if (["tools", "dist", "bin", "examples", "games", "data", "art", "music", "ui", "scenes"].includes(folder) || !isBuilt(folder)) continue;
        assert.ok(existsSync(join(demos, path)), `AGENTS.md names ${path}, which doesn't exist`);
    }
});

test("each game's notes name real files, tools and tables", () => {
    const sections = guide.split(/\n(?=\*\*`)/).filter((s) => /^\*\*`[a-z]+`,/.test(s));
    assert.ok(sections.length >= catalog.length - 1);
    for (const section of sections) {
        const folder = /^\*\*`([a-z]+)`/.exec(section)[1];
        if (!isBuilt(folder)) continue;
        const dir = join(demos, folder), code = source(dir).join("\n"), text = section.split("\n")[0];
        for (const [, name] of text.matchAll(/`([\w./-]+\.(?:js|mjs))`/g)) {
            if (name.includes("/") && !name.startsWith("tools/") && existsSync(join(demos, name))) continue;
            const found = existsSync(join(dir, name)) || existsSync(join(dir, "tools", name)) || existsSync(join(dir, "data", name)) || existsSync(join(dir, "music", name));
            assert.ok(found, `${folder}: AGENTS.md names ${name}, which doesn't exist`);
        }
        for (const [, name] of text.matchAll(/`([A-Z][A-Z_]{2,})`/g)) assert.ok(code.includes(name), `${folder}: AGENTS.md names ${name}, which isn't in the code`);
    }
});

test("pogo list finds games and pogo new forks one with the latest framework", () => {
    const pogo = (...args) => execFileSync(process.execPath, [join(root, "bin/pogo.js"), ...args], { encoding: "utf8" });
    assert.match(pogo("list", "falling"), /blocks/);
    const dir = mkdtempSync(join(tmpdir(), "pogo-fork-")), target = join(dir, "mine");
    try {
        assert.match(pogo("new", target, "--from", "merge"), /save keys/);
        assert.ok(existsSync(join(target, "game.js")));
        assert.ok(!existsSync(join(target, "shots")));
        assert.equal(readFileSync(join(target, "pogo.js"), "utf8"), readFileSync(join(root, "dist/pogo.js"), "utf8"));
        assert.equal(readFileSync(join(target, "AGENTS.md"), "utf8"), readFileSync(join(root, "docs/API.md"), "utf8"));
    } finally { rmSync(dir, { recursive: true }); }
});
