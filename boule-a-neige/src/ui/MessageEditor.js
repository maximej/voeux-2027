/**
 * Editing the message on the base: a click (or Enter) on the plaque puts a text field over it,
 * with the current text selected. Enter or a click elsewhere keeps the new text, Escape cancels.
 * An empty text goes back to the default one. `onChange(text)` receives the kept text.
 */

export class MessageEditor {
  constructor(stage, plaque, { maxLength }, onChange) {
    this.stage = stage;
    this.plaque = plaque;
    this.onChange = onChange;
    this.input = document.createElement('input');
    Object.assign(this.input, { type: 'text', className: 'message-input', maxLength, enterKeyHint: 'done', autocomplete: 'off', spellcheck: false });
    this.input.setAttribute('aria-label', 'Message du socle');
    this.input.hidden = true;
    stage.append(this.input);

    plaque.addEventListener('click', () => this.open());
    plaque.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.open();
      }
    });
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.close(true);
      else if (e.key === 'Escape') this.close(false);
      e.stopPropagation(); // arrow keys edit the text instead of turning the globe
    });
    this.input.addEventListener('blur', () => this.close(true));
  }

  open(text = this.text) {
    if (!this.input.hidden) return;
    // The field covers the plaque exactly, whatever the size of the globe on screen
    const box = this.plaque.querySelector('rect').getBoundingClientRect();
    const stage = this.stage.getBoundingClientRect();
    Object.assign(this.input.style, {
      left: `${box.left - stage.left}px`,
      top: `${box.top - stage.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
      fontSize: `${box.height * 0.42}px`,
    });
    this.input.value = text;
    this.input.hidden = false;
    this.plaque.classList.add('is-editing');
    this.input.focus();
    this.input.select();
  }

  close(keep) {
    if (this.input.hidden) return;
    this.input.hidden = true;
    this.plaque.classList.remove('is-editing');
    if (keep) this.onChange(this.input.value.trim());
    this.plaque.focus();
  }
}
