// Everything that isn't a floor: the title, the gift shop, the passport and the holiday snaps.
import { C, THEMES, nine, ptext, spr, textWidth, wrap } from "./art.js";
import { CARDS, CARD_PRICE, KEEPERS, RELICS, TEA_PRICE } from "./data.js";
import { DUNGEONS, Dice, FLOORS, ITINERARY, hashSeed } from "./floors.js";
import { Stage } from "./stage.js";
import { addButton, dimmer, panel } from "./ui.js";
import { newRun, pump, relicPool, seedFor, storeSave, today } from "./run.js";



export function addScenes(game, fx, ctx) {
    // ---------- title ----------
    game.scene("title", (s) => {
        game.touch.enabled = false;
        const save = ctx.save();
        game.audio.muted = !save.sound; game.haptics.enabled = save.haptics;
        ctx.song("title");
        let keeperI = Math.max(0, KEEPERS.findIndex((k) => k.key === save.keeper));
        let t = 0, tweak = 0;
        const v = () => s.view, sf = () => v().safe ?? { top: 0, bottom: 0, left: 0, right: 0 };
        const wide = () => v().width > v().height * 1.1;
        const unlocked = (k) => save.bosses >= k.need;
        const keeper = () => KEEPERS[keeperI];
        const cx = () => (wide() ? v().width * 0.25 : v().width / 2);
        const panelY = () => (wide() ? v().height - sf().bottom - 196 : v().height - sf().bottom - 216);
        function shift(n) { keeperI = (keeperI + n + KEEPERS.length) % KEEPERS.length; tweak = 1; if (unlocked(keeper())) { save.keeper = keeper().key; storeSave(game, save); } fx.arm(); }
        function go(daily) {
            if (!unlocked(keeper())) { fx.nope(); return; }
            const seed = daily ? today() : seedFor(game.fxRng.int(0, 1e9));
            save.runs++; storeSave(game, save);
            fx.gate(); newRun(game, { seed, daily, keeper: keeper().key });
            game.go("play", {}, { fade: 0.25 });
        }
        addButton(s, { name: "prevKeeper", w: 50, h: 56, x: () => cx() - 138 + (wide() ? 12 : 0), y: () => panelY(), style: 2, label: "<", onTap: () => shift(-1) });
        addButton(s, { name: "nextKeeper", w: 50, h: 56, x: () => cx() + 138 - (wide() ? 12 : 0), y: () => panelY(), style: 2, label: ">", onTap: () => shift(1) });
        const by = () => v().height - sf().bottom;
        addButton(s, { name: "play", w: () => Math.min(300, v().width * (wide() ? 0.42 : 0.84)), h: 60, x: cx, y: () => by() - (wide() ? 116 : 124), label: () => (unlocked(keeper()) ? "Go on holiday" : "Locked"), enabled: () => unlocked(keeper()), onDenied: () => fx.nope(), onTap: () => go(false) });
        const halfW = () => Math.min(146, v().width * (wide() ? 0.2 : 0.41));
        addButton(s, { name: "daily", w: halfW, h: 52, x: () => cx() - halfW() / 2 - 4, y: () => by() - (wide() ? 56 : 62), style: 1, label: "Daily tour", onTap: () => go(true) });
        addButton(s, { name: "passport", w: halfW, h: 52, x: () => cx() + halfW() / 2 + 4, y: () => by() - (wide() ? 56 : 62), style: 2, label: "Passport", onTap: () => { fx.arm(); game.go("passport", {}, { fade: 0.2 }); } });
        s.onUpdate((dt) => {
            t += dt; tweak = Math.max(0, tweak - dt * 5);
            if (s.input.pressed("confirm")) go(false);
            const sw = s.input.swipe;
            if (s.input.pressed("left") || sw === "right") shift(-1);
            if (s.input.pressed("right") || sw === "left") shift(1);
        });
        s.onDraw((d) => {
            const W = v().width, H = v().height, S2 = wide() ? Math.max(1.5, Math.ceil(H / 190 * 2) / 2) : Math.max(1.5, Math.ceil(W / 200 * 2) / 2);
            d.rect(W + 40, H + 40, { x: W / 2, y: H / 2, color: "#120c22" });
            const bottomY = wide() ? H : Math.round(H * 0.62), by0 = bottomY - 190 * S2, vx = wide() ? W - 120 * S2 : 120 * S2;
            spr(d, "vista", vx, by0 + 190 * S2 / 2, { scale: S2 });
            d.rect(W + 40, H - bottomY + 40, { x: W / 2, y: bottomY + (H - bottomY) / 2 + 10, color: "#170d14" });
            if (wide()) { const lx = vx - 120 * S2; d.rect(lx + 2, H + 8, { x: lx / 2, y: H / 2, color: "#170d14" }); for (let i = 0; i < 8; i++) d.rect(9, H + 8, { x: lx + i * 8 + 4, y: H / 2, color: "#170d14", opacity: 1 - i / 8 }); }
            const off = vx - 120 * S2, ky = by0 + 170 * S2, kx = off + 142 * S2;
            const kk = keeper();
            spr(d, "shadow", kx, ky + 8 * S2, { scale: S2, opacity: 0.5 });
            spr(d, `k_${kk.key}`, kx, ky - 2 * S2, { scale: S2 * 1.5, sy: S2 * 1.5 * (1 + tweak * 0.2), frame: (t * 2.6) & 1, flip: false, color: unlocked(kk) ? undefined : "#3a2a3a" });
            spr(d, "crate", kx - 22 * S2, ky + 1 * S2, { scale: S2 * 0.9 });
            d.additive(() => { d.sprite("glow", { x: off + 164 * S2, y: by0 + 128 * S2, width: 260 * S2, height: 200 * S2, color: "#7a3a14", opacity: 0.8 + Math.sin(t) * 0.1 }); });
            // Feather the painting into the panel below.
            if (!wide()) for (let i = 0; i < 8; i++) d.rect(W + 8, 9, { x: W / 2, y: bottomY - 32 + i * 8, color: "#170d14", opacity: i / 8 });
            ptext(d, "BACK", off + 50 * S2, by0 + 108.5 * S2, { scale: S2 * 0.5, color: C.ink, shadow: false });
            ptext(d, "MONDAY", off + 50 * S2, by0 + 114.5 * S2, { scale: S2 * 0.4, color: C.blood, shadow: false });
        });
        s.onDrawUI((d) => {
            const x = cx(), top = wide() ? sf().top + 48 : sf().top + 54, K = keeper();
            logo(d, x, top, wide() ? 2.5 : Math.min(3.5, v().width / 104), t);
            const py = panelY(), w = Math.min(232, v().width - 112), h = 76;
            panel(d, x, py, w, h, true, 0.94);
            spr(d, `k_${K.key}`, x - w / 2 + 28, py - 2, { scale: 2, frame: (t * 2.6) & 1, color: unlocked(K) ? undefined : C.ink2 });
            ptext(d, K.name, x - w / 2 + 54, py - 25, { scale: 2, align: 0, color: unlocked(K) ? C.gold : C.ash, shadow: false });
            ptext(d, K.role, x - w / 2 + 54 + textWidth(K.name, 2) + 6, py - 24, { scale: 1, align: 0, color: C.straw, shadow: false });
            if (unlocked(K)) {
                for (let i = 0; i < K.hearts; i++) spr(d, "heart", x + w / 2 - 12 - i * 12, py + 28, { scale: 0.75 });
                wrap(`${K.label}: ${K.desc}`, w - 66, 1).slice(0, 3).forEach((l, i) => ptext(d, l, x - w / 2 + 54, py - 8 + i * 11, { scale: 1, align: 0, color: C.cream, shadow: false }));
            } else { spr(d, "icon_lock", x - w / 2 + 70, py + 8); ptext(d, K.unlock, x - w / 2 + 84, py + 8, { scale: 1, align: 0, color: C.pale, shadow: false }); }
        });
    });

    function logo(d, x, y, sc, t) {
        const bob = (i) => Math.sin(t * 2 + i * 0.5) * 1;
        const line = (str, yy, scale, col, under) => {
            let px = x - textWidth(str, scale) / 2;
            [...str].forEach((ch, i) => {
                const w = textWidth(ch, scale) + scale;
                ptext(d, ch, px, yy + bob(i), { scale, align: 0, color: col, outline: under, shadow: C.ink });
                px += w;
            });
        };
        const small = Math.max(2, Math.floor(sc * 0.75 * 2) / 2);
        line("CRYPT KEEPER'S", y, small, C.cream, C.blood);
        line("DAY OFF", y + small * 7 + sc * 7.5, sc * 1.5, C.gold, C.ember);
    }

    // ---------- gift shop ----------
    game.scene("shop", (s, args) => {
        game.touch.enabled = false;
        const save = ctx.save();
        const run = game.data.run;
        if (!run) { game.go("title"); return; }
        const dice = new Dice(hashSeed(run.seed, "shop", run.floor));
        const free = !!args?.free;
        const pool = relicPool(save).filter((k) => !run.relics.includes(k));
        const pickRelics = (n) => dice.shuffle(pool.slice()).slice(0, n);
        const deck = dice.shuffle(Object.keys(CARDS));
        let stock;
        if (free) stock = pickRelics(3).map((k) => ({ kind: "relic", key: k, price: 0 }));
        else {
            const [r] = pickRelics(1);
            stock = [];
            if (r) stock.push({ kind: "relic", key: r, price: RELICS[r].price });
            stock.push({ kind: "card", key: deck[0], price: CARD_PRICE });
            stock.push(run.hp < run.maxHp ? { kind: "tea", key: "tea", price: TEA_PRICE } : { kind: "card", key: deck[1], price: CARD_PRICE });
        }
        const keeperUnlock = KEEPERS.find((k) => k.need === save.bosses && k.need === ITINERARY[run.floor - 1]?.d + 1 && free);
        let t = 0, flashI = -1, flashT = 0, msg = keeperUnlock ? `New keeper unlocked: ${keeperUnlock.name}!` : null;
        const v = () => s.view, sf = () => v().safe ?? { top: 0, bottom: 0, left: 0, right: 0 };
        const bonus = run.lastBonus ?? { base: 2, flawless: 0, par: 0, moves: 0, parN: 0, name: "" };
        const tally = [["Floor", bonus.base], ["Flawless", bonus.flawless], ["On par", bonus.par]];
        ctx.song("shop");
        fx.till();
        const wide = () => v().width > v().height * 1.1;
        const cardW = () => (wide() ? Math.min(180, (v().width - 40) / 3 - 8) : Math.min(v().width - 32, 330));
        const cardH = () => (wide() ? 150 : 86);
        const cardPos = (i) => (wide() ? [v().width / 2 + (i - (stock.length - 1) / 2) * (cardW() + 10), sf().top + 184] : [v().width / 2, sf().top + 200 + i * (cardH() + 8)]);
        stock.forEach((it, i) => addButton(s, {
            name: `item${i}`, w: cardW, h: cardH, x: () => cardPos(i)[0], y: () => cardPos(i)[1],
            visible: () => !it.sold,
            enabled: () => run.coins >= it.price && !(it.kind === "card" && run.cards.length >= run.slots),
            onDenied: () => { fx.nope(); msg = it.kind === "card" && run.cards.length >= run.slots ? "Postcard slots are full." : "Not enough coins."; },
            paint(d, w, h, on) {
                const dip = flashI === i ? -2 : 0, name = it.kind === "tea" ? "Cup of Tea" : (it.kind === "relic" ? RELICS : CARDS)[it.key].name, desc = it.kind === "tea" ? "Heal one heart. It's what we do." : (it.kind === "relic" ? RELICS : CARDS)[it.key].desc;
                panel(d, 0, dip, w, h, false);
                const icon = it.kind === "tea" ? "tea" : `i_${it.key}`, tall = h > 120;
                const ix = tall ? 0 : -w / 2 + 32, iy = tall ? -h / 2 + 34 : dip;
                d.circle(tall ? 24 : 22, { x: ix, y: iy, color: it.kind === "card" ? C.aqua : C.straw, opacity: 0.55 });
                spr(d, icon, ix, iy, { scale: 2 });
                const tx = tall ? -w / 2 + 12 : -w / 2 + 62, tw = tall ? w - 24 : w - 76, ty = tall ? 8 : -h / 2 + 16 + dip;
                const kind = it.kind === "relic" ? "RELIC" : it.kind === "card" ? "POSTCARD" : "REFRESHMENT";
                ptext(d, name, tx, ty, { scale: 1.5, align: 0, color: C.wine, shadow: false });
                wrap(desc, tw, 1.5).slice(0, 3).forEach((l, j) => ptext(d, l, tx, ty + 15 + j * 12, { scale: 1, align: 0, color: C.ink2, shadow: false }));
                ptext(d, kind, w / 2 - 8, h / 2 - 10, { scale: 1, align: 1, color: C.tan, shadow: false });
                if (it.price) { spr(d, "icon_coin", -w / 2 + 14, h / 2 - 12); ptext(d, it.price, -w / 2 + 24, h / 2 - 12, { scale: 1.5, align: 0, color: on ? C.wine : C.ember, shadow: false }); }
                else ptext(d, "FREE", -w / 2 + 14, h / 2 - 12, { scale: 1, align: 0, color: C.teal, shadow: false });
            },
            onTap: () => {
                run.coins -= it.price; it.sold = true; flashI = i; flashT = 0.3; fx.till(); game.haptic("success");
                if (it.kind === "relic") {
                    run.relics.push(it.key); save.album[it.key] = true;
                    if (it.key === "sunhat") { run.maxHp++; run.hp++; }
                    if (it.key === "bumbag") { run.slots++; run.cards.push(deck[2]); }
                } else if (it.kind === "card") { run.cards.push(it.key); save.album[it.key] = true; } else run.hp = Math.min(run.maxHp, run.hp + 1);
                storeSave(game, save);
                if (free) leave(); else msg = "Lovely. No refunds.";
            },
        }));
        const leave = () => { if (s.__left) return; s.__left = true; fx.gate(); game.go("play", {}, { fade: 0.25 }); };
        addButton(s, { name: "onward", w: () => Math.min(300, v().width - 40), h: 56, x: () => v().width / 2, y: () => v().height - sf().bottom - 42, label: () => (free ? "No thanks, onward" : "Onward"), style: () => (free ? 2 : 0), onTap: leave });
        s.onUpdate((dt) => { t += dt; flashT -= dt; if (flashT < 0) flashI = -1; pump(run, 4); if (s.input.pressed("confirm")) leave(); });
        s.onDraw((d) => {
            const th = THEMES[DUNGEONS[Math.min(4, ITINERARY[Math.min(FLOORS - 1, run.floor)].d)].key];
            const key = DUNGEONS[Math.min(4, ITINERARY[Math.min(FLOORS - 1, run.floor)].d)].key;
            d.rect(v().width + 8, v().height + 8, { x: v().width / 2, y: v().height / 2, color: th.sky });
            d.push(); d.scale(2, 2);
            for (let y = 0; y * 48 < v().height + 72; y++) for (let x = 0; x * 48 < v().width + 48; x++) spr(d, `back_${key}`, x * 24 + 12, y * 36 + 18, { frame: x & 1, opacity: 0.22 });
            d.pop();
            d.additive(() => { for (const gx of [0.2, 0.8]) d.sprite("glow", { x: v().width * gx, y: sf().top + 60 + Math.sin(t * 3 + gx) * 3, width: 340, height: 340, color: "#7a4a22" }); });
            d.rect(v().width + 8, v().height + 8, { x: v().width / 2, y: v().height / 2, color: C.ink, opacity: 0.25 });
        });
        s.onDrawUI((d) => {
            const x = v().width / 2, y = sf().top + (wide() ? 20 : 32);
            ptext(d, free ? "SOUVENIR" : "GIFT SHOP", x, y, { scale: wide() ? 2.5 : 3, color: C.gold, outline: C.blood, shadow: C.ink });
            ptext(d, free ? "Pick one, compliments of the management" : "Exit through it. Everyone must.", x, y + (wide() ? 20 : 26), { scale: 1, color: C.straw });
            const px = x, py = y + (wide() ? 58 : 66), wd = Math.min(v().width - 24, 330);
            panel(d, px, py, wd, 58, true, 0.92);
            ptext(d, bonus.name, px - wd / 2 + 12, py - 16, { scale: 1.5, align: 0, color: C.bone, shadow: false });
            ptext(d, `${bonus.moves} moves, par ${bonus.parN}`, px + wd / 2 - 12, py - 16, { scale: 1, align: 1, color: C.pale, shadow: false });
            tally.forEach(([label, n], i) => { const q = px - wd / 2 + 12 + i * (wd - 24) / 3; ptext(d, label, q, py + 1, { scale: 1, align: 0, color: n ? C.straw : C.ash, shadow: false }); ptext(d, n ? `+${n}` : "-", q, py + 15, { scale: 1.5, align: 0, color: n ? C.gold : C.ash, shadow: false }); });
            spr(d, "icon_coin", px + wd / 2 - 46, py + 12);
            ptext(d, run.coins, px + wd / 2 - 36, py + 12, { scale: 2, align: 0, color: C.gold, shadow: false });
            for (let i = 0; i < run.maxHp; i++) spr(d, "heart", 18 + i * 17 + (sf().left ?? 0), sf().top + 16, { frame: i < run.hp ? 0 : 1 });
            // Room left under the shelves goes to the shopkeeper.
            const last = cardPos(stock.length - 1)[1] + cardH() / 2, floorY = v().height - sf().bottom - 100, room = floorY - last;
            if (!wide() && room > 96) {
                const sc = room > 130 ? 2 : 1.5, ky = floorY - 26 * sc;
                spr(d, "shopkeep", x, ky, { scale: sc, frame: (t * 1.4) & 1 });
                const say = free ? "On the house. Don't tell the house." : QUIPS[(run.floor * 3) % QUIPS.length];
                ptext(d, say, x, ky - 26 * sc - 10, { scale: 1, color: C.cream });
            }
            if (msg) ptext(d, msg, x, v().height - sf().bottom - 84, { scale: 1.5, color: C.mint });
            else if (run.floor < FLOORS) ptext(d, `Next: ${ITINERARY[run.floor].boss ? "BOSS" : DUNGEONS[ITINERARY[run.floor].d].name}`, x, v().height - sf().bottom - 84, { scale: 1.5, color: ITINERARY[run.floor].boss ? C.ember : C.straw });
        });
    });

    // ---------- passport ----------
    game.scene("passport", (s) => {
        game.touch.enabled = false;
        const save = ctx.save();
        const v = () => s.view, sf = () => v().safe ?? { top: 0, bottom: 0, left: 0, right: 0 };
        let t = 0;
        const back = () => { fx.arm(); game.go("title", {}, { fade: 0.2 }); };
        const by = () => v().height - sf().bottom - 34;
        addButton(s, { name: "back", w: 100, h: 48, x: () => v().width / 2 - 110, y: by, style: 0, label: "Back", onTap: back });
        addButton(s, { name: "sound", w: 100, h: 48, x: () => v().width / 2, y: by, style: 1, label: () => (save.sound ? "Sound" : "Mute"), onTap: () => { save.sound = !save.sound; game.audio.muted = !save.sound; storeSave(game, save); } });
        addButton(s, { name: "haptics", w: 100, h: 48, x: () => v().width / 2 + 110, y: by, style: 1, label: () => (save.haptics ? "Buzz" : "Still"), onTap: () => { save.haptics = !save.haptics; game.haptics.enabled = save.haptics; storeSave(game, save); game.haptic("medium"); } });
        s.onUpdate((dt) => { t += dt; if (s.input.pressed("confirm") || s.input.pressed("pause")) back(); });
        s.onDrawUI((d) => {
            const w = Math.min(v().width - 20, 400), x = v().width / 2, H2 = Math.min(v().height - sf().top - sf().bottom - 80, 360), top = Math.max(sf().top + 8, (v().height - sf().bottom - 64 - H2) / 2);
            d.rect(v().width + 8, v().height + 8, { x, y: v().height / 2, color: C.ink2 });
            panel(d, x, top + H2 / 2, w, H2, false);
            ptext(d, "PASSPORT", x, top + 22, { scale: 2, color: C.wine, shadow: false });
            const L = x - w / 2 + 16;
            const rows = [["Holidays taken", save.runs], ["Survived Monday", save.wins], ["Furthest floor", `${save.best}/${FLOORS}`], ["Stamps", save.stamps]];
            const col = H2 < 340 ? 2 : 1;
            rows.forEach(([k, n], i) => { const q = col === 2 ? L + (i % 2) * (w / 2 - 8) : L, yy = top + 44 + (col === 2 ? (i >> 1) : i) * 14; ptext(d, k, q, yy, { scale: 1, align: 0, color: C.ink2, shadow: false }); ptext(d, n, q + (col === 2 ? w / 2 - 40 : w - 32), yy, { scale: 1, align: 1, color: C.wine, shadow: false }); });
            let y = top + 44 + (col === 2 ? 2 : 4) * 14 + 12;
            ptext(d, "Keepers", L, y, { scale: 1.5, align: 0, color: C.wine, shadow: false }); y += 22;
            KEEPERS.forEach((k, i) => { const open = save.bosses >= k.need, q = L + 26 + i * ((w - 32) / 4); spr(d, `k_${k.key}`, q, y + 6, { scale: 1.5, frame: (t * 2.4 + i) & 1, color: open ? undefined : C.ink2 }); ptext(d, open ? k.name : "?", q, y + 28, { scale: 1, color: C.wine, shadow: false }); });
            y += 46;
            const pool = [...Object.keys(RELICS), ...Object.keys(CARDS)];
            ptext(d, `Souvenirs ${pool.filter((k) => save.album[k]).length}/${pool.length}`, L, y, { scale: 1.5, align: 0, color: C.wine, shadow: false }); y += 18;
            pool.forEach((k, i) => { const per = Math.floor((w - 28) / 22), q = L + 8 + (i % per) * 22, r = y + ((i / per) | 0) * 22; if (save.album[k]) spr(d, `i_${k}`, q, r); else { d.circle(7, { x: q, y: r, color: C.straw }); ptext(d, "?", q, r, { scale: 1, color: C.tan, shadow: false }); } });
            const nextUnlock = Object.values(RELICS).map((r) => r.stamps ?? 0).filter((n) => n > save.stamps).sort((a, b) => a - b)[0];
            if (nextUnlock) ptext(d, `Next souvenir on sale at ${nextUnlock} stamps`, x, top + H2 - 30, { scale: 1, color: C.teal, shadow: false });
            const dk = today(); const best = save.daily[dk];
            ptext(d, best !== undefined ? `Today's tour best: floor ${best}` : "No daily tour taken today", x, top + H2 - 16, { scale: 1, color: C.brown, shadow: false });
        });
    });

    // ---------- holiday snaps ----------
    game.scene("recap", (s) => {
        game.touch.enabled = false;
        const save = ctx.save();
        const run = game.data.run;
        if (!run) { game.go("title"); return; }
        if (run.daily) { const d = today(); save.daily[d] = Math.max(save.daily[d] ?? 0, run.floor); storeSave(game, save); }
        ctx.song("snaps");
        const pick = chooseSnaps(run);
        const v = () => s.view, sf = () => v().safe ?? { top: 0, bottom: 0, left: 0, right: 0 };
        let i = -1, t = 0, drop = 0, stage = null, finished = false;
        function next() {
            i++; drop = 0; fx.shutter();
            if (i >= pick.length) { finished = true; stage = null; return; }
            const p = pick[i];
            stage = new Stage(s, p.fl, p.st, { theme: p.theme, keeper: run.keeper, fx });
            stage.snapMode = true;
            place();
        }
        function place() {
            if (!stage) return;
            const { pw, ph } = pic();
            stage.layout(picX() - pw / 2 - 12, picY() - ph / 2 - 14, pw + 24, ph + 28);
        }
        const wideR = () => v().width > v().height * 1.1;
        const pic = () => { const pw = Math.min(v().width - 56, 300), ph = Math.min(pw * 0.92, v().height - (wideR() ? 96 : 170)); return { pw, ph }; };
        const picX = () => (wideR() ? v().width * 0.36 : v().width / 2);
        const picY = () => (wideR() ? v().height / 2 - 20 : v().height * 0.42);
        s.on("resize", place);
        next();
        const again = () => { if (s.__left) return; s.__left = true; const k = run.keeper, daily = run.daily; const seed = daily ? today() : seedFor(game.fxRng.int(0, 1e9)); save.runs++; storeSave(game, save); newRun(game, { seed, daily, keeper: k }); game.go("play", {}, { fade: 0.25 }); };
        const by = () => v().height - sf().bottom - 36;
        addButton(s, { name: "again", w: () => Math.min(180, v().width * 0.5), h: 54, x: () => v().width / 2 - 62, y: by, label: "Book again", visible: () => finished, onTap: again });
        addButton(s, { name: "home", w: 110, h: 54, x: () => v().width / 2 + 88, y: by, style: 2, label: "Title", visible: () => finished, onTap: () => { fx.arm(); game.go("title", {}, { fade: 0.25 }); } });
        addButton(s, { name: "nextsnap", w: () => Math.min(wideR() ? 180 : 240, v().width * 0.7), h: 54, x: () => (wideR() ? v().width * 0.8 : v().width / 2), y: () => (wideR() ? v().height / 2 : by()), style: 1, label: () => (i >= pick.length - 1 ? "The bill" : "Next snap"), visible: () => !finished, onTap: next });
        const clock = run.won ? "11:59 PM" : DUNGEONS[Math.min(4, ITINERARY[Math.min(FLOORS - 1, run.floor)].d)].time;
        s.onUpdate((dt) => { t += dt; drop = Math.min(1, drop + dt * 3.4); stage?.update(dt); if (s.input.pressed("confirm")) { if (finished) again(); else next(); } });
        s.onDraw((d) => { d.rect(v().width + 8, v().height + 8, { x: v().width / 2, y: v().height / 2, color: C.ink2 }); table(d); });
        function table(d) { // a wooden table for the album
            d.push(); d.scale(2, 2); for (let y = 0; y * 48 < v().height + 48; y++) for (let x = 0; x * 48 < v().width + 48; x++) spr(d, "floor_cata", x * 24 + 12, y * 24 + 12, { frame: (x * 3 + y * 5) % 2 * 2, opacity: 0.3 }); d.pop();
        }
        s.onDrawUI((d) => {
            const hx = wideR() && !finished ? v().width * 0.8 : v().width / 2;
            ptext(d, finished ? (run.won ? "BACK TO WORK" : "WISH YOU WERE HERE") : wideR() ? "SNAPS" : "HOLIDAY SNAPS", hx, wideR() && !finished ? v().height / 2 - 70 : sf().top + 26, { scale: 2, color: C.gold, outline: C.blood, shadow: C.ink });
            if (!finished && stage) {
                const p = pick[i], { pw, ph } = pic(), k = 1 - (1 - drop) * (1 - drop), y = picY() + (1 - k) * -40, x = picX(), rot = (i % 2 ? 1 : -1) * 0.02 * (1 + (1 - k) * 2);
                for (let n = Math.min(i, 3); n > 0; n--) { d.push(); d.translate(x + n * 3 - 3, picY() + n * 2); d.rotate((n % 2 ? 1 : -1) * 0.05); nine(d, "polaroid", 0, 0, 12, pw + 16, ph + 72, 2); d.pop(); }
                d.push(); d.translate(x, y); d.rotate(rot * 0.8); nine(d, "polaroid", 0, 0, 12, pw + 16, ph + 72, 2); d.pop();
                const px = x - pw / 2, py = picY() - ph / 2;
                d.rect(pw, ph, { x, y: picY(), color: C.ink });
                d.clip(px, py, pw, ph, () => { if (drop >= 0.6) stage.draw(d); });
                ptext(d, p.caption, x, picY() + ph / 2 + 14, { scale: 1.5, color: C.ink, shadow: false });
                ptext(d, `${p.time}, ${p.room}`, x, picY() + ph / 2 + 31, { scale: 1, color: C.brown, shadow: false });
                const tp = "tape"; spr(d, tp, x, picY() - ph / 2 - 8 + (1 - k) * -40, { scale: 2, opacity: 0.8 });
                ptext(d, `${i + 1} of ${pick.length}`, hx, wideR() ? v().height / 2 - 46 : v().height - sf().bottom - 76, { scale: 1, color: C.straw });
            } else if (finished) bill(d);
        });
        function bill(d) {
            const x = v().width / 2, w = Math.min(v().width - 32, 320), y = v().height / 2 - 8, h = Math.min(v().height - 120, 262), st = run.stats;
            panel(d, x, y, w, h, false);
            spr(d, "stamp", x + w / 2 - 32, y - h / 2 + 34, { scale: 2 });
            spr(d, `k_${run.keeper}`, x + w / 2 - 32, y - h / 2 + 34, { scale: 1 });
            const top = y - h / 2 + 18, L = x - w / 2 + 16;
            ptext(d, run.won ? "Hit snooze on Monday." : `Got as far as ${clock}.`, L, top, { scale: 1.5, align: 0, color: C.wine, shadow: false });
            ptext(d, `${Math.min(run.floor + (run.won ? 0 : 1), FLOORS)} of ${FLOORS} floors`, L, top + 16, { scale: 1, align: 0, color: C.brown, shadow: false });
            const rows = [["Locals shoved aside", st.kills], ["Bonks", st.bonks], ["Flawless floors", st.flawless], ["Floors on par", st.pars], ["Steps taken", st.moves], ["Regrets undone", st.undos]];
            rows.forEach(([k, n], i) => { const r = top + 52 + i * 15; ptext(d, k, L, r, { scale: 1, align: 0, color: C.ink2, shadow: false }); ptext(d, n, x + w / 2 - 16, r, { scale: 1.5, align: 1, color: C.wine, shadow: false }); });
            const ry = top + 52 + rows.length * 15 + 12;
            run.relics.slice(0, 10).forEach((k, i) => spr(d, `i_${k}`, L + 8 + i * 20, ry));
            ptext(d, `Seed ${run.seed}${run.daily ? ", daily tour" : ""}`, x, y + h / 2 - 12, { scale: 1, color: C.tan, shadow: false });
            const unlock = KEEPERS.find((k) => k.need === save.bosses && k.need > 0);
            if (unlock) ptext(d, `${unlock.name} is ready to travel`, x, y + h / 2 - 26, { scale: 1, color: C.teal, shadow: false });
        }
    });
}

const QUIPS = ["Everything must go. Mostly you.", "No refunds. Ask the last tourist.", "That one's cursed. Half price.", "You break it, it breaks you.", "We also do weddings.", "Lovely. Is that a real heart?"];

function chooseSnaps(run) {
    const all = run.snaps;
    if (all.length <= 7) return all.length ? all : [];
    const score = { dead: 9, bossDead: 8, boss: 6, bonk: 6, arrive: 4, pit: 5, hurt: 3 };
    const ranked = all.map((p, i) => ({ p, i, v: (score[p.kind] ?? 1) + (i === 0 ? 5 : 0) })).sort((a, b) => b.v - a.v).slice(0, 7);
    return ranked.sort((a, b) => a.i - b.i).map((q) => q.p);
}
