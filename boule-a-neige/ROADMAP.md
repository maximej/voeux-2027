# Boule à neige — Feuille de route

Quatrième jeu des vœux 2027, à côté de « Relie les points », PAXEL et « PAIX en blocs ».

**Avancement : V0 à V7 et V9 terminées, en ligne** : https://maximej.github.io/voeux-2027/boule-a-neige/
Reste V8 : les tests sur appareils réels (iPhone, Android, navigateurs d'ordinateur).

**Ajout après la mise en ligne : parallaxe légère** (souris sur ordinateur, gyroscope sur téléphone,
33° au plus dans chaque direction ; les places 2 et 3, devant, sont à 130 % de la taille des autres). Profondeurs, du fond vers l'avant : halo du ciel, neige du fond, place 4, places 1
et 5, places 2 et 3, neige du premier plan. Chaque bâtiment a, à son pied, un monticule de la
couleur de la neige du fond qui fait partie de son niveau : le pied reste planté quel que soit le
décalage. Les bandes de neige débordent de la sphère pour qu'aucun bord ne se découvre.

## 1. Le concept

Une petite sphère de verre posée sur un socle plat. Dans la sphère, un paysage de **5 bâtiments**
placés à des **emplacements fixes**. Chaque bâtiment est choisi parmi **10 bâtiments emblématiques**
de **10 grandes villes du monde**, sans répétition.

On **retourne la boule** pour faire tomber la neige sur le décor :

- sur téléphone, en la secouant (capteurs de mouvement) ;
- sur ordinateur, avec les flèches du clavier.

Chaque combinaison de bâtiments a **sa propre adresse (URL)** : on compose sa boule, on partage le
lien, la personne qui l'ouvre voit la même boule.

Tous les visuels sont en **SVG**. Les bâtiments et la boule sont en **flat design** (aplats de
couleur, pas de néon) ; la page autour garde la charte des autres jeux. Le socle porte
« Bonne Année 2027 ».

---

## 2. Principes à respecter

Les mêmes que pour les trois autres jeux :

- page web simple, **sans dépendance ni compilation** (HTML, CSS, JavaScript, SVG, Canvas) ;
- **charte commune** : néon blanc à halo orange, fond presque noir, police du système ;
- **mobile d'abord** : le geste principal est de secouer le téléphone ;
- **aucun suivi** : pas de compte, pas de cookie, les données des capteurs restent dans le navigateur ;
- message de vœux sur le socle : « Bonne Année 2027 » (fixe : l'adresse ne permet pas de le changer) ;
- code modulaire avec une **configuration centrale** ;
- chaque étape produit une version qui fonctionne et que l'on teste avant de passer à la suivante.

---

## 3. Les bâtiments

### Liste validée

La tour Eiffel et 9 lieux du [Patrimoine de la Diplomatie](https://fr.wikipedia.org/wiki/Patrimoine_de_la_Diplomatie)
(liste remplacée après la première mise en ligne ; elle remplace les monuments des grandes villes du monde) :

| # | Bâtiment | Lieu | Dessin |
|---|---|---|---|
| 0 | Tour Eiffel | Paris | conservé de la première version |
| 1 | Ossuaire de Douaumont | Douaumont-Vaux | d'après une illustration fournie |
| 2 | Habitation Maud'Huy | Saint-François, Guadeloupe | d'après une illustration fournie |
| 3 | Couvent des Franciscains | Perpignan | d'après une illustration fournie |
| 4 | Île des Faisans | Hendaye – Irun | d'après une illustration fournie |
| 5 | Château de Saint-Malo | Saint-Malo | d'après une illustration fournie |
| 6 | Quai d'Orsay | Paris | même style et même palette |
| 7 | Château de Chambord | Chambord | même style et même palette |
| 8 | Palais de l'Europe | Strasbourg | même style et même palette |
| 9 | Château de Rambouillet | Rambouillet | même style et même palette |

Les illustrations sources (PNG) restent sur le poste, exclues du dépôt. Les adresses `?b=…` partagées avant ce changement montrent désormais d'autres bâtiments.

### Droits

Cinq dessins sont des simplifications d'illustrations fournies pour le projet ; les autres sont
redessinés pour le projet. Pas de crédit affiché.

### Gabarit des SVG

Pour que les 10 bâtiments puissent occuper n'importe lequel des 5 emplacements :

- un fichier par bâtiment : `assets/buildings/<id>.svg` ;
- même `viewBox` pour tous (par exemple `0 0 200 300`), **pied du bâtiment centré en bas** ;
- hauteur relative respectée entre bâtiments (une tour reste plus haute qu'une porte), dans une
  hauteur maximale commune ;
- **flat design** : aplats de couleur, sans contour ni dégradé, une ou deux nuances par bâtiment
  pour les volumes, la palette des illustrations fournies (pêche, corail, crème, ocre, bleu
  profond) ; peu de détails (la boule est petite sur un téléphone) ;
- un nom et un texte alternatif pour chacun (`buildings.json`).

---

## 4. La scène

```text
        .-''''''-.
      .'  *    *   '.        sphère de verre (aplats, reflet)
     /   1  4  5     \       5 emplacements fixes :
    |    2     3      |        arrière : 1, 4 et 5 (plus grands, plus hauts dans la scène)
     \  ___________  /         avant : 2 et 3 (plus petits, plus bas, dessinés devant)
      '.___________.'        sol enneigé
     [_______________]       socle plat : « Bonne Année 2027 »
```

- Les emplacements sont définis dans la configuration : position, échelle, ordre d'affichage
  (les bâtiments de devant passent devant ceux de derrière).
- La disposition exacte se règle une fois les premiers SVG dessinés.
- Le décor (sphère, sol, socle) est en SVG ; la neige est dessinée sur un Canvas par-dessus,
  limité au cercle de la sphère.

---

## 5. Adresse de partage

Chaque emplacement reçoit le numéro (0 à 9) d'un bâtiment. Les 5 chiffres, dans l'ordre des
emplacements, forment l'adresse :

```text
https://maximej.github.io/voeux-2027/boule-a-neige/?b=27049
                                                       ↑↑↑↑↑
                                         emplacements 1 2 3 4 5
```

- Un même bâtiment ne peut apparaître qu'une fois : 10 × 9 × 8 × 7 × 6 = **30 240 combinaisons**.
- Une adresse incomplète, invalide ou avec un chiffre répété affiche une combinaison par défaut.
- L'adresse se met à jour à chaque changement (sans recharger la page), le bouton « Partager »
  ouvre le partage du téléphone (Web Share) ou copie le lien.
- Limite connue : GitHub Pages ne sert que des fichiers fixes, donc l'aperçu affiché par les
  messageries (image Open Graph) sera le même pour toutes les combinaisons.

---

## 6. Retourner la boule

- **Téléphone** : capteurs de mouvement (`devicemotion`). Une secousse au-delà d'un seuil retourne
  la boule ; plus on secoue, plus la neige tourbillonne.
  - **iPhone** : l'accès aux capteurs demande une autorisation, qui ne peut être demandée qu'après
    un geste (un bouton « Activer le mouvement »). La page est en HTTPS (GitHub Pages) : condition
    remplie.
  - Si l'autorisation est refusée ou les capteurs absents : retourner la boule d'un geste (glisser
    vers le haut ou toucher la boule).
- **Ordinateur** : flèches du clavier (↑ ou ↓ retournent la boule, ← → la secouent de côté).
  Également au clic, pour un ordinateur sans clavier ou une tablette.
- **Animation** : la boule pivote, la neige remonte, la boule revient à l'endroit, puis la neige
  retombe doucement sur le décor.
- Vibration légère au retournement (Android uniquement).

---

## 7. La neige

- Quelques centaines de flocons sur un Canvas, limités à l'intérieur de la sphère.
- Chute lente avec dérive latérale, tailles et vitesses variées (impression de profondeur).
- Le retournement et la secousse donnent de l'élan ; les flocons ralentissent puis retombent.
- Les flocons se posent sur le sol (et, si c'est simple, sur les toits), puis s'effacent au bout
  d'un moment, pour pouvoir recommencer.
- Mouvement réduit (réglage du système) : neige plus calme, pas de pivot de la boule.

---

## 8. Étapes de développement

```text
V0  Scène fixe          V1  Composer          V2  Neige
        ↓                       ↓                     ↓
V3  Retourner (clavier, clic)  →  V4  Secouer (téléphone)
        ↓
V5  Les 10 bâtiments    V6  Partage    V7  Finitions    V8  Tests    V9  Mise en ligne
```

### V0 — Scène fixe

Sphère, socle avec « Bonne Année 2027 », sol et 5 emplacements avec des **bâtiments provisoires**
(formes simples en SVG au bon gabarit). Mise en page sur téléphone (portrait) et ordinateur.

*Validé quand* : la boule s'affiche proprement sur un téléphone et un ordinateur.

### V1 — Composer sa boule

Choisir le bâtiment de chaque emplacement (toucher un emplacement, choisir dans la liste des 10),
bouton « au hasard ». Lecture et écriture de l'adresse `?b=…`. Sans adresse (ou avec une adresse
invalide), la page s'ouvre sur une combinaison au hasard, aussitôt écrite dans l'adresse.

*Validé quand* : une adresse ouverte dans un autre navigateur montre la même boule.

### V2 — La neige

Simulation des flocons, déclenchée par un bouton provisoire. Réglages dans la configuration
(nombre, vitesse, dérive, durée).

*Validé quand* : la neige est agréable à regarder et reste fluide sur un téléphone moyen.

### V3 — Retourner la boule (clavier et clic)

Animation de retournement, flèches du clavier, clic sur la boule.

### V4 — Secouer le téléphone

Capteurs de mouvement, demande d'autorisation sur iPhone, seuil de secousse, intensité de la neige
selon la force de la secousse, solution de repli au geste.

*Validé quand* : secouer un iPhone et un Android fait neiger, et le refus de l'autorisation laisse
le jeu utilisable.

### V5 — Les 10 bâtiments

Dessin des 10 SVG au gabarit commun (voir 3), remplacement des formes provisoires, réglage fin des
emplacements (échelles, positions) pour que toute combinaison reste lisible.

### V6 — Partage

Bouton « Partager » (Web Share sur téléphone, copie du lien sinon), image d'aperçu commune pour les
messageries.

### V7 — Finitions

Reflets du verre, apparition de la scène, vibration, accessibilité (description de la
scène, commandes au clavier annoncées), mouvement réduit.

### V8 — Tests

iPhone (Safari), Android (Chrome), Firefox, Safari et Edge sur ordinateur ; fluidité de la neige,
autorisation des capteurs, adresses de partage, rotation de l'écran.

### V9 — Mise en ligne

Lien depuis la page d'accueil du dépôt, `README.md`, publication sur GitHub Pages.

---

## 9. Structure prévue

```text
boule-a-neige/
  index.html
  ROADMAP.md
  README.md
  assets/
    buildings/        les 10 bâtiments (SVG)
    buildings.json    identifiants, noms, villes, textes alternatifs
  src/
    config.js         emplacements, réglages de la neige et des gestes, message
    main.js
    scene/            sphère, socle, placement des bâtiments
    snow/             simulation des flocons
    input/            capteurs de mouvement, clavier, gestes
    share/            lecture et écriture de l'adresse, partage
    ui/               choix des bâtiments, boutons, message
    styles/main.css
```

---

## 10. Décisions prises

1. Liste des villes et des bâtiments : validée (section 3), São Paulo remplacé par Rio de Janeiro.
2. Pas de répétition : un bâtiment au plus une fois (30 240 combinaisons).
3. Les 10 SVG sont dessinés pour le projet, en **flat design** (pas de néon).
4. Socle : « Bonne Année 2027 ».
5. Nom : « Boule à neige », dossier `boule-a-neige/`.
