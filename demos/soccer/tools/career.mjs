// Plays the whole game through the real scenes and buttons: league ladder to the Fells title, then the cup.
// node tools/career.mjs [botLevel] [maxMatches]
import "../game.js";
import { makeBot } from "./humanbot.mjs";
const game = globalThis.__pogo, lvl = Number(process.argv[2] ?? 3), MAX = Number(process.argv[3] ?? 120);
let matches = 0, log = [], stepsTotal = 0, t0 = Date.now();
const press = (lab) => {
    const e = game.current.entities.find((x) => x.btnLabel === lab);
    if (!e) return false;
    game.input.tap(e.pos.x, e.pos.y); return true;
};
game.restart("title", {}, { seed: 5 });
let last = "", guard = 0, wantCup = false, doneCup = false, botSeed = 1;
const save = () => JSON.parse(JSON.stringify((await_load())));
function await_load() { return loadSave(game); }
import { loadSave, TIERS, sortedTable } from "../data.js";
loadSave(game).settings.music = false; loadSave(game).settings.sfx = false;
let fells, ff = 0; const firstFells = (S) => (ff ||= S.season.year);
while (matches < MAX) {
    const n = game.currentName, S = loadSave(game);
    if (!wantCup && (S.trophies.some((t) => t.name === "High Fells") || (S.tier === 2 && S.season?.tier === 2 && (fells = S.season.year) && S.season.year >= firstFells(S) + 7))) wantCup = true;
    if (doneCup) break;
    if (n === "title") { if (wantCup) { if (!press("Cup")) press("KICK OFF"); } else if (!press("PLAY")) press("KICK OFF"); game.step(40); continue; }
    if (n === "hub") {
        if (S.season.round >= 7) {
            const T = sortedTable(S.season), rank = T.findIndex((r) => r.id === "me") + 1, m = T.find((r) => r.id === "me");
            log.push(`Season ${S.season.year} ${TIERS[S.season.tier].short}: finished ${rank}, ${m.w}W ${m.d}D ${m.l}L, GF ${m.gf} GA ${m.ga}`);
            press("NEXT SEASON"); game.step(40);
            if (loadSave(game).trophies.some((t) => t.name === "High Fells")) wantCup = true;
            if (wantCup) { const e = game.current.entities.find((x) => x.btnLabel === "Back"); game.input.tap(e.pos.x, e.pos.y); game.step(40); }
            continue;
        }
        press("PLAY"); game.step(40); continue;
    }
    if (n === "cup") {
        if (!S.cup && S.best.cups > 0) { log.push(`Cup won, ${S.best.cups}`); doneCup = true; break; }
        if (!press("ENTER THE CUP")) press("PLAY"); game.step(40); continue;
    }
    if (n === "match") {
        matches++;
        const bot = makeBot(lvl, botSeed++);
        game.data.autoplay = bot;
        let k = 0;
        while (game.currentName === "match" && k++ < 60 * 300) {
            if (game.match.st.goal && k % 30 === 0) game.input.tap(180, 200);
            game.step(1); stepsTotal++;
            for (const h of game.state().haptics ?? []) void h;
        }
        continue;
    }
    if (n === "result") {
        const r = game.data.result;
        game.step(5);
        const c = r.comp === "cup";
        if (c) log.push(`Cup round: ${r.score.join("-")} v ${r.kits[1].name}${r.golden ? " (golden goal)" : ""}`);
        if (!press("On we go") && !press("Next round") && !press("Back")) press("Again");
        game.step(40); continue;
    }
    if (++guard > 500) { console.log("stuck in", n); break; }
    game.go("title"); game.step(30);
}
const S = loadSave(game);
console.log(log.join("\n"));
console.log(`matches ${matches}, steps ${stepsTotal}, ${((Date.now() - t0) / Math.max(1, stepsTotal) * 1000).toFixed(0)} us/step headless`);
console.log("best", JSON.stringify(S.best), "tier", S.tier, "trophies", S.trophies.map((t) => t.name).join(", "), "reel", (S.reel ?? []).map((r) => `${r.label} ${r.score} (${r.data?.length} b64)`).join(" | "));
console.log("errors", game.errors?.length ?? 0);
process.exit(0);
