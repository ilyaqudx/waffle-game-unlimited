import puzzlesData from './puzzles.json';

export const TOTAL_SWAPS = 15;

export const CELLS = [];
for (let r = 0; r < 5; r++) {
  for (let c = 0; c < 5; c++) {
    if (r % 2 === 1 && c % 2 === 1) continue; // Skip 4 corners
    const isIntersection = r % 2 === 0 && c % 2 === 0;
    const isHorizontalOnly = r % 2 === 0 && c % 2 === 1;
    const isVerticalOnly = r % 2 === 1 && c % 2 === 0;
    CELLS.push({
      index: CELLS.length,
      r,
      c,
      isIntersection,
      isHorizontalOnly,
      isVerticalOnly,
      hWordIndex: r % 2 === 0 ? r / 2 : null,
      vWordIndex: c % 2 === 0 ? c / 2 : null
    });
  }
}

export function getDailyPuzzleIndex(date = new Date()) {
  const epoch = new Date('2026-01-01T00:00:00Z');
  const now = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayDiff = Math.floor((now - epoch) / (1000 * 60 * 60 * 24));
  return Math.abs(dayDiff) % puzzlesData.length;
}

export function getPuzzleById(id) {
  const found = puzzlesData.find(p => p.id === id);
  return found || puzzlesData[0];
}

export function getTotalPuzzlesCount() {
  return puzzlesData.length;
}

export function getTargetLetters(puzzle) {
  return CELLS.map(cell => {
    if (cell.r % 2 === 0) {
      return puzzle.horizontals[cell.r / 2][cell.c];
    } else {
      return puzzle.verticals[cell.c / 2][cell.r];
    }
  });
}

export function evaluateGrid(puzzle, currentLetters) {
  const targets = getTargetLetters(puzzle);

  const evaluated = CELLS.map((cell, idx) => {
    const char = currentLetters[idx];
    const target = targets[idx];
    const isGreen = char === target;
    return {
      ...cell,
      char,
      target,
      isGreen,
      status: isGreen ? 'green' : 'grey',
      direction: null,
      matchH: false,
      matchV: false
    };
  });

  // Evaluate horizontal lines for yellow matching
  for (let hIdx = 0; hIdx < 3; hIdx++) {
    const r = hIdx * 2;
    const word = puzzle.horizontals[hIdx];
    const rowCells = evaluated.filter(item => item.r === r);

    // Letter frequency needed in row
    const available = {};
    for (let i = 0; i < 5; i++) {
      const ch = word[i];
      available[ch] = (available[ch] || 0) + 1;
    }

    // Deduct exact green matches
    for (const cell of rowCells) {
      if (cell.isGreen) {
        available[cell.char] = (available[cell.char] || 0) - 1;
      }
    }

    // Award yellow horizontal match for remaining
    for (const cell of rowCells) {
      if (!cell.isGreen && (available[cell.char] || 0) > 0) {
        cell.matchH = true;
        available[cell.char]--;
      }
    }
  }

  // Evaluate vertical lines for yellow matching
  for (let vIdx = 0; vIdx < 3; vIdx++) {
    const c = vIdx * 2;
    const word = puzzle.verticals[vIdx];
    const colCells = evaluated.filter(item => item.c === c);

    // Letter frequency needed in col
    const available = {};
    for (let i = 0; i < 5; i++) {
      const ch = word[i];
      available[ch] = (available[ch] || 0) + 1;
    }

    // Deduct exact green matches
    for (const cell of colCells) {
      if (cell.isGreen) {
        available[cell.char] = (available[cell.char] || 0) - 1;
      }
    }

    // Award yellow vertical match for remaining
    for (const cell of colCells) {
      if (!cell.isGreen && (available[cell.char] || 0) > 0) {
        cell.matchV = true;
        available[cell.char]--;
      }
    }
  }

  // Set final status and directional badges
  let allGreen = true;
  for (const cell of evaluated) {
    if (cell.isGreen) continue;
    allGreen = false;

    if (cell.matchH && cell.matchV) {
      cell.status = 'yellow';
      cell.direction = 'both';
    } else if (cell.matchH) {
      cell.status = 'yellow';
      cell.direction = 'horizontal';
    } else if (cell.matchV) {
      cell.status = 'yellow';
      cell.direction = 'vertical';
    } else {
      cell.status = 'grey';
      cell.direction = null;
    }
  }

  return {
    cells: evaluated,
    isSolved: allGreen,
    greenCount: evaluated.filter(c => c.isGreen).length
  };
}

