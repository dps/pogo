// The six circuits. Points are [x, z, height, { w: width, wall: rough margin, bank: extra degrees }].
// Positions like ramps and boosts are given in control points: 3.5 sits halfway between points 3 and 4.

const figure8 = () => {
    const out = [];
    const n = 26;
    for (let i = 0; i < n; i++) {
        const t = i / n * Math.PI * 2;
        const x = 150 * Math.sin(t), z = 100 * Math.sin(2 * t);
        const y = 6.5 + 6.5 * Math.cos(t);
        out.push([x, z, y]);
    }
    return out;
};

export const CUPS = [
    { id: "fresh", name: "Fresh Cup", tracks: ["aisle", "freezer", "bakery"] },
    { id: "clearance", name: "Clearance Cup", tracks: ["garden", "dock", "rooftop"] },
];

export const TRACKS = [
    {
        id: "aisle", name: "Aisle Nine", tag: "Long aisles, wide end-caps", theme: "aisle", laps: 3, width: 15, margin: 3.6, bankK: 5, scale: 1.4,
        pts: [[0, 70], [0, 10], [0, -50], [8, -92], [40, -112], [78, -100], [92, -62], [92, -20], [74, 10], [74, 40], [92, 70], [92, 108], [60, 130], [20, 122]],
        ramps: [{ at: 1.2, len: 12, h: 2.0 }],
        boosts: [{ at: 7.1, d: 0 }, { at: 12.3, d: -3 }],
        rows: [0.5, 5.2, 8.7, 12.9],
        props: [[1.8, -3], [1.8, 4], [6.5, 2], [10.3, -4], [10.3, 4], [11.5, 0]],
    },
    {
        id: "freezer", name: "Freezer Run", tag: "Slide through the deep freeze", theme: "freezer", laps: 3, width: 16, margin: 3.4, bankK: 8, scale: 1.32,
        pts: [[0, 70], [0, 10, 0], [-6, -50, 3], [-40, -92, 6], [-90, -96, 8], [-122, -56, 6], [-100, -12, 3], [-56, 4, 0], [-44, 44, -2], [-74, 76, -2], [-82, 120, 0], [-44, 148, 3], [4, 134, 2]],
        ice: [[3.4, 5.6], [8.2, 10.4]],
        ramps: [{ at: 6.5, len: 12, h: 1.8 }],
        boosts: [{ at: 2.2, d: 3 }, { at: 11.1, d: 0 }],
        rows: [0.6, 4.6, 7.4, 11.8],
        props: [[1.5, 0], [5.1, 3], [9.2, -4], [9.2, 5]],
        hazards: [{ kind: "cone", at: 2.7, amp: 6.5, period: 5.2 }],
    },
    {
        id: "bakery", name: "Bakery Bends", tag: "Hairpins round the ovens", theme: "bakery", laps: 2, width: 15, margin: 3.2, bankK: 10, scale: 1.08,
        pts: [[0, 70], [0, 15], [0, -45], [10, -88], [44, -104], [76, -84], [80, -40], [78, -4, 2], [96, 28, 4], [132, 32, 4], [150, 0, 2], [150, -50], [164, -92], [200, -104], [234, -80], [236, -20], [234, 50, 3], [212, 104, 6], [150, 128, 7], [76, 128, 6], [22, 116, 2]],
        ramps: [{ at: 16.2, len: 13, h: 2.4 }],
        boosts: [{ at: 6.2, d: 0 }, { at: 11.1, d: 0 }, { at: 18.6, d: 0 }],
        rows: [0.7, 5.6, 9.5, 13.5, 18.2],
        props: [[1.7, 3], [8.5, -3], [11.8, 4], [15.2, 0]],
        hazards: [{ kind: "pin", at: 2.4, amp: 6, period: 5.6 }, { kind: "pin", at: 19.4, amp: 6, period: 4.8 }],
    },
    {
        id: "garden", name: "Garden Centre", tag: "Rolling hills and greenhouse tunnels", theme: "garden", laps: 3, width: 15, margin: 5, bankK: 9, scale: 1.2,
        pts: [[0, 70], [0, 10], [10, -44, 3], [46, -86, 8], [98, -98, 2], [140, -74, 8], [150, -24, 12], [122, 12, 5], [80, 4, 2], [50, 28, 5], [62, 70, 10], [108, 84, 5], [136, 118, 2], [110, 158, 7], [50, 166, 3], [8, 130, 1]],
        ramps: [{ at: 9.6, len: 12, h: 2.2, d: 0 }],
        boosts: [{ at: 4.4, d: -2 }, { at: 11.6, d: 2 }],
        rows: [0.7, 4.8, 8.4, 12.2, 14.4],
        props: [[3.2, 4], [7.4, -3], [13.1, 3], [13.1, -3]],
    },
    {
        id: "dock", name: "Loading Dock", tag: "Dodge forklifts, leap the bay", theme: "dock", laps: 2, width: 15, margin: 3.4, bankK: 5, scale: 1.1,
        pts: [[0, 60], [0, 0], [0, -60], [6, -96], [40, -110], [110, -110], [148, -102], [158, -66], [158, -10], [150, 26], [116, 36], [76, 36], [50, 50], [46, 84], [66, 112], [110, 124], [120, 156], [90, 176], [30, 172], [4, 130]],
        ramps: [{ at: 4.6, len: 13, h: 3.0 }, { at: 8.2, len: 11, h: 2.2, d: 4, w: 8 }],
        gaps: [{ at: 4.84, len: 10 }],
        boosts: [{ at: 4.0, d: 0 }, { at: 16.8, d: 0 }],
        rows: [0.8, 6.8, 10.6, 15.4, 18.6],
        props: [[2.5, 0], [7.2, -4], [12.5, 4], [17.4, 0]],
        hazards: [{ kind: "forklift", at: 1.5, amp: 7, period: 7 }, { kind: "forklift", at: 11, amp: 7, period: 6 }],
    },
    {
        id: "rooftop", name: "Rooftop Rally", tag: "A figure of eight above the city", theme: "rooftop", laps: 2, width: 15, margin: 3, bankK: 11, scale: 1.05,
        pts: figure8(),
        ramps: [{ at: 20.8, len: 13, h: 2.8 }],
        gaps: [{ at: 21.2, len: 8 }],
        boosts: [{ at: 20, d: 0 }, { at: 7.2, d: 3 }, { at: 10.2, d: -3 }],
        rows: [1.5, 7.8, 14.5, 23.2],
        props: [[5.2, 0], [12.5, 0], [17, 3]],
        hazards: [{ kind: "trolley", at: 3.8, amp: 6, period: 5 }, { kind: "trolley", at: 16.6, amp: 6, period: 6 }],
    },
];
export const trackById = (id) => TRACKS.find((t) => t.id === id);
