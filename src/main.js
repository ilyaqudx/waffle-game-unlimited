import './style.css';
import { 
  WaffleGame, 
  getDailyPuzzleIndex, 
  getPuzzleById, 
  getTotalPuzzlesCount, 
  CELLS, 
  calculateStars 
} from './waffle-engine.js';
import { audio } from './audio.js';
import { fireWinConfetti } from './confetti.js';
import { getStats, recordGameResult, saveDailyState, loadDailyState } from './stats.js';
import puzzlesData from './puzzles.json';

// App State
let currentMode = 'daily'; // 'daily' | 'unlimited'
let currentPuzzle = null;
let game = null;
let currentUnlimitedId = 1;

// DOM Elements
const waffleGridEl = document.getElementById('waffle-grid');
const swapsCountEl = document.getElementById('swaps-count');
const puzzleLabelEl = document.getElementById('puzzle-label');
const starsMeterEl = document.getElementById('stars-meter');
const gameMessageEl = document.getElementById('game-message');

const tabDailyEl = document.getElementById('tab-daily');
const tabUnlimitedEl = document.getElementById('tab-unlimited');
const btnResetEl = document.getElementById('btn-reset');
const btnNewPuzzleEl = document.getElementById('btn-new-puzzle');

const btnSoundEl = document.getElementById('btn-sound');
const soundIconEl = document.getElementById('sound-icon');
const btnHelpEl = document.getElementById('btn-help');
const btnStatsEl = document.getElementById('btn-stats');

// Modals
const modalVictoryEl = document.getElementById('modal-victory');
const modalGameoverEl = document.getElementById('modal-gameover');
const modalHelpEl = document.getElementById('modal-help');
const modalStatsEl = document.getElementById('modal-stats');

// Setup Audio UI
function updateSoundIcon() {
  soundIconEl.textContent = audio.isMuted() ? '🔇' : '🔊';
}

btnSoundEl.addEventListener('click', () => {
  const isMuted = audio.toggleMute();
  updateSoundIcon();
  showMessage(isMuted ? 'Sound muted' : 'Sound enabled');
});

function showMessage(msg, duration = 2000) {
  gameMessageEl.textContent = msg;
  if (duration > 0) {
    setTimeout(() => {
      if (gameMessageEl.textContent === msg) {
        gameMessageEl.textContent = '';
      }
    }, duration);
  }
}

// Get Today's Date String in UTC YYYY-MM-DD
function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}

// Initialize Puzzle for Mode
function initGame(mode = 'daily', puzzleId = null) {
  currentMode = mode;
  tabDailyEl.classList.toggle('active', mode === 'daily');
  tabUnlimitedEl.classList.toggle('active', mode === 'unlimited');
  btnNewPuzzleEl.style.display = mode === 'unlimited' ? 'inline-flex' : 'none';

  if (mode === 'daily') {
    const todayStr = getTodayDateStr();
    const dailyIdx = getDailyPuzzleIndex();
    currentPuzzle = puzzlesData[dailyIdx];
    puzzleLabelEl.textContent = `Daily #${currentPuzzle.id}`;

    // Check if saved state exists for today
    const saved = loadDailyState(todayStr);
    if (saved && saved.puzzleId === currentPuzzle.id) {
      game = new WaffleGame(currentPuzzle, {
        mode: 'daily',
        remainingSwaps: saved.remainingSwaps,
        initialLetters: saved.letters
      });
      game.isSolved = saved.isSolved;
      game.gameOver = saved.gameOver;
    } else {
      game = new WaffleGame(currentPuzzle, { mode: 'daily' });
    }
  } else {
    // Unlimited mode
    if (!puzzleId) {
      currentUnlimitedId = Math.floor(Math.random() * getTotalPuzzlesCount()) + 1;
    } else {
      currentUnlimitedId = puzzleId;
    }
    currentPuzzle = getPuzzleById(currentUnlimitedId);
    puzzleLabelEl.textContent = `Unlimited #${currentPuzzle.id}`;
    game = new WaffleGame(currentPuzzle, { mode: 'unlimited' });
  }

  renderBoard();
  updateMetaDisplay();
}

