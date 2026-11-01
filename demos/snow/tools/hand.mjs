// The teaching levels, drawn by hand. Each introduces one idea with no words: the layout leaves only that idea to try.
export const HAND = [
  { region: 0, name: "First Head", rows: ["......", "@.S..B", "......"], teach: "swipe", needs: ["STACK"] },
  { region: 0, name: "Rolling", rows: ["  ....", ".@S,.L", "......", "..,S..", "  ...."], needs: ["GROW"] },
  { region: 0, name: "Twice Round", rows: ["......", ".S,,..", "......", ".S,.S.", "..@..."], needs: ["GROW_BIG"] },
  { region: 0, name: "Second Ball", rows: ["...###", ".S.###", "@..,.L", ".S.###", "...###"], needs: ["TRACK"] },
  { region: 1, name: "Unpicking", rows: [".....", ".....", ".C.M@", ".....", "....."], needs: ["UNSTACK"] },
  { region: 1, name: "Topple", rows: ["......", ".B,...", "......", "..S.@."], needs: ["UNSTACK"] },
  { region: 1, name: "Plough", rows: ["..,,....", "@L,,M.S.", "..,,...."], needs: ["PLOW"] },
  { region: 2, name: "Skate", rows: [".#.##.", "@S~~~L", ".#.##.", ".M....", "......"], needs: ["SLIDE"] },
  { region: 2, name: "Pulled Up", rows: [".#..B.", "@S~~~#", ".#...."], needs: ["ICE_STOP"] },
  { region: 3, name: "Warm Hands", rows: ["......", "@M^...", "......", ".M,.L."], needs: ["SHRINK"] },
  { region: 3, name: "Spare", rows: ["###....", "@S^..B.", "###.S..", "   ...."], needs: ["MELT"] },
  { region: 4, name: "Shake", rows: ["..T...", "@S...L", "......", "..S...", "......"], needs: ["SHAKE"] },
  { region: 5, name: "Fill", rows: ["...=...", "@S.=.L.", "..S=...", ".S.=...", "...=..."], needs: ["FILL"] },
  { region: 6, name: "Weight", rows: ["...#...", "@S.|.ML", "...#...", ".So#...", "...#..."], needs: ["ON_PLATE"] },
  { region: 7, name: "Lantern Ring", rows: [".....", "@L.*.", ".....", ".M.S.", "....."], needs: ["STACK"] },
];
export const REGION_NAMES = ["Dawn Lane", "Allotments", "Mirror Pond", "Baker's Row", "Firwood", "Millstream", "Bell Gate", "Lantern Green"];
export const NAMES = [
  ["Crumbs", "Footprints", "Doorstep", "Old Track", "Long Way Home", "Sunrise"],
  ["Cold Frames", "Bean Rows", "Spadework", "Second Dig", "Compost Heap", "Rhubarb", "Trowel", "Potting Shed", "Frost Patch"],
  ["Reeds", "Thin Ice", "Glide", "Skipping Stone", "Heron", "Black Ice", "Far Bank", "Cold Feet", "Moon Pool"],
  ["Warm Loaf", "Oven Door", "Rising Dough", "Coal Scuttle", "Crust", "Flour Sack", "Hot Cross", "Baker's Dozen"],
  ["Bough", "Needles", "Woodpile", "Clearing", "Owl Hollow", "Windfall", "Deep Wood", "Fox Run"],
  ["Sluice", "Mill Race", "Waterwheel", "Plank Bridge", "Weir", "Eel Trap", "Tailrace", "Millpond"],
  ["Latch", "Bell Rope", "Counterweight", "Night Porter", "Toll", "Curfew", "Sexton", "Evensong"],
  ["Square", "First Lamp", "Parade", "Two Friends", "Old Well", "Town Clock", "Vigil", "Last Light", "Bonfire Night", "Midnight", "Long Shadows", "Quiet Hour"],
];
