# PAIX en blocs

Troisième jeu des vœux 2027 : un jeu de blocs aux règles de la version NES, avec un niveau unique.
Le plateau (15 × 20) part avec le mot PAIX en bas ; on le dégage en complétant des lignes. Quand
plus aucune case de PAIX ne reste, le message de vœux apparaît (« Bonne année 2027 ! », ou le texte
donné par `?msg=…` dans l'adresse).

Moteur écrit pour ce projet, sans dépendance ni compilation. Il reprend les règles NES (comme
[TetrisTrainer](https://gregorycannon.github.io/TetrisTrainer/), dont le code n'a pas de licence et
n'est donc pas réutilisé) :

- 7 pièces, rotation NES (pas de « wall kick »), apparition au centre ;
- gravité NES par niveau (niveau de départ : 3), un niveau tous les 10 lignes ;
- clavier : répétition NES (16 images, puis toutes les 6), chute rapide 1 ligne / 2 images,
  à relâcher entre deux pièces ;
- verrouillage dès que la pièce ne peut plus descendre, délai d'apparition, animation des lignes ;
- score 40 / 100 / 300 / 1200 × (niveau + 1) ; tirage aléatoire NES (répétitions plus rares).

## Commandes

- Téléphone : glisser pour déplacer (une colonne par case glissée), glisser vers le bas pour
  descendre, toucher pour tourner.
- Clavier : ← → déplacer, ↓ descendre, ↑ ou X tourner, Z tourner dans l'autre sens, P pause.
- Le premier geste ou la première touche lance la partie.

## Niveau

[`levels/paix.json`](levels/paix.json), relevé dans `paxel/drawings/PAIX TETRIS.png` : 15 × 5 cases,
36 colorées (P bleu, A jaune, I rouge, X vert). `.` = case vide ; chaque lettre renvoie à sa couleur
dans `colors`. Le niveau est centré en bas du plateau, qui prend sa largeur.

## Fichiers

```
index.html
levels/paix.json            le niveau
src/
  config.js                 valeurs à régler (vitesses, niveau de départ, couleurs, message, vibrations)
  main.js                   boucle à la cadence NES (60,0988 images/s), branchements
  game/Pieces.js            pièces, rotation NES, tirage aléatoire
  game/Board.js             plateau, collisions, lignes
  game/Game.js              règles, image par image
  render/Renderer.js        dessin (cases néon pré-rendues)
  input/Input.js            clavier et gestes
  ui/Interface.js           indications, compteurs, message, Rejouer
  styles/main.css
assets/favicon.svg
```

« Tetris » est une marque déposée : le jeu s'appelle « PAIX en blocs » à l'écran.