export function calculateStars(remainingSwaps) {
  if (remainingSwaps >= 10) return 5;
  if (remainingSwaps >= 7) return 4;
  if (remainingSwaps >= 4) return 3;
  if (remainingSwaps >= 1) return 2;
  return 1;
}

export class WaffleGame {
  constructor(puzzle, options = {}) {
    this.puzzle = puzzle;
    this.mode = options.mode || 'unlimited'; // 'daily' | 'unlimited'
    this.remainingSwaps = options.remainingSwaps !== undefined ? options.remainingSwaps : TOTAL_SWAPS;
    this.currentLetters = options.initialLetters 
      ? [...options.initialLetters] 
      : puzzle.initial.split('');
    this.selectedIndex = null;
    this.isSolved = false;
    this.gameOver = false;
    this.evaluation = evaluateGrid(this.puzzle, this.currentLetters);
    this.isSolved = this.evaluation.isSolved;
  }

  select(index) {
    if (this.isSolved || (this.remainingSwaps <= 0 && !this.gameOver)) return { action: 'none' };
    const cell = this.evaluation.cells[index];
    if (cell.isGreen) {
      return { action: 'locked', index };
    }

    if (this.selectedIndex === null) {
      this.selectedIndex = index;
      return { action: 'selected', index };
    }

    if (this.selectedIndex === index) {
      this.selectedIndex = null;
      return { action: 'deselected', index };
    }

    // Try to swap selectedIndex and index
    return this.swap(this.selectedIndex, index);
  }

  swap(indexA, indexB) {
    const cellA = this.evaluation.cells[indexA];
    const cellB = this.evaluation.cells[indexB];

    if (cellA.isGreen || cellB.isGreen) {
      this.selectedIndex = null;
      return { action: 'error_locked' };
    }

    if (this.remainingSwaps <= 0) {
      this.selectedIndex = null;
      this.gameOver = true;
      return { action: 'out_of_swaps' };
    }

    const prevGreenCount = this.evaluation.greenCount;

    // Perform swap
    const temp = this.currentLetters[indexA];
    this.currentLetters[indexA] = this.currentLetters[indexB];
    this.currentLetters[indexB] = temp;

    this.remainingSwaps--;
    this.selectedIndex = null;

    // Re-evaluate
    this.evaluation = evaluateGrid(this.puzzle, this.currentLetters);
    const newGreenCount = this.evaluation.greenCount;
    const gainedGreens = newGreenCount > prevGreenCount;

    if (this.evaluation.isSolved) {
      this.isSolved = true;
      return {
        action: 'solved',
        indexA,
        indexB,
        remainingSwaps: this.remainingSwaps,
        stars: calculateStars(this.remainingSwaps),
        gainedGreens
      };
    }

    if (this.remainingSwaps <= 0) {
      this.gameOver = true;
      return {
        action: 'game_over',
        indexA,
        indexB,
        remainingSwaps: 0,
        gainedGreens
      };
    }

    return {
      action: 'swapped',
      indexA,
      indexB,
      remainingSwaps: this.remainingSwaps,
      gainedGreens
    };
  }

  addExtraSwaps(count = 3) {
    this.remainingSwaps += count;
    this.gameOver = false;
    return this.remainingSwaps;
  }
}
