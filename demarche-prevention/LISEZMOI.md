# La démarche de prévention — jeu de formation

Application web mobile, à ouvrir depuis un simple lien. Rien à installer.
HTML + CSS + JavaScript simples, sans étape de construction : on modifie un
fichier, on le renvoie en ligne, c'est fait.

## L'adresse du jeu

**https://hiiato.github.io/CSE-training/demarche-prevention/**

Envoyez ce lien aux stagiaires (SMS, mail, QR code). Il s'ouvre directement
dans le navigateur du téléphone.

### Installer le jeu sur l'écran d'accueil du téléphone

Une fois la page ouverte : menu du navigateur → **« Ajouter à l'écran
d'accueil »** (Android) ou **Partager → « Sur l'écran d'accueil »** (iPhone).
Le jeu apparaît comme une application, avec l'icône Hiiato, en plein écran.

### Hors connexion

Après la première ouverture **avec** du réseau, le jeu fonctionne **sans**
réseau : salle mal couverte, mode avion, forfait épuisé. Le DUERP en cours
reste dans le téléphone.

À dire aux stagiaires : *« ouvrez le lien une fois chez vous ou sur le Wi-Fi
d'accueil, ensuite ça marche partout. »*

## Ce que contient cette livraison (phase 0 — fondations)

| Élément | État |
|---|---|
| Coquille tour par tour, un écran à la fois | fait |
| Barre de progression des 4 étapes | fait |
| Objet « partie » + sauvegarde après chaque décision | fait |
| Accueil « Nouvelle partie / Reprendre où j'en étais » | fait |
| Carnet DUERP repliable, consultable depuis n'importe quel écran | fait |
| Composant carte à glisser, réutilisable | fait |
| Jeu hors connexion + installation sur l'écran d'accueil | fait |
| Étapes 2, 3, 4, 5 | à venir, une par livraison |

Les quatre étapes apparaissent sur l'écran « parcours » avec la mention
« bientôt ». Ordre de construction : **3 identification → 4 analyse →
5 mesure → 2 préparation**.

## Vérifier que les fondations tiennent

Écran « parcours » → bouton **Banc d'essai (formateur)** :

1. **Tester la pile de cartes** — le jeu demande si une formulation de
   fréquence est floue ou précise. Il ne le dit pas : c'est vous qui tranchez.
   Deux boutons, ou le glissement de la carte, au choix.
2. **Inscrire 3 risques d'exemple** — ils apparaissent aussitôt dans le carnet
   (icône document en haut à droite), avec cotation et mesure.
3. **Fermer l'onglet, puis rouvrir le lien** — l'accueil propose « Reprendre
   où j'en étais » et ramène exactement à l'écran quitté, DUERP intact.
4. **Mode avion, puis rouvrir le lien** — le jeu se lance quand même.

Le bouton **Tout effacer** repart d'un DUERP vierge.

## Modifier le jeu

### Ce qui se modifie sans toucher au code

`data/parcours.json` : le titre, l'accroche, le nom et le résumé de chaque
étape. Ce fichier doit rester un JSON valide : guillemets droits `"`, une
virgule entre les entrées, **pas** de virgule après la dernière.

### Prévisualiser avant de publier

Double-cliquez **`previsualiser.cmd`** : le jeu s'ouvre sur votre PC uniquement,
à l'adresse `http://localhost:8080`. Pratique pour vérifier une modification
avant de la mettre en ligne. Fermez la fenêtre noire pour arrêter.

### Publier une modification

Le jeu est hébergé dans le dépôt GitHub **HIIATO/CSE-training**, dossier
`demarche-prevention/`. Déposez-y les fichiers modifiés ; la nouvelle version
est en ligne en une à deux minutes.

> ⚠️ **Important.** Après *toute* modification, ouvrez `sw.js` et changez la
> ligne `var VERSION = 'v1';` en `'v2'`, puis `'v3'`, etc. Sans cela, les
> joueurs qui ont déjà ouvert le jeu continueront de voir l'ancienne version,
> gardée en mémoire pour le hors connexion.

## Organisation des fichiers

```
demarche-prevention/
  index.html              la page unique
  manifest.webmanifest    nom et icônes pour l'écran d'accueil
  sw.js                   le cache hors connexion  ← VERSION à incrémenter
  previsualiser.cmd       prévisualisation sur votre PC
  css/style.css           palette, typographie, composants
  fonts/                  la police Figtree (aucun appel à Internet)
  js/etat.js              l'objet « partie », le DUERP, la sauvegarde
  js/ui.js                le routeur d'écrans, la barre d'étapes, les messages
  js/cartes.js            le composant « pile de cartes à glisser »
  js/carnet.js            le carnet DUERP repliable
  js/app.js               l'accueil, le parcours, le banc d'essai
  data/parcours.json      les textes de l'accueil et des 4 étapes  ← modifiable
  assets/                 le logo, les icônes, et les scènes (à venir, phase 1)
```

## Où sont enregistrées les parties

Dans le navigateur du joueur (`localStorage`, clé `hiiato.demarche-prevention`).
Rien ne part sur Internet, aucun compte, aucune donnée collectée. Une partie
est propre à un navigateur et à un appareil : elle ne suit pas le joueur d'un
téléphone à l'autre.

## Style visuel

Palette, typographie (Figtree), cartes, boutons, feuilles glissantes et
animations sont repris du jeu « Les acteurs de la prévention ». Le logo et la
police ont été extraits de ce jeu, donc rien n'est chargé depuis Internet.

Les règles suivantes priment en cas de conflit : mobile portrait, colonne
unique, une décision par écran, cibles tactiles de 44 px minimum, aucun
défilement horizontal.

## Principe de conception à ne pas perdre

**Le jeu ne souffle jamais la réponse.** Aucune étiquette, couleur ou icône ne
doit révéler le bon choix avant que le joueur ne se soit prononcé. Le verdict
n'arrive qu'au débrief. C'est ce qui distingue ce jeu d'un QCM.
