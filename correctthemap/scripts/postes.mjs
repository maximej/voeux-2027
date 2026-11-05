// Convertit dataSource/POSTES_MEAE_2026-10.csv en un JSON public minimal : nom de la ville,
// pays, coordonnées et type de poste. Les autres colonnes du fichier source ne sont pas publiées.
import { readFile } from "node:fs/promises";

export const POSTES_SOURCE = "dataSource/POSTES_MEAE_2026-10.csv";

/** Découpe une ligne CSV séparée par des points-virgules, avec champs éventuellement entre guillemets. */
function splitLine(line) {
  const cells = [];
  let cell = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ";") { cells.push(cell); cell = ""; }
    else cell += char;
  }
  cells.push(cell);
  return cells;
}

export function parsePostes(text) {
  const [header, ...lines] = text.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean).map(splitLine);
  const column = name => header.indexOf(name);
  const get = (cells, name) => (cells[column(name)] ?? "").trim();
  const postes = [];
  for (const cells of lines) {
    // Ambassades ouvertes (postes de présence diplomatique compris) et consulats généraux ;
    // les ambassades fermées, représentations permanentes et bureaux ne sont pas affichés.
    const embassy = get(cells, "AMBASSADE") === "1" && get(cells, "TYPE_DIPL") !== "Ambassade fermée";
    const consulate = get(cells, "CONS_GAL") === "1";
    if (!embassy && !consulate) continue;
    const lat = Number(get(cells, "LATITUDE")), lon = Number(get(cells, "LONGITUDE"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    postes.push({
      name: get(cells, "NOM"),
      country: get(cells, "NOM_ETAT"),
      type: embassy && consulate ? "ambassade+consulat" : embassy ? "ambassade" : "consulat",
      coordinates: [Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4]
    });
  }
  return postes;
}

export async function readPostes(root) {
  return parsePostes(await readFile(new URL(POSTES_SOURCE, root), "utf8"));
}
