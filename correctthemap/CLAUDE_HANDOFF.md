# Correct the map — dossier de reprise

Dernière mise à jour de ce document : 4 novembre 2026.

## Objet du projet

Microsite cartographique plein écran permettant :

1. de transformer continûment une planisphère Mercator en Eckert IV avec une glissière ;
2. d'enrouler la planisphère sur un globe orthographique interactif ;
3. de faire tourner et zoomer le globe avec inertie.

Le site actuellement publié est visible à :

- https://maximej.github.io/map-morph-site/
- dépôt historique : https://github.com/maximej/map-morph-site

Cette copie se trouve désormais dans :

`/Users/postemotion1/Dev/CarteDeVoeux2026/correctthemap`

Le dépôt historique a volontairement été conservé intact. Le répertoire parent
`/Users/postemotion1/Dev/CarteDeVoeux2026` est déjà un dépôt Git ; ne pas créer
un dépôt Git imbriqué ici sans décision explicite.

## État fonctionnel actuel

- Interface volontairement minimale : carte, glissière, bouton globe et cartouche « Correct the map ».
- Barre de commandes responsive : sur une ligne en grand écran ; les deux boutons passent sous la glissière
  quand la place manque (tablette, téléphone à l'horizontale) ; en grille sous 640 px, où les libellés
  peuvent passer sur deux lignes. Panneau large de 960 px au plus.
- Fond de ciel étoilé génératif (`src/sky.js`), d'après `IMG/Sky constellations/ISS_Constellations_Sky_PolarStar_centered.pdf` :
  dégradé de nuit en CSS (`.sky`), du bleu nuit `#020a2a` au bleu-gris `#757d9f` vers l'horizon,
  étoiles tirées avec une graine fixe (même ciel à chaque
  redimensionnement), éclats à quatre branches sur les plus brillantes, 18 qui scintillent, et rotation
  lente autour du centre de l'écran (un tour en 15 min). Étoiles dessinées une seule fois, rotation et
  scintillement en animations CSS : aucun coût par image ; arrêtés si « réduire les animations ».
  La carte garde son fond beige : `drawLayer` remplit l'intérieur du contour (`Sphere`) en `PAPER`, les
  tampons sont transparents autour, et le canevas principal est effacé à chaque image. Pendant
  l'enroulement, le contour de la projection intermédiaire se replie : le beige de la carte plane s'efface
  en fondu (`flatPaper`, wrapT de .04 à .3), puis celui du globe apparaît avec lui (wrapT de .55 à .70).
- Couleurs de l'interface (panneau, boutons, glissière, légende, étiquette, épingles) tirées de la charte
  commune des vœux, d'après `IMG/ref/MonumentValley` : encre `#383f52`, panneaux menthe pâle `#f4feee`
  cadrés de bleu-vert `#51acad` avec halo, boutons bleu-vert foncé `#32717b`, bouton actif, curseur,
  chiffres et étiquette violet `#6c60a9`. La carte garde ses couleurs (beige, continents bleus) et le ciel
  reste bleu nuit, comme la référence.
- Interface en français (« afficher / cacher les postes », « enrouler le globe / dérouler la carte »,
  légende « ambassades / consulats ») ; seul le titre « Correct the map » reste en anglais.
- Transition Mercator → Eckert IV calculée géométriquement, sans fondu d'images de référence.
- Globe orthographique avec rotation libre, inertie et zoom à la molette.
- Côtes uniquement : aucune frontière intérieure entre pays.
- Palette bleu/ivoire et mise en page responsive.
- Antarctique inclus dans les données mondiales.
- Les contours extérieurs disparaissent rapidement pendant l'enroulement.
- La face arrière est occultée avant l'arrivée finale du globe.

Séquence actuelle de l'enroulement :

- de 0 à 55 % : courbure de la surface vers l'orthographique ;
- de 55 à 70 % : remplacement progressif par l'hémisphère frontal découpé ;
- de 70 à 100 % : poursuite de la position, de l'échelle et de la rotation avec la seule face frontale.

## Architecture

```text
correctthemap/
├── assets/
│   └── world-lowres.json       # TopoJSON mondial utilisé par le site
├── dataSource/                 # Données métier préexistantes, non intégrées au site
│   ├── POSTES_MEAE_2026-10.csv
│   └── reseau_mae.xlsx
├── docs/                       # Build statique courant pour GitHub Pages
├── scripts/
│   └── build.mjs               # Bundle esbuild + copie vers dist/ et docs/
├── src/
│   ├── app.js                  # Rendu Canvas, interactions et animation
│   ├── index.html              # Interface
│   ├── projection-math.js      # Mercator, Eckert IV et interpolation
│   └── styles.css              # Direction artistique et responsive
├── package.json
├── package-lock.json
├── test.mjs
└── CLAUDE_HANDOFF.md
```

`dist/` est généré par le build et n'est pas nécessaire dans Git. `docs/` est
également régénéré, mais reste utile pour une publication GitHub Pages directe.

## Choix techniques importants

### Projection plane

`src/projection-math.js` interpole les coordonnées projetées de Mercator vers
Eckert IV. La latitude Mercator est limitée à ±85,05112878° afin d'éviter les
singularités aux pôles.

### Passage au globe

Les anciens essais appliquaient un masque sphérique à une projection hybride.
Chrome et Firefox produisaient alors des coupes franches différentes. La version
actuelle évite ce chemin :

- un buffer dessine la surface interpolée non découpée ;
- un second buffer dessine une vraie projection orthographique frontale ;
- les deux partagent exactement échelle, translation et rotation lors du relais ;
- les buffers ont un fond ivoire opaque pour éviter les bandes d'alpha et flashes blancs.

Ne pas réintroduire `context.clip()` autour du chemin `Sphere` sur la projection
plane : c'était la cause directe de cartes invisibles ou coupées selon le navigateur.

### Dimensionnement

L'échelle plane utilise les dimensions mathématiques interpolées des deux
projections. Mercator limitée à ±85,05° est presque carrée ; Eckert IV est plus
large et plus basse. Le calcul actuel garde leur emprise complète dans le canvas.

## Installation et commandes

```bash
cd /Users/postemotion1/Dev/CarteDeVoeux2026/correctthemap
npm ci
npm test
npm run build
python3 -m http.server 4173 --directory docs
```

Puis ouvrir `http://127.0.0.1:4173/`.

Le build supprime et recrée uniquement `dist/` et `docs/`. Il ne touche pas à
`dataSource/`.

## Tests existants

`npm test` exécute quatre tests Node :

1. présence des deux interactions principales ;
2. absence de frontières intérieures et invariants du compositing ;
3. monotonie et valeurs finies de l'interpolation Mercator/Eckert jusqu'aux pôles ;
4. contenu du JSON des postes : seulement les champs publiés, ambassades fermées exclues.

Les tests ne remplacent pas une validation visuelle multi-navigateur. Une
installation Firefox locale a présenté une incompatibilité interne de versions
(application 159.0 contre moteur 158.0.1), ce qui a empêché les captures headless
automatisées. Les retours visuels Firefox ont donc été fournis manuellement.

## Postes diplomatiques et consulaires (épingles)

Ajouté le 4 novembre 2026. Le bouton « afficher les postes / cacher les postes » fait apparaître des épingles
sur la carte plane comme sur le globe (face avant seulement ; elles rapetissent vers le bord).
Elles tombent en cascade d'ouest en est, et une légende en haut de l'écran donne les totaux.

- Source : `dataSource/POSTES_MEAE_2026-10.csv` (243 villes), converti au build par
  `scripts/postes.mjs` en `assets/postes.json` (dans `dist/` et `docs/` seulement).
- Seuls le nom de la ville, le pays, les coordonnées (arrondies à 4 décimales) et le type sont publiés.
- Gardés : ambassades ouvertes (`AMBASSADE = 1`, postes de présence diplomatique compris) et
  consulats généraux (`CONS_GAL = 1`) : 161 ambassades, 96 consulats, dont 22 villes avec les deux
  (dessinées en ambassade).
- Exclus : les 4 ambassades marquées « Ambassade fermée » (Niamey, Sanaa, Damas, Kaboul), les
  représentations permanentes sans ambassade ni consulat (Paris, Strasbourg, Nouméa) et le Bureau de France d'Hyderabad.
- Les coordonnées sont celles du centre de la ville (Natural Earth), pas l'adresse des bâtiments.
- Un clic (ou un toucher) sur une épingle affiche le nom du poste, son type et son pays dans une
  étiquette ; une seule à la fois. Recliquer la même épingle ou cliquer ailleurs la ferme ; un glisser fait tourner le globe sans
  la fermer. L'étiquette suit l'épingle et se masque quand celle-ci passe sur la face cachée.
- Réglages dans `src/app.js` : `PIN` (taille et couleurs par type), `PIN_SWEEP`, `PIN_DURATION`.

Performance (mesurée dans Chrome, 1400 × 850, écran Retina, globe avec épingles) : environ 7 ms
de calcul par image pendant la rotation, contre environ 21 ms avant ces trois réglages :

- seul le buffer visible est dessiné (la carte plane n'est plus calculée sous le globe arrivé) ;
- glisser et molette demandent au plus un dessin par image affichée (`requestDraw`) ;
- chaque type d'épingle est pré-dessiné une fois (sprite), puis recopié.

## Données métier présentes dans le nouveau dossier

Les fichiers `dataSource/POSTES_MEAE_2026-10.csv` et
`dataSource/reseau_mae.xlsx` existaient avant la migration. Ils ont été préservés.
Le CSV est lu au build (voir ci-dessus) ; aucun des deux n'est copié dans le build public.

Avant de les intégrer :

- vérifier leur caractère publiable et les éventuelles données sensibles ;
- définir la correspondance géographique attendue ;
- produire si possible un JSON statique minimal lors du build plutôt que charger
  directement les fichiers bruts côté navigateur.

## Déploiement actuel

Le site public continue d'être construit depuis le dépôt historique
`maximej/map-morph-site`, branche `main`, répertoire `/docs`.

La copie `CarteDeVoeux2026/correctthemap` n'est pas encore reliée à GitHub Pages.
Pour en faire la nouvelle source officielle, il faudra choisir entre :

1. déplacer la configuration Pages vers le dépôt `CarteDeVoeux2026` ;
2. conserver le dépôt public historique et synchroniser cette copie vers celui-ci ;
3. créer un nouveau dépôt autonome pour `correctthemap`.

Ne pas publier automatiquement les fichiers de `dataSource/`.

## Historique utile

Dernier commit local du dépôt historique copié :

`eebc1e5 feat: occlude rear before globe arrival`

Jalons importants précédents :

- `20a58ed` : buffers séparés et globe orthographique natif ;
- `9bdde24` : suppression du masque Canvas invalide ;
- `939c1ac` : rotation polaire débloquée et transition adoucie ;
- `842cf28` : suppression du flash blanc ;
- `e0ecf34` : suppression des sautes de clipping.

## Prochaines étapes recommandées

1. Valider visuellement la transition complète dans les versions courantes de Chrome, Firefox et Safari.
2. Ajouter un test navigateur automatisé capturant 0, 25, 50, 70 et 100 % de l'enroulement.
3. Rendre les épingles accessibles au clavier et aux lecteurs d'écran.
4. Séparer les paramètres d'animation en constantes nommées pour faciliter la direction artistique.
5. Décider quel dépôt devient la source canonique avant tout nouveau déploiement.

## Contraintes à préserver

- Ne pas réintroduire les frontières administratives intérieures.
- Ne pas afficher simultanément les deux faces du globe à l'état final.
- Ne pas utiliser de fondu entre quatre images cartographiques pré-rendues.
- Garder une expérience mobile responsive.
- Préserver `dataSource/` tant que son usage n'est pas spécifié.

