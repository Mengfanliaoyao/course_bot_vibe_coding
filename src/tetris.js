;(function () {
  const COLS = 10
  const ROWS = 20
  const CELL_SIZE = 30

  const SHAPES = {
    I: { matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00f0f0' },
    J: { matrix: [[1,0,0],[1,1,1],[0,0,0]], color: '#0000f0' },
    L: { matrix: [[0,0,1],[1,1,1],[0,0,0]], color: '#f0a000' },
    O: { matrix: [[1,1],[1,1]], color: '#f0f000' },
    S: { matrix: [[0,1,1],[1,1,0],[0,0,0]], color: '#00f000' },
    T: { matrix: [[0,1,0],[1,1,1],[0,0,0]], color: '#a000f0' },
    Z: { matrix: [[1,1,0],[0,1,1],[0,0,0]], color: '#f00000' }
  }
  const PIECE_KEYS = Object.keys(SHAPES)

  const SCORE_TABLE = [0, 40, 100, 300, 1200]
  const LINES_PER_LEVEL = 10
  const BASE_INTERVAL = 800

  class TetrisGame {
    constructor () {
      this.canvas = document.getElementById('gameCanvas')
      this.ctx = this.canvas.getContext('2d')
      this.nextCanvas = document.getElementById('nextCanvas')
      this.nextCtx = this.nextCanvas.getContext('2d')

      this.scoreDisplay = document.getElementById('scoreDisplay')
      this.linesDisplay = document.getElementById('linesDisplay')
      this.levelDisplay = document.getElementById('levelDisplay')
      this.overlay = document.getElementById('overlay')
      this.overlayMessage = document.getElementById('overlayMessage')
      this.overlaySub = document.getElementById('overlaySub')

      this.canvas.width = COLS * CELL_SIZE
      this.canvas.height = ROWS * CELL_SIZE
      this.nextCanvas.width = 4 * CELL_SIZE
      this.nextCanvas.height = 4 * CELL_SIZE

      this.board = []
      this.score = 0
      this.lines = 0
      this.level = 1
      this.current = null
      this.next = null
      this.gameOver = false
      this.paused = false
      this.started = false
      this.dropTimer = null
      this.rafId = null
      this.lastTime = 0
      this.dropCounter = 0

      this.touchStartX = 0
      this.touchStartY = 0

      this.bindEvents()
    }

    bindEvents () {
      document.addEventListener('keydown', (e) => this.handleKeyDown(e))
      this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true })
      this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true })
      this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true })
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
      if (e.key === 'p' || e.key === 'P') {
        this.togglePause()
        e.preventDefault()
        return
      }
      if (this.paused) return

      switch (e.key) {
        case 'ArrowLeft': this.move(-1, 0); break
        case 'ArrowRight': this.move(1, 0); break
        case 'ArrowDown': this.move(0, 1); break
        case 'ArrowUp': this.rotate(); break
        case ' ': this.hardDrop(); break
        default: return
      }
      e.preventDefault()
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
      if (this.paused) return

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
      this.next = this.randomPiece()
      this.spawnPiece()
      this.updateUI()
      this.overlay.classList.add('hidden')
      if (this.rafId) cancelAnimationFrame(this.rafId)
      this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
    }

    randomPiece () {
      const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]
      const shape = SHAPES[key]
      return {
        matrix: shape.matrix.map(row => [...row]),
        color: shape.color,
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
      this.clearLines()
      if (!this.gameOver) this.spawnPiece()
    }

    clearLines () {
      let cleared = 0
      for (let row = ROWS - 1; row >= 0; row--) {
        if (this.board[row].every(cell => cell !== 0)) {
          this.board.splice(row, 1)
          this.board.unshift(Array(COLS).fill(0))
          cleared++
          row++
        }
      }
      if (cleared > 0) {
        this.lines += cleared
        this.score += (SCORE_TABLE[cleared] || 0) * this.level
        this.level = Math.floor(this.lines / LINES_PER_LEVEL) + 1
        this.updateUI()
      }
    }

    togglePause () {
      this.paused = !this.paused
      if (this.paused) {
        this.overlayMessage.textContent = 'PAUSED'
        this.overlaySub.textContent = 'Press P to resume'
        this.overlay.classList.remove('hidden')
      } else {
        this.overlay.classList.add('hidden')
      }
    }

    showGameOver () {
      this.overlayMessage.textContent = 'GAME OVER'
      this.overlaySub.textContent = `Score: ${this.score}  Press Enter to restart`
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
      this.dropCounter += delta
      const interval = Math.max(100, BASE_INTERVAL - (this.level - 1) * 60)
      if (this.dropCounter >= interval) {
        this.dropCounter = 0
        this.move(0, 1)
      }
      this.draw()
    }

    draw () {
      const { ctx, canvas } = this
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (this.board[row][col]) {
            ctx.fillStyle = this.board[row][col]
            ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)
          }
        }
      }

      if (this.current && !this.gameOver && this.started) {
        const ghostY = this.getGhostY()
        if (ghostY !== this.current.y) {
          ctx.globalAlpha = 0.2
          this.drawMatrix(ctx, this.current.matrix, this.current.x, ghostY, this.current.color)
          ctx.globalAlpha = 1
        }

        this.drawMatrix(ctx, this.current.matrix, this.current.x, this.current.y, this.current.color)
      }

      ctx.strokeStyle = '#222'
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
  game.draw()
})()
