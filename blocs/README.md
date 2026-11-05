# Le monde en blocs

Troisième jeu des vœux 2027 : un jeu de blocs aux règles de la version NES, avec un niveau unique.
Une carte du monde en pixel art est dessinée en bas du plateau (15 × 20), en semi-transparence : il
faut la construire avec les morceaux découpés dans la carte, qui tombent dans la couleur de leur
continent. Quand chaque case de la carte est recouverte, quelle que soit la couleur des blocs, le message de vœux apparaît (« Bonne année 2027 ! », ou le texte donné par `?msg=…`
dans l'adresse).

- **Les pièces** : les 19 morceaux de la carte, dans un ordre aléatoire où un morceau n'arrive jamais
  avant ceux sur lesquels il repose, avec une pièce grise (une des 7 pièces classiques, qui ne sert
  pas à la carte) toutes les 3 : 25 pièces, qui suffisent à finir le niveau.
- **Les erreurs** : une ligne pleine disparaît, comme d'habitude, ce qui permet d'enlever une pièce
  mal placée. Après ces pièces, les morceaux qui ne sont pas encore à leur place reviennent,
  toujours avec une pièce grise toutes les 3, jusqu'à ce que la carte soit construite ou que le
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

[`levels/monde.json`](levels/monde.json), dessiné à la main : 15 × 7 cases, 57 colorées (Amériques
violet, Europe et Asie bleu, Afrique bleu-vert, Océanie rose), en bas du plateau, qui prend sa largeur.

```
·AAAAAAA·EEEEEE    A Amériques (avec le Groenland)
··AAAA··EEEEEEE    E Europe et Asie
··AAA···E·EEEEE    F Afrique
···AA···FFFEEE·    O Océanie
····AA···FFF·E·
·····AA··FF··OO
·····A····F··OO
```

- `rows` : la carte ; `.` = case vide (océan), chaque lettre renvoie à sa couleur dans `colors`.
- `parts` : le découpage, une lettre par morceau (19 morceaux de 2 à 4 cases, d'une seule couleur).
  Chaque morceau doit reposer sur le sol ou sur un morceau placé en dessous de lui ; une partie
  peut déborder au-dessus de l'océan (Alaska, Europe au-dessus de la Méditerranée, Japon, Inde). Chaque ligne garde au moins une case
  vide, sinon elle disparaîtrait une fois remplie. Une case de `parts` sur un `.` de `rows` serait grise,
  ne compterait pas pour la carte et servirait d'appui (la carte n'en a pas besoin).

L'ancien niveau [`levels/paix.json`](levels/paix.json) (le mot PAIX, 15 × 5) reste disponible : il
suffit de le remettre dans `level` de `src/config.js`.

## Fichiers

```
index.html
levels/monde.json           le niveau (carte du monde)
levels/paix.json            l'ancien niveau (le mot PAIX)
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

« Tetris » est une marque déposée : le jeu s'appelle « Le monde en blocs » à l'écran.
