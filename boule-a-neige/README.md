# Boule à neige

Quatrième jeu des vœux 2027 : une boule à neige avec 5 bâtiments choisis parmi 10, à retourner
pour faire neiger. Voir [ROADMAP.md](ROADMAP.md).

Les bâtiments : la tour Eiffel et 9 lieux du [Patrimoine de la Diplomatie](https://fr.wikipedia.org/wiki/Patrimoine_de_la_Diplomatie),
dessinés en flat design dans une même palette.

En ligne : https://maximej.github.io/voeux-2027/boule-a-neige/

## Jouer

- **Composer** : toucher (ou cliquer) un bâtiment pour le changer ; « Au hasard » tire une autre
  boule. Un même bâtiment n'apparaît qu'une fois (30 240 combinaisons).
- **Faire neiger** : secouer le téléphone (iPhone : « Activer le mouvement » d'abord), toucher ou
  cliquer la boule, ou ↑ ↓ au clavier ; ← → la secouent de côté.
- **Partager** : partage du téléphone, ou copie du lien sur ordinateur.
- **Parallaxe** : le décor suit légèrement la souris (ordinateur) ou l'inclinaison du téléphone
  (gyroscope, 15° pour l'amplitude maximale). Trois niveaux de bâtiments : la place 4 au fond,
  les places 1 et 5, puis les places 2 et 3 devant ; la neige qui tombe, le verre et le socle ne
  bougent pas.

Sans adresse, la page s'ouvre sur une boule au hasard.

## Adresse

```text
?b=27049          bâtiment (0 à 9) des emplacements 1 à 5, dans l'ordre
?msg=…            remplace « Bonne Année 2027 » sur le socle ; un clic sur la plaque modifie ce
                  texte et met l'adresse à jour (un texte vide revient à « Bonne Année 2027 »)
```

Les numéros des bâtiments sont leur ordre dans [`assets/buildings.json`](assets/buildings.json) :
ne pas réordonner cette liste, sous peine de changer les boules déjà partagées (ajouter à la fin).

## Lancer en local

```sh
python3 -m http.server 8000   # depuis la racine du dépôt, puis http://localhost:8000/boule-a-neige/
```

Les capteurs de mouvement exigent une page en HTTPS : sur téléphone, les secousses ne se testent
que sur la version en ligne.

## Fichiers

```text
index.html
assets/
  buildings.json        les 10 bâtiments (identifiant, lieu, nom)
  buildings/<id>.svg    leurs dessins, flat design, cadre 200 × 300, pied centré en bas
  apercu.jpg            image d'aperçu pour les messageries
src/
  config.js             emplacements, couleurs, neige, retournement, secousses, partage, message
  main.js               branchements
  scene/Scene.js        la boule en SVG (ciel, sol, bâtiments, verre, socle)
  scene/Motion.js       retournement et secousse de côté
  scene/Parallax.js     décalage des niveaux de profondeur
  snow/Snow.js          les flocons (Canvas)
  input/Controls.js     clavier, clic, toucher
  input/ShakeSensor.js  secousses du téléphone
  input/TiltInput.js    souris ou gyroscope, pour la parallaxe
  share/Combination.js  combinaisons et adresse ?b=
  share/Share.js        partage
  ui/Picker.js          choix d'un bâtiment
  styles/main.css
```

Pour ajouter ou remplacer un dessin : un SVG au gabarit (`viewBox="0 0 200 300"`, pied du bâtiment
centré en bas, aplats sans contour), sans identifiants internes.
