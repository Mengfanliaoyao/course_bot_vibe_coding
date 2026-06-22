# HTML mini Tetris game

This is a project of web mini Tetris game.
The project use git for version management.

## Project Structure

```
course_bot_vibe_coding/
├── index.html          # Entrypoint: Pico CSS + Canvas game layout
├── AGENTS.md           # This file: project guide & progress tracker
├── README.md           # Brief introduction
├── assets/             # Graphic/audio resources (empty for now)
└── src/
    ├── style.css       # Custom game layout & theme overrides
    └── tetris.js       # Core game logic & Canvas rendering
```

## Code Standards

- Use HTML5 as web infra
- Use TypeScript/javascript
- Good naming style: ClassName classInstance classMenber nonclass_function noneclass_var

## Implementation Plan & Progress

### Phase 1: Foundation (Done)
- [x] Project structure skeleton
- [x] AGENTS.md setup

### Phase 2: Core Implementation (Done)
- [x] `index.html` - Pico CSS CDN + Canvas-based game structure
- [x] `src/style.css` - Custom game board, panel, overlay layout
- [x] `src/tetris.js` - Complete game logic:
  - [x] 10x20 board & 7 tetromino definitions
  - [x] Piece spawning, movement (left/right/down)
  - [x] Collision detection (walls, floor, locked pieces)
  - [x] Rotation (clockwise 90° matrix transform)
  - [x] Line clearing with scoring (40/100/300/1200 × level)
  - [x] Level progression (every 10 lines)
  - [x] Ghost piece (hard drop preview)
  - [x] Next piece preview
  - [x] Game over detection & restart
  - [x] Keyboard controls (← → ↑ ↓ Space P Enter)
  - [x] Touch/mobile support (swipe & tap)
  - [x] Responsive canvas sizing

### Phase 3: Visual, Audio & Difficulty (Done)
- [x] Ghost piece visibility improvement (dashed outline + translucent fill)
- [x] System dark/light theme auto-detection & Canvas adaptation
- [x] Sound effects via Web Audio API (no external files):
  - [x] Block placement sound (triangle, 150Hz)
  - [x] Line clear sounds (sine, ascending pitch)
  - [x] Tetris (4-line) special sound
  - [x] Game over sound (descending sawtooth)
  - [x] BGM with level-proportional tempo
  - [x] Mute toggle (M key)
- [x] Normal / Hard difficulty modes
  - [x] Normal: level up every 10 lines, base interval 800ms
  - [x] Hard: level up every 4 lines, base interval 600ms
- [x] High score per difficulty (localStorage)
- [x] Difficulty & mute controls in side panel

### Phase 4: Polish & Mobile Controls (Done)
- [x] Color palette per theme (dark: brighter, light: darker)
- [x] Ghost piece uses neutral color per theme for universal visibility
- [x] Layout restructured: top bar (mute/difficulty/high score), mobile buttons below board
- [x] On-screen mobile controls (◀ ▼ ▶ ↻ ⤓ ⏸)
- [x] Soft drop sound (ascending pitch with level & drop speed)
- [x] Mobile-keyboard dual control support

### Controls
| Key / Button | Action |
|--------------|--------|
| ← → / ◀ ▶ | Move left/right |
| ↑ / ↻ | Rotate clockwise |
| ↓ / ▼ | Soft drop (faster fall) |
| Space / ⤓ | Hard drop (instant) |
| P / ⏸ | Pause/Resume |
| M / 🔊 | Toggle mute |
| Enter | Start / Restart |

### Scoring
| Lines cleared | Points |
|---------------|--------|
| 1 line (Single) | 40 × level |
| 2 lines (Double) | 100 × level |
| 3 lines (Triple) | 300 × level |
| 4 lines (Tetris) | 1200 × level |

Level increases every 10 lines (Normal) or 4 lines (Hard). Drop speed increases with level.