// Render the 5x5 Waffle Board
function renderBoard() {
  waffleGridEl.innerHTML = '';
  const evalCells = game.evaluation.cells;

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const isBlank = r % 2 === 1 && c % 2 === 1;
      const cellEl = document.createElement('div');
      cellEl.className = 'waffle-cell';

      if (isBlank) {
        cellEl.classList.add('blank');
        waffleGridEl.appendChild(cellEl);
        continue;
      }

      // Find corresponding active cell
      const cellData = evalCells.find(item => item.r === r && item.c === c);
      if (!cellData) continue;

      cellEl.classList.add('active-tile');
      cellEl.dataset.index = cellData.index;
      cellEl.textContent = cellData.char;

      // Color status
      if (cellData.isGreen) {
        cellEl.classList.add('tile-green');
        const lock = document.createElement('span');
        lock.className = 'lock-icon';
        lock.textContent = '🔒';
        cellEl.appendChild(lock);
      } else if (cellData.status === 'yellow') {
        cellEl.classList.add('tile-yellow');
        if (cellData.direction) {
          const badge = document.createElement('span');
          badge.className = 'dir-badge';
          if (cellData.direction === 'both') badge.textContent = '⤧';
          else if (cellData.direction === 'horizontal') badge.textContent = '↔';
          else if (cellData.direction === 'vertical') badge.textContent = '↕';
          cellEl.appendChild(badge);
        }
      } else {
        cellEl.classList.add('tile-grey');
      }

      // Selected state
      if (game.selectedIndex === cellData.index) {
        cellEl.classList.add('selected');
      }

      // Tile click handler
      cellEl.addEventListener('click', () => handleCellClick(cellData.index, cellEl));

      waffleGridEl.appendChild(cellEl);
    }
  }
}

// Handle Tile Click / Swap
function handleCellClick(index, cellEl) {
  if (game.isSolved) return;

  const res = game.select(index);

  if (res.action === 'locked') {
    audio.playError();
    cellEl.classList.remove('shake-locked');
    void cellEl.offsetWidth; // trigger reflow
    cellEl.classList.add('shake-locked');
    showMessage('Tile already in correct position! 🔒');
    return;
  }

  if (res.action === 'selected') {
    audio.playTap();
    renderBoard();
    return;
  }

  if (res.action === 'deselected') {
    audio.playTap();
    renderBoard();
    return;
  }

  if (res.action === 'swapped' || res.action === 'solved' || res.action === 'game_over') {
    audio.playSwap();
    if (res.gainedGreens) {
      setTimeout(() => audio.playGreen(), 90);
    }

    renderBoard();
    updateMetaDisplay();
    persistState();

    if (res.action === 'solved') {
      handleWin(res);
    } else if (res.action === 'game_over') {
      handleGameOver();
    }
  }
}

// Update Meta Displays (Swaps & Stars)
function updateMetaDisplay() {
  swapsCountEl.textContent = game.remainingSwaps;

  // Update stars meter
  const starsCount = calculateStars(game.remainingSwaps);
  const starsEls = starsMeterEl.querySelectorAll('.star');
  starsEls.forEach(el => {
    const s = parseInt(el.dataset.s, 10);
    el.classList.toggle('active', s <= starsCount);
  });
}

// Persist Daily State in LocalStorage
function persistState() {
  if (currentMode === 'daily') {
    saveDailyState({
      dateStr: getTodayDateStr(),
      puzzleId: currentPuzzle.id,
      remainingSwaps: game.remainingSwaps,
      letters: game.currentLetters,
      isSolved: game.isSolved,
      gameOver: game.gameOver
    });
  }
}

// Handle Puzzle Solved
function handleWin(res) {
  audio.playWin();
  fireWinConfetti();

  const stars = res.stars;
  const stats = recordGameResult({
    mode: currentMode,
    solved: true,
    stars,
    dateStr: getTodayDateStr()
  });

  // Populate Victory Modal
  const victoryStarsEl = document.getElementById('victory-stars');
  victoryStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);

  document.getElementById('victory-message').textContent = 
    `Outstanding! You solved all 6 words with ${game.remainingSwaps} swaps remaining.`;

  document.getElementById('vstat-swaps').textContent = game.remainingSwaps;
  document.getElementById('vstat-stars').textContent = `${stars}/5`;
  document.getElementById('vstat-streak').textContent = stats.currentStreak || 1;

  setTimeout(() => {
    modalVictoryEl.hidden = false;
  }, 500);
}

// Handle Game Over
function handleGameOver() {
  audio.playError();
  recordGameResult({
    mode: currentMode,
    solved: false,
    stars: 0,
    dateStr: getTodayDateStr()
  });

  setTimeout(() => {
    modalGameoverEl.hidden = false;
  }, 400);
}

