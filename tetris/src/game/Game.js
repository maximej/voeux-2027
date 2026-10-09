/**
 * Game rules, advanced one NES frame at a time by `step()`.
 *
 *   ready     the board is shown, nothing falls until the first input
 *   playing   a piece falls: gravity by level, keyboard auto-repeat (DAS), soft drop
 *   clearing  full rows flash, then disappear
 *   entry     short delay before the next piece
 *   won       every level cell (PAIX) has been cleared
 *   lost      a new piece cannot appear
 *
 * As on the NES: no wall kicks, no hold, no hard drop; a piece locks as soon as it cannot fall.
 */

import { Board } from './Board.js';
import { cellsOf, nextKind, rotated } from './Pieces.js';

export class Game {
  constructor(config, level, callbacks = {}) {
    this.config = config;
    this.level = level;
    this.on = callbacks;
    this.board = new Board(level.width, config.rows);
    this.held = { left: false, right: false, down: false };
    this.actions = []; // one-shot moves: rotations, touch moves
    this.reset();
  }

  reset() {
    this.board.load(this.level.rows);
    this.state = 'ready';
    this.score = 0;
    this.lines = 0;
    this.levelNumber = this.config.startLevel;
    this.piece = null;
    this.next = nextKind(null);
    this.actions = [];
    this.clearing = [];
    this.timer = 0;
    this.on.change?.(this);
  }

  /** First input: the game starts. */
  start() {
    if (this.state !== 'ready') return;
    this.spawn();
  }

  get totalLevelCells() {
    return this.level.rows.join('').replace(/\./g, '').length;
  }

  spawn() {
    this.piece = { kind: this.next, rot: 0, x: Math.floor(this.board.width / 2), y: 0 };
    this.next = nextKind(this.piece.kind);
    this.gravityCount = 0;
    this.softCount = 0;
    this.softBlocked = this.held.down; // down must be pressed again for each piece
    this.das = this.config.das.initial; // a direction held through the spawn moves at once
    if (!this.board.fits(this.piece)) {
      this.state = 'lost';
      this.on.lose?.(this);
    } else this.state = 'playing';
    this.on.change?.(this);
  }

  // --- Input (called by the input layer) -------------------------------------------------

  press(key) {
    if (key === 'left' || key === 'right') {
      this.held[key] = true;
      if (this.state === 'playing') this.shift(key === 'left' ? -1 : 1, true);
    } else if (key === 'down') this.held.down = true;
  }

  release(key) {
    this.held[key] = false;
    if (key === 'down') this.softBlocked = false;
  }

  /** One-shot action: "cw", "ccw", "left", "right", "down" (touch moves one cell at a time). */
  act(action) {
    this.actions.push(action);
  }

  // --- Frame ------------------------------------------------------------------------------

  step() {
    switch (this.state) {
      case 'playing':
        return this.play();
      case 'clearing':
        if (--this.timer > 0) return;
        this.board.clear(this.clearing);
        this.clearing = [];
        if (this.board.levelCells === 0) {
          this.state = 'won';
          this.piece = null;
          this.on.change?.(this);
          return this.on.win?.(this);
        }
        this.state = 'entry';
        this.timer = this.config.entryDelay;
        return this.on.change?.(this);
      case 'entry':
        if (--this.timer <= 0) this.spawn();
        return;
    }
  }

  play() {
    for (const action of this.actions.splice(0)) {
      if (action === 'cw' || action === 'ccw') this.rotate(action === 'cw' ? 1 : -1);
      else if (action === 'left' || action === 'right') this.shift(action === 'left' ? -1 : 1, false);
      else if (action === 'down' && this.drop()) return;
    }

    // Keyboard auto-repeat (NES): move at once, then after 16 frames, then every 6
    const { left, right } = this.held;
    if (left !== right) {
      this.das++;
      if (this.das >= this.config.das.initial) this.shift(left ? -1 : 1, true, true);
    }

    // Soft drop replaces gravity while down is held alone
    if (this.held.down && !this.softBlocked && left === right) {
      if (++this.softCount >= this.config.softDrop) {
        this.softCount = 0;
        this.drop();
      }
      return;
    }

    const g = this.config.gravity[Math.min(this.levelNumber, this.config.gravity.length - 1)];
    if (++this.gravityCount >= g) this.drop();
  }

  /** Horizontal move; `auto`: from the keyboard repeat. A blocked move keeps the repeat charged. */
  shift(dx, keyboard, auto = false) {
    if (this.state !== 'playing') return;
    const moved = { ...this.piece, x: this.piece.x + dx };
    if (this.board.fits(moved)) {
      this.piece = moved;
      if (keyboard) this.das = auto ? this.config.das.initial - this.config.das.repeat : 0;
    } else if (keyboard) this.das = this.config.das.initial;
  }

  rotate(direction) {
    const turned = rotated(this.piece, direction);
    if (this.board.fits(turned)) this.piece = turned;
  }

  /** One cell down, or lock. Returns true if the piece locked. */
  drop() {
    this.gravityCount = 0;
    const lower = { ...this.piece, y: this.piece.y + 1 };
    if (this.board.fits(lower)) {
      this.piece = lower;
      return false;
    }
    this.lock();
    return true;
  }

  lock() {
    this.board.lock(this.piece);
    this.lastLocked = cellsOf(this.piece);
    this.piece = null;
    const full = this.board.fullRows();
    if (full.length) {
      this.score += this.config.scores[full.length] * (this.levelNumber + 1);
      this.lines += full.length;
      this.levelNumber = Math.max(this.levelNumber, this.config.startLevel + Math.floor(this.lines / this.config.linesPerLevel));
      this.clearing = full;
      this.state = 'clearing';
      this.timer = this.config.clearFrames;
      this.on.clear?.(full.length, this);
    } else {
      this.state = 'entry';
      this.timer = this.config.entryDelay;
    }
    this.actions = [];
    this.on.change?.(this);
  }
}
