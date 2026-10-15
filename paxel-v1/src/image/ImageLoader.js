/**
 * Loads and decodes the hidden image before it is shown.
 */

export async function loadImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}
