/**
 * Minimal interface around the image: hint, progress (10 empty squares, one filled per tap), greeting message,
 * restart button.
 */

const HINTS = {
  start: 'Touchez un pixel',
  more: 'Encore',
  shake: 'Secouez le téléphone, ou touchez encore',
  failed: 'Image indisponible',
};

export class Interface {
  constructor({ blocks }, message) {
    this.body = document.body;
    this.stage = document.querySelector('#stage');
    this.hint = document.querySelector('#hint');
    this.bar = document.querySelector('#progress');
    this.message = document.querySelector('#message');
    this.message.textContent = message;
    this.restart = document.querySelector('#restart');
    this.blocks = Array.from({ length: blocks }, () => this.bar.appendChild(document.createElement('i')));
    this.hint.textContent = HINTS.start;
  }

  ready() {
    this.body.classList.remove('is-loading');
    this.stage.classList.add('is-ready');
  }

  failed() {
    this.body.classList.remove('is-loading');
    this.hint.textContent = HINTS.failed;
  }

  /** After each tap or shake: blocks for the taps, hint for what comes next. */
  update(sieve, canShake) {
    const lit = Math.max(sieve.taps, Math.floor((1 - sieve.left / sieve.total) * this.blocks.length));
    this.blocks.forEach((block, i) => block.classList.toggle('is-on', i < lit));
    this.bar.setAttribute('aria-valuenow', Math.round((1 - sieve.left / sieve.total) * 100));
    if (sieve.done) this.hint.classList.add('is-hidden');
    else this.hint.textContent = sieve.trembling && canShake ? HINTS.shake : sieve.taps ? HINTS.more : HINTS.start;
    this.body.classList.toggle('is-trembling', sieve.trembling);
  }

  /** Every pixel is gone: the image of order glows, the greeting and the restart button appear. */
  revealed() {
    this.body.classList.add('is-revealed');
    this.hint.hidden = true;
    this.message.hidden = false;
    this.restart.hidden = false;
  }

  reset() {
    this.body.classList.remove('is-revealed', 'is-trembling');
    this.hint.hidden = false;
    this.hint.classList.remove('is-hidden');
    this.hint.textContent = HINTS.start;
    this.message.hidden = true;
    this.restart.hidden = true;
  }
}
