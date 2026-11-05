import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { planarRaw } from "./src/projection-math.js";

test("le site expose les deux interactions principales", async () => {
  const html = await readFile(new URL("./src/index.html", import.meta.url), "utf8");
  assert.match(html, /id="morph"/);
  assert.match(html, /id="wrap"/);
  assert.match(html, /Eckert IV/);
  assert.match(html, />Mercator</);
  assert.doesNotMatch(html, /aria-hidden="true">M</);
});

test("le rendu ne dessine aucune frontiere interieure", async () => {
  const source = await readFile(new URL("./src/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bmesh\b|\bborders\b/);
  assert.match(source, /startInertia/);
  assert.match(source, /flatOutline = 1 - smoothstep\(0, \.22, wrapT\)/);
  assert.match(source, /shapeT = easeCubicInOut\(smoothstep\(0, \.55, wrapT\)\)/);
  assert.match(source, /poseT = easeCubicInOut\(smoothstep\(0, 1, wrapT\)\)/);
  assert.match(source, /globeReveal = smoothstep\(\.55, \.70, wrapT\)/);
  assert.match(source, /globeOutline = globeReveal/);
  assert.match(source, /drawLayer\(flatContext, currentProjection\(\), 1, flatOutline, flatPaper\)/);
  assert.match(source, /flatPaper = 1 - smoothstep\(\.04, \.3, wrapT\)/);
  assert.match(source, /drawLayer\(globeContext, globeProjection\(\), 1, globeOutline\)/);
  assert.match(source, /geoOrthographic\(\)/);
  assert.doesNotMatch(source, /currentProjection\(true\)/);
  assert.doesNotMatch(source, /context\.clip\(\)/);
  assert.match(source, /planarHeight = 2 \* Math\.PI/);
  assert.doesNotMatch(source, /fillStyle = "#f3efe5"/);
  assert.doesNotMatch(source, /Math\.max\(-75/);
  assert.doesNotMatch(source, /revealT/);
});

test("la transition Mercator-Eckert reste finie et monotone jusqu'aux poles", () => {
  for (const t of [0,.1,.25,.5,.75,.9,1]) {
    const raw=planarRaw(t);
    let previous=-Infinity;
    for (let latitude=-90; latitude<=90; latitude+=1) {
      const point=raw(0,latitude*Math.PI/180);
      assert.ok(point.every(Number.isFinite));
      assert.ok(point[1]>=previous, `repli vertical à t=${t}, latitude=${latitude}`);
      previous=point[1];
    }
  }
});

test("les postes publiés sont des ambassades ouvertes et des consulats, sans données superflues", async () => {
  const { readPostes } = await import("./scripts/postes.mjs");
  const postes = await readPostes(new URL("./", import.meta.url));
  assert.ok(postes.length > 200);
  for (const poste of postes) {
    assert.deepEqual(Object.keys(poste).sort(), ["coordinates", "country", "name", "type"]);
    assert.ok(["ambassade", "consulat", "ambassade+consulat"].includes(poste.type));
    const [lon, lat] = poste.coordinates;
    assert.ok(Math.abs(lon) <= 180 && Math.abs(lat) <= 90, poste.name);
  }
  // Ambassades fermées et représentations permanentes exclues
  const names = postes.map(p => p.name);
  for (const name of ["Kaboul", "Damas", "Sanaa", "Niamey", "Strasbourg"]) assert.ok(!names.includes(name), name);
  assert.ok(names.includes("Washington") || names.includes("Pékin"));
});
