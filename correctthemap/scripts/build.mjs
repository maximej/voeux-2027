import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readPostes } from "./postes.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const out = resolve(root, "dist");
const pages = resolve(root, "docs");
await rm(out, { recursive: true, force: true });
await rm(pages, { recursive: true, force: true });
await mkdir(resolve(out, "assets"), { recursive: true });
await build({
  entryPoints: [resolve(root, "src/app.js")],
  outfile: resolve(out, "map.js"),
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2020"
});
await Promise.all([
  cp(resolve(root, "src/index.html"), resolve(out, "index.html")),
  cp(resolve(root, "src/styles.css"), resolve(out, "map.css")),
  cp(resolve(root, "assets/world-lowres.json"), resolve(out, "assets/world-lowres.json")),
  // Seul ce JSON minimal (ville, pays, coordonnées, type) est publié, jamais dataSource/
  readPostes(pathToFileURL(root + "/")).then(postes =>
    writeFile(resolve(out, "assets/postes.json"), JSON.stringify(postes)))
]);
await cp(out, pages, { recursive: true });
