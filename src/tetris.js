;(function () {
  const COLS = 10
  const ROWS = 20
  const CELL_SIZE = 30

  const DARK_COLORS = {
    I: '#00f0f0', J: '#4488ff', L: '#f0a000',
    O: '#f0f000', S: '#00f000', T: '#a000f0', Z: '#f00000'
  }
  const LIGHT_COLORS = {
    I: '#009999', J: '#3355cc', L: '#b87700',
    O: '#999900', S: '#007700', T: '#7700aa', Z: '#bb0000'
  }

  const SHAPES = {
    I: { matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
    J: { matrix: [[1,0,0],[1,1,1],[0,0,0]] },
    L: { matrix: [[0,0,1],[1,1,1],[0,0,0]] },
    O: { matrix: [[1,1],[1,1]] },
    S: { matrix: [[0,1,1],[1,1,0],[0,0,0]] },
    T: { matrix: [[0,1,0],[1,1,1],[0,0,0]] },
    Z: { matrix: [[1,1,0],[0,1,1],[0,0,0]] }
  }
  const PIECE_KEYS = Object.keys(SHAPES)
  const SCORE_TABLE = [0, 40, 100, 300, 1200]

  const DIFFICULTY = {
    normal: { linesPerLevel: 10, baseInterval: 800 },
    hard: { linesPerLevel: 4, baseInterval: 600 }
  }

  class SoundManager {
    constructor () {
      this.ctx = null
      this.muted = false
    }

    ensureCtx () {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume()
      }
      return this.ctx
    }

    playPlace () {
      if (this.muted) return
      const ctx = this.ensureCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(150, ctx.currentTime)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    }

    playSoftDrop (level) {
      if (this.muted) return
      const ctx = this.ensureCtx()
      const baseFreq = 200 + level * 30
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 100, ctx.currentTime + 0.05)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.05)
    }

    playClear (lines) {
      if (this.muted) return
      const ctx = this.ensureCtx()
      const isTetris = lines >= 4
      const endFreq = isTetris ? 800 : 600
      const duration = isTetris ? 0.4 : 0.2
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    }

    playGameOver () {
      if (this.muted) return
      const ctx = this.ensureCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    }

    startBGM (level) {
      this.stopBGM()
      if (this.muted) return
      const bpm = 60 + level * 15
      const interval = 60000 / bpm
      this.bgmTimer = setInterval(() => {
        if (this.muted) return
        const ctx = this.ensureCtx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        gain.gain.setValueAtTime(0.05, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.06)
      }, interval)
    }

    stopBGM () {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer)
        this.bgmTimer = null
      }
    }

    toggleMute () {
      this.muted = !this.muted
      if (this.muted) this.stopBGM()
      return this.muted
    }
  }

  class TetrisGame {
    constructor () {
      this.canvas = document.getElementById('gameCanvas')
      this.ctx = this.canvas.getContext('2d')
      this.nextCanvas = document.getElementById('nextCanvas')
      this.nextCtx = this.nextCanvas.getContext('2d')

      this.scoreDisplay = document.getElementById('scoreDisplay')
      this.linesDisplay = document.getElementById('linesDisplay')
      this.levelDisplay = document.getElementById('levelDisplay')
      this.highScoreDisplay = document.getElementById('highScoreDisplay')
      this.overlay = document.getElementById('overlay')
      this.overlayMessage = document.getElementById('overlayMessage')
      this.overlaySub = document.getElementById('overlaySub')
      this.difficultySelect = document.getElementById('difficultySelect')
      this.muteBtn = document.getElementById('muteBtn')
      this.pauseBtn = document.getElementById('pauseBtn')

      this.canvas.width = COLS * CELL_SIZE
      this.canvas.height = ROWS * CELL_SIZE
      this.nextCanvas.width = 4 * CELL_SIZE
      this.nextCanvas.height = 4 * CELL_SIZE

      this.sound = new SoundManager()
      this.board = []
      this.score = 0
      this.lines = 0
      this.level = 1
      this.current = null
      this.next = null
      this.gameOver = false
      this.paused = false
      this.started = false
      this.rafId = null
      this.lastTime = 0
      this.dropCounter = 0

      this.touchStartX = 0
      this.touchStartY = 0
      this.softDownActive = false

      this.clearingAnim = null
      this.pendingScore = 0
      this.scorePopupTimer = null
      this.scorePopupEl = document.getElementById('scorePopup')

      this.isDark = true
      this.gridColor = '#222'
      this.canvasBg = '#000'
      this.ghostFillAlpha = 0.15
      this.ghostStrokeAlpha = 0.4
      this.ghostColor = '#fff'
      this.colors = DARK_COLORS

      this.detectTheme()
      this.loadHighScore()
      this.bindEvents()
      this.draw()
    }

    detectTheme () {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const update = () => {
        this.isDark = mq.matches
        this.gridColor = this.isDark ? '#222' : '#ddd'
        this.canvasBg = this.isDark ? '#000' : '#fafafa'
        this.ghostColor = this.isDark ? '#fff' : '#333'
        this.ghostFillAlpha = this.isDark ? 0.15 : 0.12
        this.ghostStrokeAlpha = this.isDark ? 0.4 : 0.3
        this.colors = this.isDark ? DARK_COLORS : LIGHT_COLORS
        this.canvas.style.background = this.canvasBg
        this.nextCanvas.style.background = this.canvasBg
      }
      mq.addEventListener('change', update)
      update()
    }

    loadHighScore () {
      this.highScore = 0
      this.updateHighScoreDisplay()
    }

    getHighScoreKey () {
      return 'tetris_hs_' + this.difficultySelect.value
    }

    saveHighScore () {
      const key = this.getHighScoreKey()
      const prev = parseInt(localStorage.getItem(key) || '0', 10)
      if (this.score > prev) {
        localStorage.setItem(key, String(this.score))
        this.highScore = this.score
      }
    }

    updateHighScoreDisplay () {
      const key = this.getHighScoreKey()
      this.highScore = parseInt(localStorage.getItem(key) || '0', 10)
      this.highScoreDisplay.textContent = this.highScore
    }

    bindEvents () {
      document.addEventListener('keydown', (e) => this.handleKeyDown(e))
      document.addEventListener('keyup', (e) => this.handleKeyUp(e))
      this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true })
      this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true })
      this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true })

      this.difficultySelect.addEventListener('change', () => {
        this.updateHighScoreDisplay()
      })

      this.muteBtn.addEventListener('click', () => {
        const muted = this.sound.toggleMute()
        this.muteBtn.textContent = muted ? '🔇' : '🔊'
        if (!muted && this.started && !this.gameOver && !this.paused) {
          this.sound.startBGM(this.level)
        }
      })

      this.pauseBtn.addEventListener('click', () => {
        if (!this.started || this.gameOver) return
        this.togglePause()
      })

      document.querySelectorAll('.ctrl-btn[data-action]').forEach(btn => {
        const action = btn.dataset.action
        const handler = () => {
          if (!this.started || this.gameOver) {
            this.start()
            return
          }
          if (this.paused || this.clearingAnim) return
          switch (action) {
            case 'left': this.move(-1, 0); break
            case 'right': this.move(1, 0); break
            case 'down': this.softDrop(); break
            case 'rotate': this.rotate(); break
            case 'harddrop': this.hardDrop(); break
          }
        }
        btn.addEventListener('click', handler)
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault()
          handler()
        }, { passive: false })
      })
    }

    handleKeyDown (e) {
      if (e.key === 'Enter') {
        if (this.gameOver || !this.started) {
          this.start()
          e.preventDefault()
          return
        }
      }
      if (!this.started || this.gameOver) return
      if (this.clearingAnim) return
      if (e.key === 'p' || e.key === 'P') {
        this.togglePause()
        e.preventDefault()
        return
      }
      if (e.key === 'm' || e.key === 'M') {
        this.muteBtn.click()
        e.preventDefault()
        return
      }
      if (this.paused) return

      switch (e.key) {
        case 'ArrowLeft': this.move(-1, 0); break
        case 'ArrowRight': this.move(1, 0); break
        case 'ArrowDown':
          this.softDownActive = true
          this.softDrop()
          break
        case 'ArrowUp': this.rotate(); break
        case ' ': this.hardDrop(); break
        default: return
      }
      e.preventDefault()
    }

    handleKeyUp (e) {
      if (e.key === 'ArrowDown') {
        this.softDownActive = false
      }
    }

    softDrop () {
      if (this.isValidMove(this.current.matrix, this.current.x, this.current.y + 1)) {
        this.current.y++
        this.sound.playSoftDrop(this.level)
      } else {
        this.lockPiece()
      }
    }

    handleTouchStart (e) {
      const t = e.touches[0]
      this.touchStartX = t.clientX
      this.touchStartY = t.clientY
    }

    handleTouchMove (e) {
      e.preventDefault()
    }

    handleTouchEnd (e) {
      if (!this.started || this.gameOver) {
        this.start()
        return
      }
      if (this.paused || this.clearingAnim) return

      const dx = e.changedTouches[0].clientX - this.touchStartX
      const dy = e.changedTouches[0].clientY - this.touchStartY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (absDx < 10 && absDy < 10) {
        this.rotate()
      } else if (absDx > absDy) {
        this.move(dx > 0 ? 1 : -1, 0)
      } else {
        if (dy > 0) {
          this.move(0, 1)
        } else {
          this.hardDrop()
        }
      }
    }

    start () {
      this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
      this.score = 0
      this.lines = 0
      this.level = 1
      this.gameOver = false
      this.paused = false
      this.started = true
      this.dropCounter = 0
      this.lastTime = 0
      this.softDownActive = false
      this.clearingAnim = null
      if (this.scorePopupTimer) {
        clearTimeout(this.scorePopupTimer)
        this.scorePopupTimer = null
      }
      this.pendingScore = 0
      this.scorePopupEl.classList.remove('visible')
      this.scorePopupEl.textContent = ''
      this.next = this.randomPiece()
      this.spawnPiece()
      this.updateUI()
      this.updateHighScoreDisplay()
      this.overlay.classList.add('hidden')
      this.sound.stopBGM()
      this.sound.startBGM(this.level)
      if (this.rafId) cancelAnimationFrame(this.rafId)
      this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
    }

    getLinesPerLevel () {
      const diff = this.difficultySelect.value
      return DIFFICULTY[diff] ? DIFFICULTY[diff].linesPerLevel : 10
    }

    getBaseInterval () {
      const diff = this.difficultySelect.value
      return DIFFICULTY[diff] ? DIFFICULTY[diff].baseInterval : 800
    }

    randomPiece () {
      const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]
      return {
        matrix: SHAPES[key].matrix.map(row => [...row]),
        color: this.colors[key],
        key: key
      }
    }

    spawnPiece () {
      this.current = this.next
      this.next = this.randomPiece()
      this.current.x = Math.floor((COLS - this.current.matrix[0].length) / 2)
      this.current.y = 0
      if (!this.isValidMove(this.current.matrix, this.current.x, this.current.y)) {
        this.gameOver = true
        this.showGameOver()
      }
      this.renderNext()
    }

    isValidMove (matrix, offsetX, offsetY) {
      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
          if (matrix[y][x]) {
            const boardX = offsetX + x
            const boardY = offsetY + y
            if (boardX < 0 || boardX >= COLS || boardY >= ROWS || boardY < 0) return false
            if (boardY >= 0 && this.board[boardY][boardX]) return false
          }
        }
      }
      return true
    }

    move (dx, dy) {
      if (this.isValidMove(this.current.matrix, this.current.x + dx, this.current.y + dy)) {
        this.current.x += dx
        this.current.y += dy
        return true
      }
      if (dy === 1) {
        this.lockPiece()
      }
      return false
    }

    rotate () {
      const matrix = this.current.matrix
      const rotated = matrix[0].map((_, i) => matrix.map(row => row[i]).reverse())
      if (this.isValidMove(rotated, this.current.x, this.current.y)) {
        this.current.matrix = rotated
      } else {
        const kick = this.current.x + (this.current.x < COLS / 2 ? 1 : -1)
        if (this.isValidMove(rotated, kick, this.current.y)) {
          this.current.matrix = rotated
          this.current.x = kick
        }
      }
    }

    getGhostY () {
      let gy = this.current.y
      while (this.isValidMove(this.current.matrix, this.current.x, gy + 1)) gy++
      return gy
    }

    hardDrop () {
      this.current.y = this.getGhostY()
      this.lockPiece()
    }

    lockPiece () {
      const { matrix, x, y, color } = this.current
      for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
          if (matrix[row][col]) {
            const boardY = y + row
            const boardX = x + col
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
              this.board[boardY][boardX] = color
            }
          }
        }
      }
      this.sound.playPlace()
      const hasAnim = this.startClearingAnim()
      if (!hasAnim && !this.gameOver) this.spawnPiece()
    }

    startClearingAnim () {
      const clearedRows = []
      for (let row = ROWS - 1; row >= 0; row--) {
        if (this.board[row].every(cell => cell !== 0)) {
          clearedRows.push(row)
        }
      }
      if (clearedRows.length === 0) return false

      const n = clearedRows.length
      const pendingScore = (SCORE_TABLE[n] || 0) * this.level
      this.sound.playClear(n)

      const blockColors = []
      for (const row of clearedRows) {
        for (let col = 0; col < COLS; col++) {
          if (this.board[row][col]) blockColors.push(this.board[row][col])
        }
      }

      const speedMul = Math.max(0.3, 1 - (this.level - 1) * 0.05)

      this.clearingAnim = {
        rows: clearedRows,
        n,
        pendingScore,
        phase: 'glow',
        timer: 0,
        glowDuration: (300 + n * 50) * speedMul,
        explodeDuration: (200 + n * 50) * speedMul,
        dropDuration: (150 + n * 30) * speedMul,
        particles: [],
        blockColors,
        shakeIntensity: n * 1.5,
        shakeTimer: 0,
        exploded: false,
        shifted: false
      }
      return true
    }

    updateClearingAnim (dt) {
      const anim = this.clearingAnim
      anim.timer += dt

      if (anim.phase === 'glow') {
        if (anim.timer >= anim.glowDuration) {
          anim.phase = 'explode'
          anim.timer = 0
        }
        return
      }

      if (anim.phase === 'explode') {
        if (!anim.exploded) {
          const sorted = [...anim.rows].sort((a, b) => b - a)
          for (const row of sorted) {
            this.board.splice(row, 1)
          }
          for (let i = 0; i < anim.n; i++) {
            this.board.unshift(Array(COLS).fill(0))
          }
          for (let i = 0; i < anim.n * 15; i++) {
            const ci = Math.floor(Math.random() * anim.blockColors.length)
            anim.particles.push({
              x: Math.random() * this.canvas.width,
              y: (anim.rows[0] + Math.random() * anim.n) * CELL_SIZE,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8 - 3,
              life: 1,
              color: anim.blockColors[ci],
              size: 3 + Math.random() * 3
            })
          }
          anim.exploded = true
        }

        for (let i = anim.particles.length - 1; i >= 0; i--) {
          const p = anim.particles[i]
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.25
          p.life -= dt / anim.explodeDuration
          if (p.life <= 0) anim.particles.splice(i, 1)
        }

        if (anim.timer >= anim.explodeDuration) {
          anim.phase = 'drop'
          anim.timer = 0
          anim.shakeTimer = anim.dropDuration
        }
        return
      }

      if (anim.phase === 'drop') {
        anim.shakeTimer = Math.max(0, anim.shakeTimer - dt)
        if (anim.timer >= anim.dropDuration) {
          this.onClearingComplete()
        }
        return
      }
    }

    onClearingComplete () {
      const n = this.clearingAnim.n
      const pendingScore = this.clearingAnim.pendingScore

      this.lines += n
      this.level = Math.floor(this.lines / this.getLinesPerLevel()) + 1
      this.updateUI()
      this.sound.stopBGM()
      this.sound.startBGM(this.level)

      this.clearingAnim = null
      this.showSidePopup(pendingScore)

      if (!this.gameOver) this.spawnPiece()
    }

    showSidePopup (pts) {
      if (this.scorePopupTimer) {
        this.commitPendingScore()
      }
      this.pendingScore = pts
      this.scorePopupEl.textContent = '+' + pts
      this.scorePopupEl.classList.add('visible')
      this.scorePopupTimer = setTimeout(() => {
        this.commitPendingScore()
      }, 2000)
    }

    commitPendingScore () {
      if (this.scorePopupTimer) {
        clearTimeout(this.scorePopupTimer)
        this.scorePopupTimer = null
      }
      this.score += this.pendingScore
      this.pendingScore = 0
      this.scorePopupEl.classList.remove('visible')
      this.scorePopupEl.textContent = ''
      this.updateUI()
      this.saveHighScore()
      this.updateHighScoreDisplay()
    }

    togglePause () {
      this.paused = !this.paused
      if (this.paused) {
        this.overlayMessage.textContent = 'PAUSED'
        this.overlaySub.textContent = 'Press P to resume'
        this.overlay.classList.remove('hidden')
        this.sound.stopBGM()
      } else {
        this.overlay.classList.add('hidden')
        this.sound.startBGM(this.level)
      }
    }

    showGameOver () {
      if (this.pendingScore) this.commitPendingScore()
      this.saveHighScore()
      this.sound.playGameOver()
      this.sound.stopBGM()
      this.overlayMessage.textContent = 'GAME OVER'
      this.overlaySub.textContent = 'Score: ' + this.score + '  Press Enter to restart'
      this.overlay.classList.remove('hidden')
    }

    updateUI () {
      this.scoreDisplay.textContent = this.score
      this.linesDisplay.textContent = this.lines
      this.levelDisplay.textContent = this.level
    }

    gameLoop (time) {
      this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
      if (!this.started || this.gameOver || this.paused) {
        this.draw()
        return
      }
      const delta = time - this.lastTime
      this.lastTime = time

      if (this.clearingAnim) {
        this.updateClearingAnim(delta)
        this.draw()
        return
      }

      this.dropCounter += delta
      const interval = Math.max(80, this.getBaseInterval() - (this.level - 1) * 60)
      if (this.dropCounter >= interval) {
        this.dropCounter = 0
        this.move(0, 1)
      }
      this.draw()
    }

    draw () {
      const { ctx, canvas } = this
      const anim = this.clearingAnim

      ctx.save()

      if (anim && anim.shakeTimer > 0) {
        const intensity = anim.shakeTimer / anim.dropDuration
        const sx = (Math.random() - 0.5) * intensity * 6
        const sy = (Math.random() - 0.5) * intensity * 6
        ctx.translate(sx, sy)
      }

      ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20)

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (this.board[row][col]) {
            ctx.fillStyle = this.board[row][col]
            ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)
          }
        }
      }

      if (anim && anim.phase === 'glow') {
        const pulse = 0.6 + 0.4 * Math.sin(anim.timer * 0.01)
        for (const row of anim.rows) {
          ctx.save()
          ctx.strokeStyle = '#FFD700'
          ctx.lineWidth = 3 * pulse
          ctx.shadowColor = '#FFD700'
          ctx.shadowBlur = 15 * pulse
          ctx.strokeRect(1, row * CELL_SIZE + 1, canvas.width - 3, CELL_SIZE - 2)
          ctx.restore()
        }
      }

      if (anim && anim.particles.length > 0) {
        for (const p of anim.particles) {
          ctx.save()
          ctx.globalAlpha = Math.max(0, p.life)
          ctx.fillStyle = p.color
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
          ctx.restore()
        }
      }

      if (this.current && !this.gameOver && this.started && !this.clearingAnim) {
        const ghostY = this.getGhostY()
        if (ghostY !== this.current.y) {
          ctx.save()
          ctx.globalAlpha = this.ghostFillAlpha
          ctx.fillStyle = this.ghostColor
          this.drawMatrix(ctx, this.current.matrix, this.current.x, ghostY, this.ghostColor)
          ctx.restore()

          ctx.save()
          ctx.strokeStyle = this.ghostColor
          ctx.globalAlpha = this.ghostStrokeAlpha
          ctx.lineWidth = 1.5
          ctx.setLineDash([3, 3])
          this.drawMatrixStroke(ctx, this.current.matrix, this.current.x, ghostY)
          ctx.restore()
        }

        this.drawMatrix(ctx, this.current.matrix, this.current.x, this.current.y, this.current.color)
      }

      ctx.strokeStyle = this.gridColor
      ctx.lineWidth = 0.5
      for (let row = 0; row <= ROWS; row++) {
        ctx.beginPath()
        ctx.moveTo(0, row * CELL_SIZE)
        ctx.lineTo(canvas.width, row * CELL_SIZE)
        ctx.stroke()
      }
      for (let col = 0; col <= COLS; col++) {
        ctx.beginPath()
        ctx.moveTo(col * CELL_SIZE, 0)
        ctx.lineTo(col * CELL_SIZE, canvas.height)
        ctx.stroke()
      }

      ctx.restore()
    }

    drawMatrix (ctx, matrix, offsetX, offsetY, color) {
      ctx.fillStyle = color
      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
          if (matrix[y][x]) {
            ctx.fillRect(
              (offsetX + x) * CELL_SIZE,
              (offsetY + y) * CELL_SIZE,
              CELL_SIZE - 1,
              CELL_SIZE - 1
            )
          }
        }
      }
    }

    drawMatrixStroke (ctx, matrix, offsetX, offsetY) {
      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
          if (matrix[y][x]) {
            ctx.strokeRect(
              (offsetX + x) * CELL_SIZE + 0.5,
              (offsetY + y) * CELL_SIZE + 0.5,
              CELL_SIZE - 2,
              CELL_SIZE - 2
            )
          }
        }
      }
    }

    renderNext () {
      const { nextCtx, nextCanvas } = this
      nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height)
      if (!this.next) return
      const matrix = this.next.matrix
      const rows = matrix.length
      const cols = matrix[0].length
      const offsetX = (4 - cols) / 2
      const offsetY = (4 - rows) / 2
      nextCtx.fillStyle = this.next.color
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (matrix[y][x]) {
            nextCtx.fillRect(
              (offsetX + x) * CELL_SIZE,
              (offsetY + y) * CELL_SIZE,
              CELL_SIZE - 1,
              CELL_SIZE - 1
            )
          }
        }
      }
    }
  }

  const game = new TetrisGame()
})()