// Generate Emoji Grid for Sharing
function generateShareText() {
  const stars = calculateStars(game.remainingSwaps);
  const title = currentMode === 'daily' 
    ? `🧇 Waffle Game Daily #${currentPuzzle.id}`
    : `🧇 Waffle Game Unlimited #${currentPuzzle.id}`;

  const starsText = '⭐️'.repeat(stars) + '☆'.repeat(5 - stars);

  // 5x5 grid representation
  const evalCells = game.evaluation.cells;
  let gridStr = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r % 2 === 1 && c % 2 === 1) {
        gridStr += '⬜';
      } else {
        const cell = evalCells.find(item => item.r === r && item.c === c);
        if (cell && cell.isGreen) gridStr += '🟩';
        else if (cell && cell.status === 'yellow') gridStr += '🟨';
        else gridStr += '⬛';
      }
    }
    gridStr += '\n';
  }

  return `${title}\n${starsText} (${stars}/5 Stars)\nSwaps Left: ${game.remainingSwaps}\n\n${gridStr}\nPlay free: https://waffle-game-unlimited.vercel.app/`;
}

// Share Button Click
document.getElementById('btn-share').addEventListener('click', async () => {
  const text = generateShareText();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Waffle Game Unlimited', text });
      return;
    } catch (e) {}
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(text);
    showMessage('Results copied to clipboard! 📋');
  } catch (e) {
    showMessage('Failed to copy. Please screenshot!');
  }
});

// Mode Switch Listeners
tabDailyEl.addEventListener('click', () => {
  if (currentMode !== 'daily') initGame('daily');
});

tabUnlimitedEl.addEventListener('click', () => {
  if (currentMode !== 'unlimited') initGame('unlimited');
});

// Controls Listeners
btnResetEl.addEventListener('click', () => {
  if (confirm('Restart this puzzle from the beginning?')) {
    game = new WaffleGame(currentPuzzle, { mode: currentMode });
    renderBoard();
    updateMetaDisplay();
    persistState();
    showMessage('Puzzle restarted');
  }
});

btnNewPuzzleEl.addEventListener('click', () => {
  initGame('unlimited');
});

// Victory & Game Over Modals Action Listeners
document.getElementById('btn-next-victory').addEventListener('click', () => {
  modalVictoryEl.hidden = true;
  initGame('unlimited');
});

document.getElementById('btn-next-gameover').addEventListener('click', () => {
  modalGameoverEl.hidden = true;
  initGame('unlimited');
});

document.getElementById('btn-retry-puzzle').addEventListener('click', () => {
  modalGameoverEl.hidden = true;
  game = new WaffleGame(currentPuzzle, { mode: currentMode });
  renderBoard();
  updateMetaDisplay();
  persistState();
});

document.getElementById('btn-add-swaps').addEventListener('click', () => {
  modalGameoverEl.hidden = true;
  game.addExtraSwaps(3);
  updateMetaDisplay();
  showMessage('+3 Swaps added! Keep solving! 🧇');
});

// Help Modal
btnHelpEl.addEventListener('click', () => {
  modalHelpEl.hidden = false;
});

// Stats Modal
btnStatsEl.addEventListener('click', () => {
  const stats = getStats();
  document.getElementById('stat-played').textContent = stats.played;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  document.getElementById('stat-winpct').textContent = `${winPct}%`;
  document.getElementById('stat-streak').textContent = stats.currentStreak || 0;
  document.getElementById('stat-maxstreak').textContent = stats.maxStreak || 0;

  // Render Stars Distribution Bars
  const distContainer = document.getElementById('stars-distribution');
  distContainer.innerHTML = '';
  const maxStarCount = Math.max(1, ...Object.values(stats.stars));

  for (let s = 5; s >= 1; s--) {
    const count = stats.stars[s] || 0;
    const pct = Math.max(10, Math.round((count / maxStarCount) * 100));

    const row = document.createElement('div');
    row.className = 'dist-row';
    row.innerHTML = `
      <span class="dist-label">${'★'.repeat(s)}</span>
      <div class="dist-bar-bg">
        <div class="dist-bar-fill" style="width: ${count > 0 ? pct : 8}%">${count}</div>
      </div>
    `;
    distContainer.appendChild(row);
  }

  modalStatsEl.hidden = false;
});

// Modal Close Buttons
document.querySelectorAll('.modal-close-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetModalId = btn.dataset.close;
    if (targetModalId) {
      const modal = document.getElementById(targetModalId);
      if (modal) modal.hidden = true;
    }
  });
});

// Close modal when clicking outside card
document.querySelectorAll('.modal-backdrop').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.hidden = true;
    }
  });
});

// Start Initial Game
updateSoundIcon();
initGame('daily');
