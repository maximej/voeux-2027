/**
 * Game rules, advanced one NES frame at a time by `step()`.
 *
 *   ready     the board is shown, nothing falls until the first input
 *   playing   a piece falls: gravity by level, keyboard auto-repeat (DAS), soft drop
 *   clearing  full rows flash, then disappear
 *   entry     short delay before the next piece
 *   won       every cell of the word (PAIX) is covered, whatever the colors
 *   lost      a new piece cannot appear
 *
 * The pieces: the parts cut from the word, in a random order where a part never comes before the
 * parts it rests on, with a grey piece after every 3 parts. Once
 * they are used, the parts not yet in place come again, still with a grey piece every 3. Full
 * rows disappear, as usual: that is how a misplaced piece gets removed.
 *
 * As on the NES: no wall kicks, no hold, no hard drop; a piece locks as soon as it cannot fall.
 */

import { Board } from './Board.js';
import { buildOrder, cellsOf, GREY, greyPiece, nextKind, rotated, wordParts } from './Pieces.js';

export class Game {
  constructor(config, level, callbacks = {}) {
    this.config = config;
    this.level = level;
    this.on = callbacks;
    this.board = new Board(level.width, config.rows);
    this.parts = wordParts(level);
    this.total = this.parts.reduce((n, part) => n + this.wordCells(part).length, 0);
    this.held = { left: false, right: false, down: false };
    this.actions = []; // one-shot moves: rotations, touch moves
    this.reset();
  }

  reset() {
    this.board.empty();
    this.state = 'ready';
    this.score = 0;
    this.lines = 0;
    this.levelNumber = this.config.startLevel;
    this.piece = null;
    this.queue = [];
    this.lastGrey = null;
    this.next = this.draw();
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

  /** Word cells holding their color (the grey cells of the parts do not count). */
  get placed() {
    return this.parts.reduce((n, part) => n + this.wordCells(part).filter(([cell, color]) => this.board.has(cell, color)).length, 0);
  }

  inPlace(part) {
    return this.wordCells(part).every(([cell, color]) => this.board.has(cell, color));
  }

  wordCells(part) {
    return part.target.map((cell, i) => [cell, part.colors[i]]).filter(([, color]) => color !== GREY);
  }

  /** The next piece of the queue, refilled with the parts not yet in place (see above). */
  draw() {
    if (!this.queue.length) {
      const missing = this.parts.filter(part => !this.inPlace(part));
      buildOrder(missing).forEach((part, i) => {
        this.queue.push(part);
        if (i % 3 === 2) this.queue.push(this.grey());
      });
      if (!this.queue.length) this.queue.push(this.grey());
    }
    return this.queue.shift();
  }

  grey() {
    this.lastGrey = nextKind(this.lastGrey);
    return greyPiece(this.lastGrey);
  }

  spawn() {
    const top = Math.min(...this.next.states[0].map(([, dy]) => dy));
    this.piece = { ...this.next, rot: 0, x: Math.floor(this.board.width / 2), y: -top };
    this.next = this.draw();
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
        if (this.checkWin()) return;
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
    } else if (this.checkWin()) {
      return;
    } else {
      this.state = 'entry';
      this.timer = this.config.entryDelay;
    }
    this.actions = [];
    this.on.change?.(this);
  }

  /** True when every cell of the word holds a block, of any color. */
  get covered() {
    return this.parts.every(part => this.wordCells(part).every(([[x, y]]) => this.board.rows[this.board.height + y][x]));
  }

  checkWin() {
    if (!this.covered) return false;
    this.state = 'won';
    this.piece = null;
    this.actions = [];
    this.on.change?.(this);
    this.on.win?.(this);
    return true;
  }
}
