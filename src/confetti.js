import confetti from 'canvas-confetti';

export function fireWinConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 }
  };

  function fire(particleRatio, opts) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#6aaa64', '#e9ba3a', '#f59e0b', '#10b981']
  });
  fire(0.2, {
    spread: 60,
    colors: ['#6aaa64', '#e9ba3a', '#ffffff']
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    colors: ['#ffd700', '#ff9800', '#4caf50']
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45
  });
}
