# PAXEL

Digital scratch card: scratch the covering layer with a finger or the mouse to discover the image underneath. The surface is a grid of cells that flip over one by one as the brush passes. See [ROADMAPv2.md](ROADMAPv2.md).

Current stage: **V8** (see the roadmap):

- scratching cell by cell, each cell flipping over like a card;
- revealed share and completion: at 90 %, the remaining cells flip by themselves in a wave, then the image shines once;
- minimal poster interface: hint, colored corner brackets, pixel progress bar, loading indicator;
- tiled surface with an invitation glint before the first scratch, irregular brush ring for the mouse;
- the image is a WebP (372 KB instead of 2 MB for the PNG), preloaded.

Decided: no persistence (every visit starts from an untouched image) and no image secrecy (the browser loads the whole image; the scratch card is a visual experience, not a protection).

The font (Big Shoulders Display) comes from Google Fonts, as on the greeting card.

## Run

ES modules need a local web server (opening `index.html` directly does not work):

```sh
cd paxel
python3 -m http.server 8000      # http://localhost:8000/
```

From a phone on the same Wi-Fi: `http://<computer IP>:8000/`.

All tunable values (image, tile colors, grid density, brush size, stroke interpolation, flip animation, invitation glint, completion threshold and wave, progress blocks) are in [src/config.js](src/config.js).

## Layout

```
index.html
src/
  config.js                 central configuration
  main.js                   wiring
  scratch/ScratchEngine.js  surface and effects canvases, strokes, resize
  scratch/ScratchMask.js    scratched state: grid of cells, independent of the screen
  scratch/ScratchBrush.js   circular brush: which cells a stamp removes
  scratch/RevealAnimation.js  cell flip animation
  scratch/ScratchProgress.js  revealed share, completion threshold
  input/PointerInput.js     mouse / touch / stylus as one input
  ui/Interface.js           hint, pixel progress bar, brush ring, completion states
  image/ImageLoader.js      loads and decodes the hidden image
  styles/main.css
assets/paix.webp            the published image
drawings/                   source images (not committed)
```

Image conversion (Pillow): `python3 -c "from PIL import Image; Image.open('drawings/Paix2.png').convert('RGB').save('assets/paix.webp', quality=90, method=6)"`
