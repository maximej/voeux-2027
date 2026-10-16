# PAXEL

From chaos to order. The chaotic pixel-art image (`assets/chaos.webp`) is cut into a grid of 100 × 100 pixels over the image of order (`assets/ordre.webp`):

- **tap a pixel**: it floats away like a feather, softly glowing, and takes about ten pixels around it along;
- **each tap takes more**: the cluster grows by a constant factor, chosen so that the 10th tap takes everything left;
- **from the 5th tap**, the image trembles, more with every tap; on a phone, **shaking it** sifts the pixels like sand through a sieve: they shrink into grains and fall;
- **the 10th tap** sends every pixel left floating away, from the tapped one outwards, so the image of order is always fully revealed after 10 taps;
- once every pixel is gone, the image of order glows, its brightness slowly oscillating, and the greeting appears ("Bonne année 2027 !", or the text given with `?msg=…` in the URL), with a "Recommencer" button.

The previous version (scratch card revealing the PAIX image) is kept, playable, in [`../paxel-v1/`](../paxel-v1/).

No persistence, no external resources (system font, everything else in this folder). Android phones vibrate lightly on each tap and shake. iPhone: the motion sensors are asked for at the first tap (HTTPS only). Keyboard: Enter or Space on the image taps a random pixel.

## Run

ES modules need a local web server (opening `index.html` directly does not work):

```sh
python3 -m http.server 8000      # from the repository root, then http://localhost:8000/paxel/
```

All tunable values (images, grid, taps and cluster growth, lift animation, tremble, sifting, shake thresholds, greeting, vibration) are in [src/config.js](src/config.js).

## Layout

```
index.html
src/
  config.js                 central configuration
  main.js                   wiring: taps, shakes, restart
  sieve/Sieve.js            the grid of pixels: clusters, lift and sand animations, tremble
  input/ShakeSensor.js      phone shakes (same as the snow globe)
  ui/Interface.js           hint, progress (10 empty squares, one filled per tap), greeting, restart
  image/ImageLoader.js      loads and decodes an image
  styles/main.css
assets/chaos.webp           the top image, 1200 × 1200
assets/ordre.webp           the image underneath, 1200 × 1200
```

Image conversion (Pillow), from the reference folder (not committed):

```sh
python3 -c "from PIL import Image; Image.open('IMG/ref/Paxel2/cahos.jpg').convert('RGB').resize((1200, 1200), Image.LANCZOS).save('paxel/assets/chaos.webp', quality=86, method=6)"
python3 -c "from PIL import Image; Image.open('IMG/ref/Paxel2/ordre.jpg').convert('RGB').resize((1200, 1200), Image.LANCZOS).save('paxel/assets/ordre.webp', quality=86, method=6)"
```
