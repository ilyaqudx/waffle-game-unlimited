# 🧇 Waffle Game Unlimited

> Play free online daily & unlimited Waffle word puzzle game in browser. Swap scrambled letters on a 5x5 waffle grid to solve 6 intersecting five-letter words in 15 moves or fewer.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel%20Production-success)](https://waffle-game-unlimited.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Core Web Vitals](https://img.shields.io/badge/Lighthouse-100%2F100-brightgreen.svg)]()

---

## 🌟 Features

- **⚡ Instant Play on First Fold (0s Lag):** Built strictly following 哥飞's SEO Game playbook. Zero bloat, zero intrusive ads or loaders above the fold.
- **♾️ Endless Unlimited Mode:** Practice your word puzzle skills without waiting 24 hours. Hit "New Puzzle" anytime to generate endless solvable waffle grids.
- **🌟 Daily Challenge Mode:** Date-seeded puzzle (UTC) so players worldwide tackle the exact same daily waffle and share their results with friends.
- **🎯 Exact Waffle Game Rules & Clues:**
  - 🟩 **Green Tiles:** Letters in the exact right spot. Automatically lock 🔒 to protect your moves.
  - 🟨 **Yellow Tiles:** Letters belonging to the row or column with directional indicator arrows:
    - `↔` belongs to the horizontal word
    - `↕` belongs to the vertical word
    - `⤧` belongs to both intersecting words
  - ⬛ **Grey Tiles:** Letters not belonging to that line.
- **🔊 Web Audio API Synthesizer:** Pure procedural sound effects (tile taps, swap pops, green chimes, victory fanfare) with 0kb external audio file downloads.
- **🎉 Confetti Particles:** Satisfying victory burst via `canvas-confetti`.
- **📊 Comprehensive Stats Tracking:** Win rates, daily streaks, and 5-star distribution graphs persisted in `localStorage`.
- **🚀 Ultra Lightweight (~31KB gzipped):** 100/100 Core Web Vitals score, instant mobile and desktop performance.
- **🔍 Full On-Page SEO & Structured Data:** Semantic HTML5 (`h1`, `h2`, table, FAQ), OpenGraph social card, Schema.org `WebApplication`, `FAQPage`, and `BreadcrumbList` JSON-LD markup.

---

## 🕹️ How to Play

1. Tap an unlocked tile to select it (amber glow).
2. Tap a second unlocked tile to swap their positions.
3. Each swap costs 1 move (15 swaps max).
4. Solve all 6 words (3 horizontal across rows 1, 3, 5; 3 vertical down columns 1, 3, 5).
5. Finish with 10+ swaps left to earn a perfect **5-Star Rating**!

---

## 🛠️ Tech Stack

- **Framework:** Vanilla JavaScript / HTML5 / Modern CSS
- **Bundler:** Vite 6
- **Styling:** Responsive CSS Grid & Flexbox with Fredoka + Inter typography
- **Audio:** Native Web Audio API
- **Deployment:** Vercel Static Hosting

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/ilyaqudx/waffle-game-unlimited.git
cd waffle-game-unlimited

# Install dependencies
npm install

# Start Vite local development server
npm run dev

# Build production bundle
npm run build
```

---

## 📄 License

MIT &copy; 2026 [ilyaqudx](https://github.com/ilyaqudx)
