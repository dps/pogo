// Every framework error carries a stable code and a concrete hint, because the reader is usually an agent.
export class PogoError extends Error {
    constructor(public code: string, message: string, public hint?: string) {
        super(hint ? `[${code}] ${message}\nHint: ${hint}` : `[${code}] ${message}`);
        this.name = "PogoError";
    }
}

/** Edit distance counting a swap of neighbouring letters as one edit, since that's the commonest typo. */
function distance(a: string, b: string) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
}

/** A "Did you mean" / "Known names" hint for an unknown name. */
export function suggest(name: string, known: Iterable<string>): string {
    const list = [...known];
    if (!list.length) return "Nothing with that kind of name is defined yet.";
    const best = list.map((k) => [k, distance(name.toLowerCase(), k.toLowerCase())] as const).sort((a, b) => a[1] - b[1])[0];
    const prefix = best[1] <= Math.max(2, name.length / 3) ? `Did you mean "${best[0]}"? ` : "";
    return `${prefix}Known: ${list.slice(0, 24).join(", ")}.`;
}
