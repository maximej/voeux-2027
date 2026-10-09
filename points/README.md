# Relie les points — Carte de vœux 2027

Jeu « relier les points » web et mobile, généré à partir de dessins SVG, sans dépendance.

## Lancer

Les modules JS et `fetch` exigent un serveur (l'ouverture directe du fichier ne fonctionne pas) :

```sh
cd points
python3 -m http.server 8000
# puis http://localhost:8000 (version complète : /complet.html)
```

N'importe quel hébergement statique convient (GitHub Pages, Netlify, serveur interne…).

## Deux versions

- `index.html` (page d'accueil) : le jeu seul, sans boutons, sur des néons orange et blancs qui se tracent au hasard en arrière-plan (charte commune avec PAXEL : néon blanc à halo orange, fond presque noir, police du système) (`neon-bg.js`, `simple.js`, `simple.css`). Le dessin se choisit par l'URL : `?d=coeur`.
- `complet.html` : version complète (galerie, niveaux, boutons, import de SVG ; `app.js`, `style.css`). Elle garde encore l'ancienne palette cyan et magenta et la police Big Shoulders Display (Google Fonts), comme les dessins `coeur`, `etoile` et `sapin`.

Les deux partagent le moteur (`dotdot.js`) et les styles du plateau (`dotdot.css`).

## Ajouter un dessin

1. Déposer le fichier `.svg` dans `drawings/`.
2. L'ajouter à `drawings/index.json` : `{ "file": "mon-dessin.svg", "title": "Titre", "message": "Message final" }`.
   Option `"portrait": "mon-dessin-portrait.svg"` : variante chargée par la page d'accueil sur écran en hauteur (téléphone), utile pour les dessins très larges comme `2027.svg`.

On peut aussi importer un SVG depuis l'interface (bouton ou glisser-déposer).

## Préparer le SVG

Les points sont générés le long des tracés (`path`, `polygon`, `polyline`, `rect`, `circle`, `ellipse`, `line`). Les angles sont toujours conservés. Chaque sous-tracé devient une série de points reliés entre eux.

| Attribut | Effet |
|---|---|
| *(aucun)* | tous les tracés deviennent des points |
| `data-dots="auto"` | seuls les éléments ou groupes marqués deviennent des points ; le reste est du décor révélé à la fin |
| `data-dots="0"` | élément décoratif, sans points |
| `data-dots="12"` | force 12 points sur cet élément |
| `data-order="2"` | ordre de tracé (par défaut : ordre du document) |
| `data-title`, `data-message` sur `<svg>` | titre et message de fin (si absents de `index.json`) |

Conseils :
- Le texte doit être converti en tracés (Illustrator : *Vectoriser* ; Inkscape : *Objet en chemin*).
- Préférer un contour simple et fermé : les détails fins produisent des points trop serrés.
- Deux contours qui se touchent donnent des points superposés : mieux vaut les fusionner en un seul tracé (voir `drawings/sapin.svg`).

## Paramètres d'URL

- `?d=sapin` : dessin affiché au démarrage
- `?n=30` : nombre de points visé
- `?msg=Bonne%20année%20!` : remplace le message final (pratique pour personnaliser une carte envoyée)

## Utiliser le moteur seul

```js
import { DotToDot } from './dotdot.js';

const game = new DotToDot(document.querySelector('#board'), {
  dots: 50,
  lineColors: ['#1de3ff', '#ff2fbc', '#f4f749'], // dégradé des traits du 1er au dernier point (hex #rrggbb)
  glow: 3,                                       // halo lumineux en px (0 = aucun)
  touchHitRadius: 40,                            // tolérance au doigt en px (souris : hitRadius, 24)
  onConnect: (index, auto) => navigator.vibrate?.(20), // à chaque point relié
  onMiss: () => {},                              // mauvais point touché
  onProgress: (n, total) => {},
  onComplete: () => {},
});
game.load(svgText); // renvoie { title, message }
game.undo(); game.reset(); game.solve();
```

Pour l'effet néon des dessins, voir `drawings/2027.svg` : trait coloré avec filtre de flou, et cœur blanc dessiné par `<use>` (ignoré par le jeu, donc sans points en double).

Les styles du plateau (classes `.dtd-*`) et les couleurs (`--dtd-dot`, `--dtd-line`, `--dtd-label`, `--dtd-accent`) se trouvent dans `dotdot.css`.

## Mise en ligne (GitHub Pages)

Le site est publié depuis la branche `main` ; ce jeu se trouve dans `points/` : https://maximej.github.io/voeux-2027/points/

Pour mettre à jour : `git add -A && git commit -m "…" && git push`. GitHub republie en une à deux minutes.
Le dossier `IMG/` (visuels de référence) est exclu du dépôt par `.gitignore`. Les anciens liens vers la racine avec paramètres (`?d=`, `?msg=`, `?n=`) sont redirigés ici par la page d'accueil du dépôt.
