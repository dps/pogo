// The Goblin Songbook: fourteen original tunes in order of difficulty, plus menu loops.
// A section has chords, a lead line and sometimes a counter line. Tokens: note, "-" hold, "." rest, [a b] split the slot.
// bar = steps in a bar, grid = steps per beat, unit = steps per token, beats = pulse positions in the bar (7/8 is 3+2+2).
import { midi, noteName } from "./theory.js";

const rep = (s, n) => new Array(n).fill(s).join(" | ");
/** Transpose a melody or bass line by semitones. */
const up = (line, n) => line.replace(/[A-G][#b]?\d/g, (m) => noteName(midi(m) + n));

const lines = (...bars) => bars.join(" | ");

export const SONGS = [
// ---------------------------------------------------------------------------------------------- 1
{
    id: "mudfoot", title: "Mudfoot March", genre: "March", sig: "4/4", key: "Bb", mode: "major", bpm: 108, grid: 4, bar: 16, unit: 2, beats: [0, 4, 8, 12],
    form: "I A A2 B A O",
    style: {
        kick: "x.......x.......", snare: "....x.x.....x.x.", perc: "....x.......x...", comp: "....x.......x...", bass: "R . . . 5 . . .",
        fill: { snare: "....x.x.x.x.xxxx" },
        mix: { lead: { wave: "sawtooth", vol: 0.075 }, long: { wave: "sawtooth", vol: 0.075 }, bass: { wave: "sawtooth", vol: 0.11, d: 3.4 }, counter: { wave: "triangle", vol: 0.12 } },
    },
    sections: {
        I: { chords: "Bb | F7", only: ["kick", "snare", "perc"] },
        A: {
            chords: "Bb | Eb Bb | F7 | Bb | Bb | Eb Cm7 | C7 | F7",
            lead: lines("F4 - Bb4 - D5 - Bb4 -", "Eb5 - D5 C5 Bb4 - - -", "C5 - A4 - F4 - A4 -", "Bb4 - D5 - F5 - - -",
                "F5 - D5 Bb4 F5 - D5 Bb4", "Eb5 - G5 - G5 F5 Eb5 C5", "C5 - E5 - G5 - E5 -", "F5 - - - A4 - C5 -"),
        },
        B: { // The trio, in the subdominant as every proper march does.
            key: "Eb", chords: "Eb | Eb | Bb7 | Eb | Eb7 | Ab | Eb Bb7 | Eb F7",
            lead: lines("G4 - - - Bb4 - Eb5 -", "G5 - F5 - Eb5 - Bb4 -", "Ab4 - - - D5 - F5 -", "Eb5 - - - - - G4 Ab4",
                "Bb4 - Db5 - Bb4 - G4 -", "Ab4 - C5 - Eb5 - Ab5 -", "G5 - Eb5 - F5 - D5 -", "Eb5 - - - C5 - A4 -"),
            counter: lines("Eb4 - - - G4 - - -", "Bb4 - - - G4 - - -", "F4 - - - Bb4 - - -", "G4 - - - - - - -",
                "G4 - - - Db4 - Eb4 -", "Eb4 - - - Ab4 - - -", "Bb4 - - - Bb4 - - -", "G4 - - - A4 - F4 -"),
        },
        O: { chords: "Bb | F7 | Bb", lead: lines("F5 - D5 - Bb4 - D5 -", "C5 - A4 - F4 - A4 -", "Bb4 - - - - - . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 2
{
    id: "toad", title: "Toad Polka", genre: "Polka", sig: "2/4", key: "F", mode: "major", bpm: 118, grid: 4, bar: 8, unit: 1, beats: [0, 4],
    form: "I A A B A B A O",
    style: {
        kick: "x...x...", snare: "..x...x.", comp: "..x...x.", bass: ["R . . . 5 . . ."], perc: "..x...x.", hat: "",
        mix: { lead: { wave: "square", vol: 0.085 }, long: { wave: "square", vol: 0.085, d: 5 }, comp: { wave: "square", vol: 0.04, d: 1.4 }, bass: { wave: "sawtooth", vol: 0.11, d: 2 }, snare: { vol: 0.13 } },
    },
    sections: {
        I: { chords: "F | C7 | F | C7", only: ["kick", "comp", "bass"] },
        A: {
            chords: "F | F | C7 | C7 | C7 | C7 | F | F",
            lead: lines("A4 - C5 - F5 - C5 -", "A5 - - G5 F5 - C5 -", "Bb4 - C5 - E5 - G5 -", "Bb5 - - A5 G5 - E5 -",
                "C5 - E5 - G5 - Bb5 -", "G5 - E5 - C5 - Bb4 -", "A4 - C5 - F5 - A5 -", "F5 - - - F4 - - -"),
        },
        B: {
            chords: "Bb | Gm | C7 | F | Bb | Bbm | F C7 | F",
            lead: lines("D5 - F5 - Bb5 - F5 -", "G5 - - F5 D5 - Bb4 -", "C5 - E5 - G5 - Bb5 -", "A5 - - G5 F5 - C5 -",
                "D5 - F5 - Bb5 - A5 -", "Db5 - F5 - Bb5 - - -", "A5 - F5 - G5 - E5 -", "F5 - C5 - A4 - - -"),
            counter: lines("Bb3 - D4 - F4 - D4 -", "Bb3 - - D4 G4 - D4 -", "G3 - Bb3 - C4 - E4 -", "F4 - - E4 C4 - A3 -",
                "Bb3 - D4 - F4 - F4 -", "Bb3 - Db4 - F4 - - -", "C4 - A3 - Bb3 - G3 -", "A3 - A3 - F3 - - -"),
        },
        O: { chords: "C7 | F", lead: lines("G5 - E5 - C5 - E5 -", "F5 - - - . . . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 3
{
    id: "skank", title: "Bog Skank", genre: "Ska", sig: "4/4", key: "G", mode: "major", bpm: 148, grid: 2, bar: 8, unit: 1, beats: [0, 2, 4, 6],
    form: "I A A B A B O",
    style: {
        kick: "x.....x.", snare: "..x...x.", hat: "x.x.x.x.", comp: ".x.x.x.x", perc: "", bass: "R . R 3 5 . 3 <",
        mix: { comp: { wave: "square", vol: 0.05, d: 0.7 }, lead: { wave: "sawtooth", vol: 0.075, d: 1.6 }, long: { wave: "sawtooth", vol: 0.075, d: 4 }, counter: { wave: "square", vol: 0.05, d: 1.5 }, bass: { wave: "sawtooth", vol: 0.11, d: 1.3 } },
    },
    sections: {
        I: { chords: "G | D7", only: ["comp", "kick", "hat"] },
        A: {
            chords: "G | Em | C | D7 | G | Em | Am7 D7 | G",
            lead: lines("D5 . G5 . B5 . A5 G5", "B5 - - . G5 . E5 .", "E5 . G5 . C6 . B5 A5", "A5 - - . F#5 . D5 .",
                "D5 . G5 . B5 . A5 G5", "B5 . . G5 E5 . . G5", "A5 . C6 . A5 . F#5 .", "G5 - - - . . D5 ."),
        },
        B: {
            chords: "Em | Em | Am7 | D7 | Em | C | A7 | D7",
            lead: lines("B4 . E5 . G5 . F#5 E5", "B5 - - - . . G5 .", "C6 - - B5 A5 . G5 .", "F#5 . A5 . D5 - - .",
                "B4 . E5 . G5 . B5 .", "C6 . B5 . G5 . E5 .", "C#5 . E5 . A5 . G5 .", "F#5 . D5 . A4 . D5 ."),
            counter: lines(". . . . B4 . . .", ". . E4 . G4 . B4 .", ". . . . E4 . . .", ". . C4 . A4 . F#4 .",
                ". . . . B4 . . .", ". . G4 . E4 . C4 .", ". . A4 . C#4 . E4 .", ". . A4 . F#4 . . ."),
        },
        O: { chords: "Am7 | D7 | G", lead: lines("A5 . C6 . A5 . G5 .", "F#5 . A5 . D5 . . .", "G5 - - - . . . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 4
{
    id: "wobble", title: "Wobble Beach", genre: "Surf", sig: "4/4", key: "A", mode: "harmonic", bpm: 150, grid: 4, bar: 16, unit: 2, beats: [0, 4, 8, 12], tremEvery: 1,
    form: "I A A B A O",
    style: {
        kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", comp: "x..x..x...x..x..", bass: "R R 5 R R R 5 8",
        mix: { lead: { wave: "sawtooth", vol: 0.06, d: 1.2 }, comp: { wave: "triangle", vol: 0.075, d: 1.8 }, bass: { wave: "square", vol: 0.075, d: 1.5 }, counter: { wave: "sine", vol: 0.1 } },
    },
    sections: {
        I: { chords: "Am | G | F | E", only: ["bass", "kick", "hat", "comp"] },
        A: {
            trem: true, chords: "Am | G | F | E | Am | G | F | E7",
            lead: lines("A4 - - - C5 - E5 -", "D5 - - - B4 - G4 -", "C5 - - - A4 - F4 -", "G#4 - - - B4 - E5 -",
                "A5 - - - E5 - C5 -", "B4 - D5 - G5 - - -", "F5 - E5 - C5 - A4 -", "B4 - G#4 - E4 - - -"),
        },
        B: {
            trem: true, key: "C", mode: "harmonic2", chords: "Am C | G | Am | E | F | C | Dm7 | E7",
            lead: lines("E5 - - - G5 - - -", "D5 - - - B4 - - -", "C5 - - - E5 - A5 -", "G#5 - - - E5 - - -",
                "A5 - - - F5 - C5 -", "G5 - - - E5 - C5 -", "F5 - D5 - A4 - C5 -", "B4 - D5 - G#4 - E4 -"),
        },
        O: { chords: "F | E7 | Am", trem: true, lead: lines("A4 - C5 - F5 - A5 -", "G#5 - E5 - B4 - G#4 -", "A4 - - - - - - .") },
    },
},
// ---------------------------------------------------------------------------------------------- 5
{
    id: "kettle", title: "The Rusty Kettle", genre: "Jig", sig: "6/8", key: "D", mode: "major", bpm: 104, grid: 3, bar: 6, unit: 1, beats: [0, 3],
    form: "I A A B B A A O",
    style: {
        kick: "x..x..", snare: "", hat: "x.xx.x", perc: "..x..x", comp: "..x..x", bass: "R . . 5 . .",
        mix: { lead: { wave: "triangle", vol: 0.17, d: 2 }, long: { wave: "triangle", vol: 0.17, d: 5 }, comp: { wave: "triangle", vol: 0.07, d: 1.6 }, bass: { wave: "sawtooth", vol: 0.09, d: 2.4 }, perc: { note: "A7", vol: 0.06 }, counter: { wave: "square", vol: 0.04, d: 2 } },
    },
    sections: {
        I: { chords: "D | A7", only: ["kick", "comp", "bass", "hat"] },
        A: {
            chords: "D | G | D | A7 | D | G | A7 | D",
            lead: lines("A4 D5 F#5 A5 F#5 D5", "B4 D5 G5 B5 G5 D5", "A4 D5 F#5 A5 B5 A5", "G5 E5 C#5 A4 - -",
                "F#5 G5 A5 D6 A5 F#5", "G5 F#5 G5 B5 A5 G5", "E5 F#5 G5 A5 G5 E5", "D5 - - D5 - -"),
        },
        B: {
            chords: "Bm | G | D | A | Bm | Em7 | A7 | D",
            lead: lines("B5 A5 B5 F#5 E5 D5", "G5 B5 D6 B5 A5 G5", "F#5 A5 D6 A5 F#5 D5", "E5 F#5 A5 C#6 B5 A5",
                "B5 C#6 D6 B5 A5 F#5", "G5 A5 B5 E5 F#5 G5", "A5 G5 E5 C#5 D5 E5", "D5 - A4 D5 - -"),
            counter: lines("D5 - - D5 - -", "D5 - - B4 - -", "A4 - - A4 - -", "C#5 - - E5 - -",
                "D5 - - F#5 - -", "E5 - - G4 - -", "A4 - - G4 - -", "F#4 - - F#4 - -"),
        },
        O: { chords: "G | A7 | D", lead: lines("G5 A5 B5 D6 B5 G5", "A5 G5 E5 C#5 D5 E5", "D5 - - - . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 6
{
    id: "swamp", title: "Swamp Shuffle", genre: "Blues", sig: "12/8", key: "A", mode: "blues", bpm: 92, grid: 3, bar: 12, unit: 3, beats: [0, 3, 6, 9],
    form: "I A B O",
    style: {
        kick: "x.....x.....", snare: "...x.....x..", hat: "x.xx.xx.xx.x", comp: "...x.....x..", bass: "R 3 5 7",
        mix: { lead: { wave: "sawtooth", vol: 0.07, d: 2 }, long: { wave: "sawtooth", vol: 0.07, d: 5 }, bass: { wave: "sawtooth", vol: 0.1, d: 2.3 }, comp: { wave: "square", vol: 0.04, d: 2 } },
    },
    sections: {
        I: { chords: "A7 | E7", only: ["kick", "snare", "hat", "bass"] },
        A: {
            chords: "A7 | D7 | A7 | A7 | D7 | D7 | A7 | A7 | E7 | D7 | A7 | E7",
            lead: lines("[. - A4] [C5 - C#5] E5 .", "[F#5 - E5] [D5 - C5] A4 .", "[. - A4] [C5 - C#5] E5 [G5 - E5]", "A5 - - .",
                "[. - D5] [F5 - F#5] A5 .", "[C6 - A5] [F#5 - D5] C5 .", "[. - A4] [C5 - C#5] E5 [G5 - E5]", "A5 - [. - G5] .",
                "B5 [. - G#5] E5 [. - D5]", "A5 [. - F#5] D5 [. - C5]", "[A4 - C5] [C#5 - E5] [G5 - E5] [C#5 - A4]", "[E5 - D5] [B4 - G#4] E4 ."),
        },
        B: {
            chords: "A7 | D7 | A7 | A7 | D7 | D7 | A7 | A7 | E7 | D7 | A7 | E7",
            lead: lines("A5 - [. - G5] [E5 - G5]", "A5 - [. - F#5] [D5 - C5]", "A4 [C5 - C#5] E5 [G5 - A5]", "[C6 - A5] [G5 - E5] C#5 .",
                "D5 [F5 - F#5] A5 [C6 - A5]", "D6 - [. - C6] A5", "[E5 - G5] A5 [C6 - A5] G5", "E5 - [. - C#5] .",
                "B4 [D5 - E5] G#5 B5", "A5 [F#5 - D5] C5 A4", "A4 - [C#5 - E5] A5", "G#5 - E5 ."),
            counter: rep(". . . .", 3) + " | " + lines("G4 - E4 .", ". . . .", "F#4 - D4 .", ". . . .", "G4 - E4 .", "G#4 - B4 .", "F#4 - D4 .", "E4 - G4 .", "G#4 - B4 ."),
        },
        O: { chords: "D7 | E7 | A7", lead: lines("A5 [F#5 - D5] C5 A4", "G#4 B4 D5 G#5", "A5 - - .") },
    },
},
// ---------------------------------------------------------------------------------------------- 7
{
    id: "warts", title: "Waltz of the Warts", genre: "Waltz", sig: "3/4", key: "C", mode: "harmonic", bpm: 168, grid: 2, bar: 6, unit: 1, beats: [0, 2, 4],
    form: "I A A B A B A O",
    style: {
        kick: "x.....", snare: "", hat: "..x.x.", comp: "..x.x.", bass: "R . . . . .", perc: "",
        mix: { lead: { wave: "triangle", vol: 0.18, d: 2.4 }, long: { wave: "triangle", vol: 0.18, d: 6 }, comp: { wave: "sawtooth", vol: 0.04, d: 1.4 }, bass: { wave: "sawtooth", vol: 0.11, d: 3 }, counter: { wave: "sine", vol: 0.12, d: 3 }, kick: { vol: 0.34 } },
    },
    sections: {
        I: { chords: "Cm | G7", only: ["bass", "comp", "hat", "kick"] },
        A: {
            chords: "Cm | Fm | G7 | Cm | Ab | Fm | G7 | Cm",
            lead: lines("G4 - C5 - Eb5 -", "Ab5 - - G5 F5 -", "G5 - F5 - D5 B4", "C5 - - - G4 -",
                "C5 - Eb5 - Ab5 -", "F5 - Ab5 - C6 -", "D6 - B5 - G5 F5", "Eb5 - C5 - . ."),
        },
        B: {
            key: "Eb", mode: "major", chords: "Eb | Bb7 | Eb | C7 | Fm | Ab | D7 | G7",
            lead: lines("G5 - Bb5 - G5 Eb5", "Ab5 - - F5 D5 -", "Eb5 - G5 - Bb5 -", "Bb5 - G5 - E5 -",
                "F5 - Ab5 - C6 -", "Eb6 - C6 - Ab5 -", "F#5 - A5 - C6 -", "B5 - G5 - D5 F5"),
            counter: lines("Bb4 - - - Bb4 -", "D5 - - - Bb4 -", "G4 - - - Eb5 -", "G4 - - - C5 -",
                "Ab4 - - - F4 -", "C5 - - - Eb5 -", "D5 - - - F#4 -", "G4 - - - B4 -"),
        },
        O: { chords: "Fm | G7 | Cm", lead: lines("Ab5 - - G5 F5 -", "G5 - F5 - D5 B4", "C5 - - - . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 8
{
    id: "knuckles", title: "Greasy Knuckles", genre: "Funk", sig: "4/4", key: "E", mode: "dorian", bpm: 100, grid: 4, bar: 16, unit: 2, beats: [0, 4, 8, 12],
    form: "I A A B A O",
    style: {
        kick: ["x.....x...x.....", "x..x....x.....x."], snare: "....x..x.x..x...", hat: "x.xxx.xxx.xxx.xx", comp: "..x..x....x..x.x",
        fill: { snare: "....x..x.x.xxxxx" },
        bass: "R [. R] . [5 .] . [8 5] . [R .]",
        mix: { comp: { wave: "square", vol: 0.04, d: 0.9 }, lead: { wave: "sawtooth", vol: 0.075, d: 1.8 }, long: { wave: "sawtooth", vol: 0.07, d: 5 }, bass: { wave: "square", vol: 0.085, d: 1.5 } },
    },
    sections: {
        I: {
            chords: "Em7 | A9", only: ["bass", "kick", "snare", "hat"],
            bass: lines("E2 [. E2] . [E3 .] . [D3 B2] . [G2 A2]", "A2 [. A2] . [A3 .] . [G3 E3] . [D3 D#3]"),
        },
        A: {
            chords: "Em7 | A9 | Em7 | A9 | Em7 | A9 | G A9 | B7",
            lead: lines("E5 [. G5] . [A5 .] . [B5 A5] G5 .", ". [C#6 .] . [B5 .] [A5 G5] . E5 .", "E5 [. G5] . [A5 .] . [D6 B5] . [A5 G5]", ". [C#6 .] [. E6] . [D6 C#6] . B5 .",
                "E5 [. G5] . [A5 .] . [B5 A5] G5 .", ". [C#6 .] . [B5 .] [A5 G5] . E5 .", "[G5 B5] . [D6 .] . [A5 C#6] . [E6 .] .", "[D#6 .] . [F#5 .] [A5 .] B5 - - ."),
            bass: lines("E2 [. E2] . [E3 .] . [D3 B2] . [G2 A2]", "A2 [. A2] . [A3 .] . [G3 E3] . [D3 D#3]", "E2 [. E2] . [E3 .] . [D3 B2] . [G2 A2]", "A2 [. A2] . [A3 .] . [G3 E3] . [C#3 D3]",
                "E2 [. E2] . [E3 .] . [D3 B2] . [G2 A2]", "A2 [. A2] . [A3 .] . [G3 E3] . [F#2 F2]", "G2 [. G2] . [G2 .] A2 [. A2] . [A2 .]", "B2 . [. B2] . [F#2 .] [A2 .] B2 ."),
        },
        B: {
            mute: ["kickfill"], chords: "Cmaj7 | Bm7 | Am7 | D9 | Cmaj7 | Bm7 | Am7 | B7",
            lead: lines("G5 - E5 [. G5] . B5 [. G5] .", "F#5 - D5 [. F#5] . A5 [. F#5] .", "E5 - C5 [. E5] . G5 [. E5] .", "F#5 [. A5] . [C6 .] [A5 .] F#5 D5 .",
                "G5 - E5 [. G5] . B5 [. C6] .", "D6 - A5 [. B5] . F#5 [. A5] .", "C6 - A5 [. E5] . G5 [. A5] .", "B5 [. A5] . [F#5 .] [D#5 .] B4 - ."),
        },
        O: { chords: "Em7 | A9 | Em7", lead: lines("E5 [. G5] . [A5 .] . [B5 A5] G5 .", ". [C#6 .] [. E6] . [D6 C#6] . B5 .", "E5 - - - . . . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 9
{
    id: "moss", title: "Moss Nova", genre: "Bossa", sig: "4/4", key: "A", mode: "minor", bpm: 126, grid: 4, bar: 16, unit: 2, beats: [0, 4, 8, 12],
    form: "I A B A B O",
    style: {
        kick: "x..x....x..x....", snare: "", perc: "x..x..x...x..x..", hat: "x.x.x.x.x.x.x.x.", comp: "x..x..x...x..x..", bass: "R . . 5 5 . . R",
        mix: { perc: { wave: "noise", note: "E6", vol: 0.1, s: 0.03 }, comp: { wave: "triangle", vol: 0.065, d: 2.2 }, lead: { wave: "sine", vol: 0.11, d: 3 }, long: { wave: "sine", vol: 0.12, d: 7 }, bass: { wave: "triangle", vol: 0.14, d: 3 }, hat: { vol: 0.03 }, kick: { vol: 0.26 } },
    },
    sections: {
        I: { chords: "Am7 | E7", only: ["perc", "hat", "comp", "bass", "kick"] },
        A: {
            chords: "Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7 | Am7 | A7",
            lead: lines("F5 - - E5 D5 - A4 -", "B4 - D5 - F5 - - E5", "E5 - - - - D5 C5 -", "A5 - - G5 F5 - C5 -",
                "D5 - F5 - A5 - - -", "G#5 - E5 - D5 - B4 -", "C5 - E5 - G5 - - -", "C#5 - - E5 G5 - - -"),
        },
        B: {
            chords: "Fmaj7 | Bb7 | Am7 | D7 | Dm7 | G7 | Cmaj7 | E7",
            lead: lines("A5 - - G5 E5 - C5 -", "Ab5 - - F5 D5 - Bb4 -", "C5 - E5 - G5 - A5 -", "F#5 - - E5 C5 - A4 -",
                "F5 - A5 - C6 - A5 -", "B5 - G5 - F5 - D5 -", "E5 - G5 - B5 - - -", "G#5 - - - E5 - B4 -"),
            counter: lines("C5 - - - - - A4 -", "D5 - - - - - Ab4 -", "E4 - - - E4 - - -", "A4 - - - - - F#4 -",
                "A4 - - - - - F4 -", "F4 - - - - - B4 -", "B4 - - - G4 - - -", "D5 - - - B4 - G#4 -"),
        },
        O: { chords: "Dm7 | E7 | Am7", lead: lines("F5 - A5 - C6 - A5 -", "G#5 - E5 - D5 - B4 -", "A4 - - - - - - .") },
    },
},
// ---------------------------------------------------------------------------------------------- 10
{
    id: "disco", title: "Dungeon Disco", genre: "Disco", sig: "4/4", key: "B", mode: "minor", bpm: 122, grid: 4, bar: 16, unit: 2, beats: [0, 4, 8, 12],
    form: "I A A B A B O",
    style: {
        kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", perc: "....x.......x...", comp: "..x..x....x..x..", bass: "R 8 R 8 R 8 R 8",
        fill: { snare: "....x.......xxxx" },
        mix: { perc: { note: "D7", vol: 0.11, s: 0.05 }, hat: { vol: 0.08, s: 0.07 }, comp: { wave: "sawtooth", vol: 0.04, d: 1.6 }, lead: { wave: "square", vol: 0.08, d: 2.4 }, long: { wave: "sawtooth", vol: 0.07, d: 7 }, bass: { wave: "sawtooth", vol: 0.08, d: 1.5 } },
    },
    sections: {
        I: { chords: "Bm | Bm | G | F#7", only: ["kick", "hat", "bass"] },
        A: {
            chords: "Bm | G | D | A | Bm | G | Em7 | F#7",
            lead: lines("F#5 - B5 - [. A5] . F#5 .", "G5 - B5 - [. A5] . G5 .", "A5 - D6 - [. C#6] . A5 .", "E5 - A5 - [. G5] . E5 .",
                "F#5 - B5 - [. A5] . D6 .", "B5 - D6 - [. B5] . G5 .", "G5 - E5 - G5 - B5 -", "A#5 - - - F#5 - C#6 -"),
        },
        B: {
            chords: "G | A | F#m7 | Bm | G | A | F#7 | Bm",
            lead: lines("B5 - - [A5 B5] D6 - B5 -", "C#6 - - [B5 C#6] E6 - C#6 -", "A5 - - [G5 A5] C#6 - A5 -", "F#5 - - [E5 F#5] B5 - - -",
                "B5 - - [A5 B5] D6 - B5 -", "C#6 - - [D6 E6] F#6 - E6 -", "C#6 - A#5 - F#5 - A#5 -", "B5 - - - - - . ."),
            counter: lines("D5 - - - G5 - - -", "E5 - - - A5 - - -", "C#5 - - - F#5 - - -", "D5 - - - F#5 - - -",
                "D5 - - - G5 - - -", "E5 - - - A5 - - -", "F#5 - - - C#5 - - -", "D5 - - - - - . ."),
        },
        O: { chords: "Em7 | F#7 | Bm", lead: lines("G5 - E5 - G5 - B5 -", "A#5 - - - F#5 - C#6 -", "B5 - - - - - . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 11
{
    id: "thumbs", title: "Five Thumbs", genre: "Rock in 5", sig: "5/4", key: "A", mode: "harmonic", bpm: 150, grid: 2, bar: 10, unit: 1, beats: [0, 2, 4, 6, 8],
    form: "I A A B A O",
    style: {
        kick: "x.....x...", snare: "....x...x.", hat: "x.x.x.x.x.", comp: "x.....x...", bass: "R . R . R . 5 . R .",
        fill: { snare: "....x.x.xx" },
        mix: { lead: { wave: "sawtooth", vol: 0.075, d: 2 }, long: { wave: "sawtooth", vol: 0.07, d: 5 }, comp: { wave: "sawtooth", vol: 0.045, d: 3 }, bass: { wave: "square", vol: 0.075, d: 1.7 } },
    },
    sections: {
        I: { chords: "Am | E7", only: ["kick", "snare", "hat", "bass"] },
        A: {
            chords: "Am | Am | F | G | Am | Am | Dm | E7",
            lead: lines("A4 . C5 . E5 F5 D5 . C5 .", "A4 . C5 . E5 F5 G5 . E5 .", "A4 . C5 . F5 G5 E5 . C5 .", "B4 . D5 . G5 A5 F5 . D5 .",
                "A5 . G5 . E5 F5 D5 . C5 .", "A4 . C5 . E5 G5 A5 . G5 .", "F5 . E5 . D5 E5 A4 . D5 .", "G#4 . B4 . E5 F5 D5 . B4 ."),
        },
        B: {
            key: "C", mode: "harmonic2", chords: "C | G | Am | F | C | G | F | E7",
            lead: lines("G5 - - - E5 - C5 - E5 -", "D5 - - - B4 - G4 - B4 -", "C5 - - - A4 - E4 - A4 -", "C5 - A4 - F4 - A4 - C5 -",
                "E5 - G5 - C6 - - - G5 -", "D5 - G5 - B5 - - - G5 -", "A5 - - - F5 - C5 - A4 -", "G#4 - B4 - E5 - G#5 - B5 -"),
            counter: lines("C5 - - - G4 - - - G4 -", "B4 - - - G4 - - - G4 -", "A4 - - - E4 - - - E4 -", "A4 - - - C4 - - - F4 -",
                "G4 - - - G4 - - - E4 -", "G4 - - - G4 - - - D4 -", "C5 - - - A4 - - - F4 -", "E4 - - - G#4 - - - B4 -"),
        },
        O: { chords: "Dm | E7 | Am", lead: lines("F5 . E5 . D5 E5 A4 . D5 .", "G#4 . B4 . E5 F5 D5 . B4 .", "A4 - - - - - - - . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 12
{
    id: "sevenfeet", title: "Seven Left Feet", genre: "Balkan 7/8", sig: "7/8", key: "D", mode: "freygish", bpm: 128, grid: 2, bar: 7, unit: 1, beats: [0, 3, 5],
    form: "I A A B A B O",
    style: {
        kick: "x..x.x.", snare: "...x...", hat: "xxxxxxx", perc: ".....x.", comp: "x..x.x.", bass: "R . . 5 . R .",
        fill: { snare: "...x.xx" },
        mix: { lead: { wave: "sawtooth", vol: 0.08, d: 1.8 }, long: { wave: "sawtooth", vol: 0.075, d: 4 }, comp: { wave: "square", vol: 0.034, d: 1.3 }, hat: { vol: 0.035 }, bass: { wave: "sawtooth", vol: 0.09, d: 1.7 }, counter: { wave: "square", vol: 0.035, d: 1.6 } },
    },
    sections: {
        I: { chords: "D | Eb | D | D", only: ["kick", "snare", "hat", "bass", "comp"] },
        A: {
            chords: "D | Cm | D | Gm | D | Eb | Cm | D",
            lead: lines("D5 Eb5 F#5 A5 G5 F#5 Eb5", "C5 D5 Eb5 G5 F#5 Eb5 D5", "F#5 G5 A5 D6 C6 A5 G5", "G5 - Bb5 A5 G5 F#5 G5",
                "A5 - - F#5 A5 D6 .", "G5 Bb5 Eb6 D6 Bb5 G5 Eb5", "C5 Eb5 G5 C6 Bb5 G5 F#5", "D5 F#5 A5 F#5 D5 - -"),
        },
        B: {
            chords: "Gm | D | Cm | D | Gm | Eb | Cm | D",
            lead: lines("Bb5 - - A5 G5 F#5 G5", "A5 - - F#5 D5 Eb5 F#5", "G5 - - Eb5 C5 D5 Eb5", "F#5 - - D5 A4 Bb4 C5",
                "Bb4 D5 G5 Bb5 A5 G5 F#5", "G5 - Eb5 Bb4 G5 F5 Eb5", "Eb5 G5 C6 Bb5 G5 F#5 Eb5", "D5 - - - D5 - -"),
            counter: lines("D5 - - D5 - D5 -", "F#4 - - A4 - D5 -", "Eb4 - - G4 - C5 -", "D4 - - F#4 - A4 -",
                "G4 - - Bb4 - D5 -", "Eb4 - - G4 - Bb4 -", "C4 - - Eb4 - G4 -", "A4 - - - F#4 - -"),
        },
        O: { chords: "Eb | D | D", lead: lines("G5 Bb5 Eb6 D6 Bb5 G5 Eb5", "D5 Eb5 F#5 G5 F#5 Eb5 D5", "D5 - - - - . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 13
{
    id: "stalactite", title: "Stalactite Breaks", genre: "Drum & Bass", sig: "4/4", key: "F", mode: "minor", bpm: 172, grid: 4, bar: 16, unit: 2, beats: [0, 4, 8, 12],
    form: "I A A B A B A O",
    style: {
        kick: ["x.........x.....", "x.........x..x.."], snare: "....x..x.x..x...", hat: "x.x.x.x.x.x.x.x.", comp: "x...............", bass: "R - - - 8 - R -",
        fill: { snare: "....x..x.x.xxxxx" },
        mix: { kick: { vol: 0.4, s: 0.12 }, snare: { vol: 0.2, s: 0.12 }, comp: { wave: "sawtooth", vol: 0.04, d: 14 }, bass: { wave: "sawtooth", vol: 0.1, d: 6 }, lead: { wave: "square", vol: 0.07, d: 2.2 }, long: { wave: "square", vol: 0.07, d: 8 }, hat: { vol: 0.05 } },
    },
    sections: {
        I: { chords: "Fm | Fm | Db | C7", only: ["comp", "hat", "bass"] },
        A: {
            chords: "Fm | Fm | Db | Db | Ab | Ab | Eb | Eb",
            lead: lines("C6 - - - Ab5 - F5 -", "Ab5 - Bb5 - C6 - - -", "Db6 - - - Ab5 - F5 -", "F5 - Eb5 - Db5 - - -",
                "C5 - - - Eb5 - Ab5 -", "C6 - Bb5 - Ab5 - - -", "G5 - - - Bb5 - Eb6 -", "Db6 - C6 - Bb5 - G5 -"),
        },
        B: {
            chords: "Bbm | Bbm | Fm | Fm | Db | Db | C7 | C7",
            lead: lines("F5 - Ab5 - Bb5 - - -", "Db6 - C6 - Bb5 - F5 -", "Ab5 - C6 - F6 - - -", "Eb6 - C6 - Ab5 - F5 -",
                "Ab5 - Db6 - F6 - - -", "Eb6 - Db6 - C6 - Ab5 -", "G5 - Bb5 - C6 - E6 -", "G5 - E5 - C5 - G4 -"),
            counter: lines("Db5 - - - F5 - - -", "F5 - - - Db5 - - -", "C5 - - - Ab4 - - -", "Ab4 - - - C5 - - -",
                "F4 - - - Ab4 - - -", "Ab4 - - - F4 - - -", "E5 - - - G4 - - -", "Bb4 - - - E4 - - -"),
        },
        O: { chords: "Db | C7 | Fm", lead: lines("Ab5 - Db6 - F6 - - -", "G5 - E5 - C5 - G4 -", "F5 - - - - - . .") },
    },
},
// ---------------------------------------------------------------------------------------------- 14
{
    id: "galop", title: "Grand Goblin Galop", genre: "Festival Finale", sig: "2/2", key: "C", mode: "major", bpm: 176, grid: 2, bar: 8, unit: 1, beats: [0, 4],
    form: "I A A B A C C O",
    style: {
        kick: "x...x...", snare: "x.xxx.xx", hat: "x.x.x.x.", perc: "..x...x.", comp: "..x...x.", bass: "R . 5 . R . 5 .",
        fill: { snare: "x.x.xxxx" },
        mix: { snare: { vol: 0.12, s: 0.08 }, lead: { wave: "sawtooth", vol: 0.075, d: 1.7 }, long: { wave: "sawtooth", vol: 0.07, d: 4 }, comp: { wave: "square", vol: 0.04, d: 1.3 }, bass: { wave: "sawtooth", vol: 0.1, d: 1.7 } },
    },
    sections: {
        I: { chords: "C | G7 | C | G7", only: ["kick", "snare", "hat", "bass"] },
        A: {
            chords: "C | G7 | C | G7 | C | F | G7 | C",
            lead: lines("G4 C5 E5 G5 C6 - G5 -", "F5 D5 B4 G4 D5 - B4 -", "G4 C5 E5 G5 C6 - E6 -", "D6 B5 G5 F5 D5 - B4 -",
                "C5 E5 G5 C6 E6 - C6 -", "A5 F5 C5 F5 A5 - C6 -", "B5 A5 G5 F5 D5 E5 F5 D5", "C5 - G4 - C5 - . ."),
        },
        B: {
            mode: "harmonic2", chords: "Am | E7 | Am | E7 | F | C | D7 | G7",
            lead: lines("A4 C5 E5 A5 E5 C5 A4 -", "G#4 B4 E5 G#5 E5 B4 G#4 -", "A4 C5 E5 A5 C6 A5 E5 -", "B5 G#5 E5 D5 B4 G#4 E4 -",
                "F4 A4 C5 F5 A5 F5 C5 -", "G4 C5 E5 G5 C6 G5 E5 -", "F#5 A5 D6 A5 F#5 D5 C5 -", "B4 D5 F5 G5 B5 G5 F5 D5"),
            counter: lines("E4 - - - C4 - - -", "E4 - - - G#4 - - -", "E4 - - - A4 - - -", "G#4 - - - E4 - - -",
                "C4 - - - F4 - - -", "E4 - - - G4 - - -", "D4 - - - F#4 - - -", "G4 - - - F4 - - -"),
        },
        C: { // Up a semitone for the last lap, as any finale deserves.
            key: "Db", chords: "Db | Ab7 | Db | Ab7 | Db | Gb | Ab7 | Db",
            lead: up(lines("G4 C5 E5 G5 C6 - G5 -", "F5 D5 B4 G4 D5 - B4 -", "G4 C5 E5 G5 C6 - E6 -", "D6 B5 G5 F5 D5 - B4 -",
                "C5 E5 G5 C6 E6 - C6 -", "A5 F5 C5 F5 A5 - C6 -", "B5 A5 G5 F5 D5 E5 F5 D5", "C5 - G4 - C5 - - -"), 1),
            counter: up(lines("E4 - - - E4 - - -", "D4 - - - G4 - - -", "E4 - - - G4 - - -", "F4 - - - G4 - - -",
                "E4 - - - G4 - - -", "F4 - - - F4 - - -", "F4 - - - D4 - - -", "E4 - - - E4 - - -"), 1),
        },
        O: { key: "Db", chords: "Gb | Ab7 | Db | Db", lead: lines("Bb5 Gb5 Db5 Gb5 Bb5 - Db6 -", "C6 Bb5 Ab5 Gb5 Eb5 F5 Gb5 Eb5", "Db5 F5 Ab5 Db6 F6 - - .", "Db6 - - - . . . .") },
    },
},
];

// Menu loops. Short, warm and quiet: they play for a long time, so nothing here shouts.
export const MENU = {
    title: {
        id: "title", title: "Goblin Fanfare", key: "Bb", mode: "major", bpm: 112, grid: 4, bar: 16, unit: 2, beats: [0, 4, 8, 12], form: "A",
        style: {
            kick: "x.......x.......", snare: "....x.......x...", perc: "..x...x...x...x.", comp: "....x.......x...", bass: "R . . . 5 . . .",
            mix: { lead: { wave: "square", vol: 0.055 }, long: { wave: "square", vol: 0.05, d: 6 }, kick: { vol: 0.26 }, snare: { vol: 0.11 }, perc: { vol: 0.04 }, bass: { vol: 0.075, d: 3.2 }, comp: { vol: 0.03 }, click: { vol: 0.05 } },
        },
        sections: { A: { chords: "Bb | Gm | Eb | F7 | Bb | Gm | Eb F7 | Bb", lead: lines("D5 - F5 - Bb5 - F5 -", "G5 - D5 - Bb4 - D5 -", "Eb5 - G5 - Bb5 - G5 -", "A5 - F5 - C5 - Eb5 -", "D5 - F5 - Bb5 - D6 -", "Bb5 - G5 - D5 - G5 -", "G5 - Eb5 - F5 - C5 -", "Bb4 - - - - - . .") } },
    },
    map: {
        id: "map", title: "On the Road", key: "F", mode: "major", bpm: 96, grid: 3, bar: 12, unit: 3, beats: [0, 3, 6, 9], form: "A",
        style: {
            kick: "x.....x.....", snare: "", hat: "x.xx.xx.xx.x", comp: "...x.....x..", bass: "R 3 5 3",
            mix: { lead: { wave: "triangle", vol: 0.1, d: 3 }, long: { wave: "triangle", vol: 0.1, d: 7 }, kick: { vol: 0.2 }, hat: { vol: 0.022 }, bass: { wave: "triangle", vol: 0.12, d: 2.6 }, comp: { wave: "triangle", vol: 0.04, d: 2 }, click: { vol: 0.03 } },
        },
        sections: { A: { chords: "F | Dm7 | Gm7 | C7 | F | Bb | Gm7 C7 | F", lead: lines("A5 - [G5 - F5] C5", "D5 F5 A5 -", "Bb5 - [A5 - G5] D5", "E5 G5 Bb5 -", "A5 C6 [A5 - F5] C5", "D5 F5 Bb5 -", "A5 G5 Bb5 E5", "F5 - - .") } },
    },
    win: {
        id: "win", title: "Encore", key: "C", mode: "major", bpm: 120, grid: 4, bar: 16, unit: 2, beats: [0, 4, 8, 12], form: "A",
        style: {
            kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", comp: "..x..x....x..x..", bass: "R . R 5 R . 5 R",
            mix: { lead: { wave: "square", vol: 0.055, d: 2 }, long: { wave: "square", vol: 0.05, d: 5 }, kick: { vol: 0.24 }, snare: { vol: 0.1 }, hat: { vol: 0.03 }, bass: { vol: 0.07 }, comp: { vol: 0.028 }, click: { vol: 0.05 } },
        },
        sections: { A: { chords: "C | F | G7 | C | Am | F | G7 | C", lead: lines("E5 G5 C6 - G5 - E5 -", "F5 A5 C6 - A5 - F5 -", "G5 B5 D6 - B5 - G5 -", "E5 G5 C6 - - - . .", "E5 A5 C6 - A5 - E5 -", "F5 A5 C6 - F6 - C6 -", "D6 C6 B5 A5 G5 - F5 D5", "C5 - - - - - . .") } },
    },
    sad: {
        id: "sad", title: "Back to the Bus", key: "C", mode: "harmonic", bpm: 76, grid: 2, bar: 6, unit: 1, beats: [0, 2, 4], form: "A",
        style: {
            kick: "x.....", comp: "..x.x.", bass: "R . . . . .",
            mix: { lead: { wave: "triangle", vol: 0.1, d: 2.5 }, long: { wave: "triangle", vol: 0.1, d: 5 }, kick: { vol: 0.15 }, bass: { wave: "triangle", vol: 0.14, d: 3 }, comp: { wave: "triangle", vol: 0.04, d: 1.5 }, click: { vol: 0.02 } },
        },
        sections: { A: { chords: "Cm | Fm | G7 | Cm", lead: lines("Eb5 - D5 - C5 -", "Ab5 - G5 - F5 -", "F5 - D5 - B4 -", "C5 - - - . .") } },
    },
    click: {
        id: "click", title: "Metronome", key: "C", mode: "major", bpm: 100, grid: 2, bar: 8, unit: 1, beats: [0, 2, 4, 6], form: "A",
        style: {
            kick: "x.x.x.x.", perc: "x.x.x.x.",
            mix: { kick: { wave: "sine", note: "C6", slide: 0.5, vol: 0.34, s: 0.06 }, click: { note: "C8", vol: 0.14, s: 0.015 }, perc: { vol: 0 } },
        },
        sections: { A: { chords: "C | C", lead: "" } },
    },
};

export const songById = (id) => SONGS.find((s) => s.id === id);
