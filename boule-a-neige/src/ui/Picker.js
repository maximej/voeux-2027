/**
 * Building picker for one place: the 10 buildings, the current one marked, those already in
 * another place show its number (choosing one swaps the two places).
 * A native <dialog>: Escape and a tap outside close it.
 */

export class Picker {
  constructor(dialog, buildings, onChoose) {
    this.dialog = dialog;
    this.buildings = buildings;
    this.onChoose = onChoose;
    this.title = dialog.querySelector('.picker-title');
    this.list = dialog.querySelector('.picker-list');
    dialog.addEventListener('click', e => e.target === dialog && dialog.close()); // tap on the backdrop
    dialog.querySelector('.picker-close').addEventListener('click', () => dialog.close());
  }

  open(place, combination) {
    this.title.textContent = `Emplacement ${place + 1}`;
    this.list.replaceChildren(
      ...this.buildings.map((building, index) => {
        const where = combination.indexOf(index);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'picker-item';
        if (where === place) button.setAttribute('aria-current', 'true');
        // Thumbnail: the building's drawing, from the <symbol> defined in the scene
        button.innerHTML = `<svg class="picker-icon" viewBox="0 0 200 300" aria-hidden="true"><use href="#building-${building.id}"/></svg>
          <span class="picker-text"><span class="picker-name"></span><span class="picker-city"></span></span>`;
        button.querySelector('.picker-name').textContent = building.name;
        button.querySelector('.picker-city').textContent =
          building.city + (where !== -1 && where !== place ? ` · déjà en ${where + 1}` : '');
        button.addEventListener('click', () => {
          this.dialog.close();
          if (where !== place) this.onChoose(place, index);
        });
        return button;
      }),
    );
    this.dialog.showModal();
    this.list.querySelector('[aria-current]')?.focus();
  }
}
