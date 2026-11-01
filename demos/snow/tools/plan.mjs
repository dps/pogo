const T = { needs: ["TRACK"] };
const S = (region, spec, lo, hi, o = {}) => ({ region, spec, lo, hi, ...o });
export const PLAN = [
    S(0, "garden", 8, 9, T), S(0, "track", 8, 9), S(0, "garden", 9, 10, T), S(0, "track", 9, 13), S(0, "garden", 13, 17, { opt: true, ...T }), S(0, "garden", 18, 26, { opt: true, ...T }),
    S(1, "unstack", 6, 9), S(1, "plow", 6, 9), S(1, "topgrow", 9, 12), S(1, "unstack", 10, 13), S(1, "plow", 9, 12), S(1, "unstack2", 8, 20), S(1, "plow", 13, 17, { opt: true }), S(1, "unstack", 17, 26, { opt: true }), S(1, "garden", 26, 40, { opt: true, ...T }),
    S(2, "ice", 7, 13), S(2, "icestop", 8, 12), S(2, "icestack", 7, 11), S(2, "icestop", 12, 14), S(2, "ice", 13, 18), S(2, "icestack", 11, 16), S(2, "icestop", 14, 18), S(2, "ice", 18, 27, { opt: true }), S(2, "icestop", 18, 30, { opt: true }),
    S(3, "warm", 7, 13), S(3, "warm3", 6, 12), S(3, "warm2", 8, 13), S(3, "warm", 13, 17), S(3, "warm3", 10, 18), S(3, "warm2", 13, 17), S(3, "warm", 16, 22, { opt: true }), S(3, "warm2", 22, 40, { opt: true }),
    S(4, "pine", 7, 13), S(4, "pine2", 9, 14), S(4, "pine", 13, 15), S(4, "pine2", 13, 18), S(4, "pine", 15, 19), S(4, "pine2", 16, 24), S(4, "pine", 19, 34, { opt: true }), S(4, "pine2", 20, 40, { opt: true }),
    S(5, "ditch", 7, 13), S(5, "ditch2", 9, 13), S(5, "ditch", 13, 15), S(5, "ditch2", 12, 16), S(5, "ditch", 15, 18), S(5, "mix2", 8, 14), S(5, "ditch", 18, 30, { opt: true }), S(5, "ditch2", 16, 30, { opt: true }),
    S(6, "gate", 8, 13), S(6, "gate2", 10, 14), S(6, "gate", 13, 15), S(6, "mix4", 8, 13), S(6, "gate2", 14, 18), S(6, "mix5", 8, 15), S(6, "gate", 19, 30, { opt: true }), S(6, "gate2", 22, 40, { opt: true }),
    S(7, "pl1", 7, 12), S(7, "pl4", 13, 19), S(7, "pl5", 7, 14),
    S(7, "mix4", 8, 11, { plinth: 16 }), S(7, "mix2", 12, 14, { plinth: 20 }), S(7, "two6", 8, 22), S(7, "two7", 8, 18),
    S(7, "mix3", 11, 19, { opt: true, plinth: 26 }), S(7, "mix6", 16, 22, { opt: true, plinth: 28 }), S(7, "mix5", 20, 25, { opt: true }),
];
