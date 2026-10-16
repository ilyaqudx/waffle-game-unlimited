import fs from 'fs';

const words = JSON.parse(fs.readFileSync('src/wordle-words.json', 'utf-8'));

// Build pattern maps for letters at indices 0, 2, 4
const tripleSet = new Set();
const byTriple = new Map();
for (const w of words) {
  const trip = w[0] + w[2] + w[4];
  tripleSet.add(trip);
  if (!byTriple.has(trip)) byTriple.set(trip, []);
  byTriple.get(trip).push(w);
}

const triples = Array.from(tripleSet);

// Pseudo-random generator with seed for determinism
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(987654321);

function shuffleWithRng(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const shuffledTriples = shuffleWithRng(triples, rng);

const by0 = new Map();
for (const t of triples) {
  if (!by0.has(t[0])) by0.set(t[0], []);
  by0.get(t[0]).push(t);
}

const wordUsage = new Map();
for (const w of words) wordUsage.set(w, 0);

const puzzles = [];
const usedSignatures = new Set();
const TARGET_PUZZLES = 500;
const MAX_USAGE = 3;

for (const r0 of shuffledTriples) {
  if (puzzles.length >= TARGET_PUZZLES) break;

  const c0List = shuffleWithRng(by0.get(r0[0]) || [], rng);
  const c1List = shuffleWithRng(by0.get(r0[1]) || [], rng);
  const c2List = shuffleWithRng(by0.get(r0[2]) || [], rng);

  let foundForR0 = false;
  for (const c0 of c0List) {
    if (foundForR0) break;
    for (const c1 of c1List) {
      if (foundForR0) break;
      const r1Prefix = c0[1] + c1[1];
      for (const c2 of c2List) {
        const r1 = r1Prefix + c2[1];
        if (!tripleSet.has(r1)) continue;
        const r2 = c0[2] + c1[2] + c2[2];
        if (!tripleSet.has(r2)) continue;

        const h0List = byTriple.get(r0);
        const h1List = byTriple.get(r1);
        const h2List = byTriple.get(r2);
        const v0List = byTriple.get(c0);
        const v1List = byTriple.get(c1);
        const v2List = byTriple.get(c2);

        // Pick best candidates with minimum usage count
        const pickBest = (list, exclude) => {
          const valid = list.filter(w => !exclude.has(w) && (wordUsage.get(w) || 0) < MAX_USAGE);
          if (!valid.length) return null;
          // Sort by usage ascending
          valid.sort((a, b) => (wordUsage.get(a) || 0) - (wordUsage.get(b) || 0));
          return valid[0];
        };

        const chosen = new Set();
        const h0 = pickBest(h0List, chosen);
        if (!h0) continue;
        chosen.add(h0);

        const h1 = pickBest(h1List, chosen);
        if (!h1) continue;
        chosen.add(h1);

        const h2 = pickBest(h2List, chosen);
        if (!h2) continue;
        chosen.add(h2);

        const v0 = pickBest(v0List, chosen);
        if (!v0) continue;
        chosen.add(v0);

        const v1 = pickBest(v1List, chosen);
        if (!v1) continue;
        chosen.add(v1);

        const v2 = pickBest(v2List, chosen);
        if (!v2) continue;
        chosen.add(v2);

        const wordList = [h0, h1, h2, v0, v1, v2];
        const sig = [...wordList].sort().join(',');
        if (usedSignatures.has(sig)) continue;
        usedSignatures.add(sig);

        // Track usage
        wordList.forEach(w => wordUsage.set(w, (wordUsage.get(w) || 0) + 1));

        // Build target grid (21 active cells in row-major order skipping corners)
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

        // Generate scrambled initial state
        const initialLetters = solutionCells.map(c => c.char);
        const cellIndices = Array.from({ length: 21 }, (_, idx) => idx);
        const permRng = mulberry32(puzzles.length * 104729 + 17);

        // Keep 4 cells as starting green clues
        const starterIndices = new Set();
        while (starterIndices.size < 4) {
          starterIndices.add(Math.floor(permRng() * 21));
        }

        // Shuffle non-starter cells
        const movableIndices = cellIndices.filter(idx => !starterIndices.has(idx));
        for (let s = 0; s < 14; s++) {
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

        foundForR0 = true;
        break;
      }
    }
  }
}

fs.writeFileSync('src/puzzles.json', JSON.stringify(puzzles, null, 2));

const allUniqueWords = new Set();
puzzles.forEach(p => [...p.horizontals, ...p.verticals].forEach(w => allUniqueWords.add(w)));

console.log(`Generated ${puzzles.length} Waffle puzzles successfully!`);
console.log(`Total unique words used: ${allUniqueWords.size} words!`);
console.log(`Max usage per word: ${Math.max(...wordUsage.values())}`);
console.log(`Min usage per word: ${Math.min(...[...wordUsage.values()].filter(x => x > 0))}`);
