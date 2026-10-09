/**
 * Minimal interface around the board: hint, greeting, PAIX cells left, level, lines, score,
 * replay button.
 */

const HINTS = {
  ready: 'Touchez ou appuyez sur une touche pour jouer',
  playing: 'Glissez pour déplacer · touchez pour tourner',
  paused: 'Pause',
  lost: 'Perdu !',
};

export class Interface {
  constructor(message, total) {
    this.body = document.body;
    this.hint = document.querySelector('#hint');
    this.message = document.querySelector('#message');
    this.message.textContent = message;
    this.left = document.querySelector('#left');
    this.stats = document.querySelector('#stats');
    this.replay = document.querySelector('#replay');
    this.total = total;
    this.hintTimer = 0;
  }

  update(game) {
    const left = game.board.levelCells;
    this.left.textContent = left ? `PAIX : ${left} / ${this.total}` : 'PAIX dégagé';
    this.stats.textContent = `Niveau ${game.levelNumber} · ${game.lines} ligne${game.lines > 1 ? 's' : ''} · ${game.score}`;
  }

  /** `state`: ready, playing, paused or lost. */
  show(state) {
    clearTimeout(this.hintTimer);
    this.body.dataset.state = state;
    this.hint.hidden = false;
    this.hint.textContent = HINTS[state];
    this.hint.classList.remove('is-hidden');
    this.message.hidden = true;
    this.replay.hidden = state !== 'lost';
    // The controls hint fades once the player has seen it
    if (state === 'playing') this.hintTimer = setTimeout(() => this.hint.classList.add('is-hidden'), 4000);
  }

  won() {
    clearTimeout(this.hintTimer);
    this.body.dataset.state = 'won';
    this.hint.hidden = true;
    this.message.hidden = false;
    this.replay.hidden = false;
  }
}
