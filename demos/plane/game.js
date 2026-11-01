// Paper Plane Postman: glide a folded plane through Port Lull, a seaside town made of coloured card, on one thumb.
import { createGame } from "./pogo.js";
import { paintCards, paintFaces, paintPaper, paintStamps } from "./art.js";
import { registerBook } from "./book.js";
import { registerFold } from "./fold.js";
import { buildModels } from "./models.js";
import { registerFly } from "./play.js";
import { Sound } from "./sound.js";
import { buildTown } from "./town.js";
import { ribbons } from "./world.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#f3e6cf", touch: {}, seed: 3, maxDpr: 2,
});
game.touch.enabled = false;
const fresh = () => ({ ch: 0, done: [], stamps: [], planes: ["postman"], plane: "postman", best: {}, flags: {}, finished: false });
const freshOpts = () => ({ sound: true, haptics: true, comfort: false, invert: false });
let saved = null;
try { saved = game.load("plane.save", null); } catch { saved = null; }
game.progress = { ...fresh(), ...(saved?.progress ?? {}) };
game.opts = { ...freshOpts(), ...(saved?.opts ?? {}) };
game.persist = () => { try { game.save("plane.save", { progress: game.progress, opts: game.opts }); } catch { /* an embed may refuse storage */ } };
game.wipe = () => { game.progress = fresh(); game.persist(); };
// Bots and pogo check call restart(), which clears game.data but must not lose these.
game.snd = new Sound(game);
game.snd.apply();

paintPaper(game.assets); paintCards(game.assets); paintStamps(game.assets); paintFaces(game.assets);
const built = buildTown(game.assets);
buildModels(game.assets, ribbons);
registerFly(game, built); registerBook(game); registerFold(game);
game.on("hide", () => { game.snd.quiet(); });
game.start("fly", { mode: "title" });
if (typeof document !== "undefined") document.getElementById("loading")?.remove();
