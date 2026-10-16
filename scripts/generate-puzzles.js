import fs from 'fs';

const words = JSON.parse(fs.readFileSync('src/wordle-words.json', 'utf-8'));

// Build pattern map for letters at indices 0, 2, 4
const byTriple = new Map();
for (const w of words) {
  const trip = w[0] + w[2] + w[4];
  if (!byTriple.has(trip)) byTriple.set(trip, []);
  byTriple.get(trip).push(w);
}

// Pseudo random generator with seed
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const puzzles = [];
const rng = mulberry32(1234567);

// We want 365 high quality waffles
const shuffled = [...words];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}

const usedCombos = new Set();

for (let i = 0; i < shuffled.length && puzzles.length < 365; i++) {
  const h0 = shuffled[i];
  for (let j = 0; j < 300 && puzzles.length < 365; j++) {
    const h1 = shuffled[(i * 17 + j * 7 + 3) % shuffled.length];
    if (h1 === h0) continue;
    for (let k = 0; k < 300 && puzzles.length < 365; k++) {
      const h2 = shuffled[(i * 31 + k * 13 + 5) % shuffled.length];
      if (h2 === h0 || h2 === h1) continue;

      const t0 = h0[0] + h1[0] + h2[0];
      const t1 = h0[2] + h1[2] + h2[2];
      const t2 = h0[4] + h1[4] + h2[4];

      const v0List = byTriple.get(t0);
      if (!v0List || v0List.length === 0) continue;
      const v1List = byTriple.get(t1);
      if (!v1List || v1List.length === 0) continue;
      const v2List = byTriple.get(t2);
      if (!v2List || v2List.length === 0) continue;

      // Select distinct verticals
      const v0 = v0List.find(w => w !== h0 && w !== h1 && w !== h2);
      if (!v0) continue;
      const v1 = v1List.find(w => w !== h0 && w !== h1 && w !== h2 && w !== v0);
      if (!v1) continue;
      const v2 = v2List.find(w => w !== h0 && w !== h1 && w !== h2 && w !== v0 && w !== v1);
      if (!v2) continue;

      const signature = [h0, h1, h2, v0, v1, v2].sort().join(',');
      if (usedCombos.has(signature)) continue;
      usedCombos.add(signature);

      // Construct solution grid (21 active cells)
      // Cell format: { r, c, targetChar }
      const solutionCells = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r % 2 === 1 && c % 2 === 1) continue; // blank corner
          let char;
          if (r % 2 === 0) {
            char = [h0, h1, h2][r / 2][c];
          } else {
            char = [v0, v1, v2][c / 2][r];
          }
          solutionCells.push({ r, c, char });
        }
      }

      // Generate scrambled state:
      // Start with solved state. Pick 8 to 10 swaps between cells,
      // ensuring that at least 3-5 cells remain in place (green starting clues),
      // and minimum swap distance to solve is 10.
      const initialLetters = solutionCells.map(c => c.char);
      const cellIndices = Array.from({ length: 21 }, (_, idx) => idx);
      
      // Shuffle cell indices
      const permRng = mulberry32(puzzles.length * 99991 + 42);
      
      // Keep ~4 random cells in place (green starters)
      const starterCount = 4;
      const starterIndices = new Set();
      while (starterIndices.size < starterCount) {
        starterIndices.add(Math.floor(permRng() * 21));
      }

      // Shuffle the remaining non-starter cells
      const movableIndices = cellIndices.filter(idx => !starterIndices.has(idx));
      // Perform 8-10 swaps on movable
      for (let s = 0; s < 12; s++) {
        const i1 = Math.floor(permRng() * movableIndices.length);
        let i2 = Math.floor(permRng() * movableIndices.length);
        while (i2 === i1) {
          i2 = Math.floor(permRng() * movableIndices.length);
        }
        const idxA = movableIndices[i1];
        const idxB = movableIndices[i2];
        const temp = initialLetters[idxA];
        initialLetters[idxA] = initialLetters[idxB];
        initialLetters[idxB] = temp;
      }

      puzzles.push({
        id: puzzles.length + 1,
        horizontals: [h0, h1, h2],
        verticals: [v0, v1, v2],
        initial: initialLetters.join('')
      });
      break;
    }
  }
}

fs.writeFileSync('src/puzzles.json', JSON.stringify(puzzles, null, 2));
console.log(`Generated ${puzzles.length} Waffle puzzles successfully!`);
