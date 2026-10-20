# PAIX en blocs

Troisième jeu des vœux 2027 : un jeu de blocs aux règles de la version NES, avec un niveau unique.
Le mot PAIX est écrit en bas du plateau (15 × 20), en semi-transparence : il faut le construire
avec les morceaux découpés dans le dessin, qui tombent dans leur couleur. Quand chaque case de PAIX
est recouverte, quelle que soit la couleur des blocs, le message de vœux apparaît (« Bonne année 2027 ! », ou le texte donné par `?msg=…`
dans l'adresse).

- **Les pièces** : les 22 morceaux du mot, dans un ordre aléatoire où un morceau n'arrive jamais
  avant ceux sur lesquels il repose, avec une pièce grise (une des 7 pièces classiques, qui ne sert
  pas au mot) toutes les 3 : 29 pièces, qui suffisent à finir le niveau.
- **Les erreurs** : une ligne pleine disparaît, comme d'habitude, ce qui permet d'enlever une pièce
  mal placée. Après ces pièces, les morceaux qui ne sont pas encore à leur place reviennent,
  toujours avec une pièce grise toutes les 3, jusqu'à ce que le mot soit construit ou que le
  plateau déborde.

Moteur écrit pour ce projet, sans dépendance ni compilation. Il reprend les règles NES (comme
[TetrisTrainer](https://gregorycannon.github.io/TetrisTrainer/), dont le code n'a pas de licence et
n'est donc pas réutilisé) :

- 7 pièces grises, rotation NES (pas de « wall kick »), apparition au centre ;
- gravité NES par niveau (niveau de départ : 3), un niveau tous les 10 lignes ;
- clavier : répétition NES (16 images, puis toutes les 6), chute rapide 1 ligne / 2 images,
  à relâcher entre deux pièces ;
- verrouillage dès que la pièce ne peut plus descendre, délai d'apparition, animation des lignes ;
- score 40 / 100 / 300 / 1200 × (niveau + 1), compté mais pas affiché ; tirage aléatoire NES (répétitions plus rares).

## Commandes

- Téléphone : glisser pour déplacer (une colonne par case glissée), glisser vers le bas pour
  descendre, toucher pour tourner.
- Clavier : ← → déplacer, ↓ descendre, ↑ ou X tourner, Z tourner dans l'autre sens, P pause.
- Le premier geste ou la première touche lance la partie.

## Niveau

[`levels/paix.json`](levels/paix.json), relevé dans `paxel/drawings/PAIX TETRIS.png` : 15 × 5 cases,
36 colorées (P bleu, A jaune, I rouge, X vert), en bas du plateau, qui prend sa largeur.

- `rows` : le mot ; `.` = case vide, chaque lettre renvoie à sa couleur dans `colors`.
- `parts` : le découpage, une lettre par morceau (P : a à e, A : f à k, I : l m, X : n à v).
  P, A et I sont coupés en barres droites de 2 ou 3 carrés (un carré seul dans le P : sa panse
  ne peut pas se couper autrement en morceaux qui tiennent). Le X est coupé en barres de 2 qui
  mêlent vert et gris : une case de `parts` sur un `.` de `rows` est grise, ne compte pas pour le
  mot, et sert d'appui aux morceaux suivants. Chaque morceau doit reposer sur le sol ou sur un
  morceau placé en dessous de lui.

## Fichiers

```
index.html
levels/paix.json            le niveau
src/
  config.js                 valeurs à régler (vitesses, niveau de départ, couleurs, message, vibrations)
  main.js                   boucle à la cadence NES (60,0988 images/s), branchements
  game/Pieces.js            pièces grises (rotation NES), morceaux du mot, ordre, tirage aléatoire
  game/Board.js             plateau, collisions, lignes
  game/Game.js              règles, image par image
  render/Renderer.js        dessin (cases néon pré-rendues)
  input/Input.js            clavier et gestes
  ui/Interface.js           indications, message, Rejouer
  styles/main.css
assets/favicon.svg
```

« Tetris » est une marque déposée : le jeu s'appelle « PAIX en blocs » à l'écran.
