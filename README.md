# Vœux 2027

Petits jeux web et mobile pour les vœux 2027, sans dépendance ni étape de compilation.
Charte commune : néon blanc à halo orange, fond presque noir, police du système.

| Dossier | Jeu | En ligne |
|---|---|---|
| [`points/`](points/) | « Relie les points » : relier des points numérotés pour révéler un dessin | https://maximej.github.io/voeux-2027/points/ |
| [`paxel/`](paxel/) | PAXEL : gratter une image, révélée case par case | https://maximej.github.io/voeux-2027/paxel/ |
| [`tetris/`](tetris/) | PAIX en blocs : jeu de blocs aux règles NES, dégager le mot PAIX en complétant des lignes | https://maximej.github.io/voeux-2027/tetris/ |

La racine (`index.html`) renvoie vers les jeux. Les anciens liens vers la carte avec paramètres (`?d=`, `?msg=`, `?n=`) sont redirigés vers `points/`.

## Lancer en local

```sh
python3 -m http.server 8000   # depuis la racine, puis http://localhost:8000/
```

## Mise en ligne

GitHub Pages publie la branche `main` (racine du dépôt) : https://maximej.github.io/voeux-2027/
`git push` suffit ; la mise à jour prend une à deux minutes (cache de 10 minutes).

Non publiés (`.gitignore`) : `IMG/` (visuels de référence) et `paxel/drawings/` (images source).
