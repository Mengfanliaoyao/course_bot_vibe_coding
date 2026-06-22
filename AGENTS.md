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

### Controls
| Key | Action |
|-----|--------|
| ← → | Move left/right |
| ↑ | Rotate clockwise |
| ↓ | Soft drop (faster fall) |
| Space | Hard drop (instant) |
| P | Pause/Resume |
| Enter | Start / Restart |

### Scoring
| Lines cleared | Points |
|---------------|--------|
| 1 line (Single) | 40 × level |
| 2 lines (Double) | 100 × level |
| 3 lines (Triple) | 300 × level |
| 4 lines (Tetris) | 1200 × level |

Level increases every 10 lines cleared. Drop speed increases with level.
