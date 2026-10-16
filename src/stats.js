const STATS_KEY = 'waffle_stats_v1';
const DAILY_STATE_KEY = 'waffle_daily_state_v1';

export function getStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastDailyDate: null,
    stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
}

export function recordGameResult({ mode, solved, stars, dateStr }) {
  const stats = getStats();
  stats.played++;

  if (solved) {
    stats.won++;
    const s = Math.min(Math.max(stars, 1), 5);
    stats.stars[s] = (stats.stars[s] || 0) + 1;

    if (mode === 'daily') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (stats.lastDailyDate === yesterdayStr) {
        stats.currentStreak++;
      } else if (stats.lastDailyDate !== dateStr) {
        stats.currentStreak = 1;
      }

      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
      stats.lastDailyDate = dateStr;
    }
  } else {
    if (mode === 'daily') {
      stats.currentStreak = 0;
      stats.lastDailyDate = dateStr;
    }
  }

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}

  return stats;
}

export function saveDailyState(state) {
  try {
    localStorage.setItem(DAILY_STATE_KEY, JSON.stringify(state));
  } catch (e) {}
}

export function loadDailyState(todayDateStr) {
  try {
    const raw = localStorage.getItem(DAILY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.dateStr === todayDateStr) {
      return parsed;
    }
  } catch (e) {}
  return null;
}
