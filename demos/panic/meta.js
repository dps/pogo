// Progress, the weekly seed, and the themed playlists.
export const SAVE = "panic1";
const blank = () => ({ v: 1, best: 0, bestRun: 0, cleared: 0, weekly: {}, lists: {}, seen: {}, wins: {}, top: {}, muted: false, haptics: true, party: 0, played: 0 });
export function loadSave(game) {
    const s = { ...blank(), ...(game.load(SAVE, {}) ?? {}) };
    return s;
}
export const store = (game, save) => game.save(SAVE, save);

/** Week number since an arbitrary Monday: everyone on Earth gets the same run for seven days. */
export function weekIndex(now = Date.now()) { return Math.floor((now - Date.UTC(2024, 0, 1)) / (7 * 864e5)); }

export const LISTS = [
    { id: "gross", name: "GROSS-OUT", color: "#2fd35c", tag: "gross", blurb: "wash your hands" },
    { id: "zoo", name: "PET SHOP", color: "#ff7a18", tag: "zoo", blurb: "critters in crisis" },
    { id: "food", name: "SNACK ATTACK", color: "#ff2d87", tag: "food", blurb: "do not eat the props" },
    { id: "fingers", name: "FINGER GYM", color: "#12c9e8", tag: "fingers", blurb: "rub, pinch, twist" },
    { id: "brain", name: "BIG BRAIN", color: "#7a3cff", tag: "brain", blurb: "remember stuff" },
    { id: "quick", name: "QUICK DRAW", color: "#ffd60a", tag: "quick", blurb: "timing is everything" },
    { id: "steady", name: "STEADY NOW", color: "#2a55ff", tag: "steady", blurb: "no shaky hands" },
    { id: "boss", name: "BOSS RUSH", color: "#ef2b2d", tag: "boss", blurb: "all of them. in a row." },
];
export const AVATARS = ["#ff2d87", "#12c9e8", "#ffd60a", "#2fd35c", "#ff7a18", "#7a3cff", "#ef2b2d", "#2a55ff"];
export const PARTY_NAMES = ["PINK", "BLUE", "YELLOW", "GREEN", "ORANGE", "PURPLE", "RED", "NAVY"];
