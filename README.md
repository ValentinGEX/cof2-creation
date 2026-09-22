# Créateur de personnage — Chroniques Oubliées Fantasy 2

Une petite application web qui guide un joueur, pas à pas, pour créer un personnage de
**niveau 1** de Chroniques Oubliées Fantasy 2, puis lui fait télécharger la **feuille officielle
remplie** (plus une page annexe avec son histoire et son portrait).

Elle tourne entièrement dans le navigateur : pas de serveur, pas de compte, rien n'est envoyé
nulle part. Le brouillon reste dans le navigateur du joueur ; à la fin, il télécharge son PDF et
l'envoie lui-même à son MJ.

---

## Lancer l'application chez soi

Un simple double-clic sur `index.html` ne suffit pas (le navigateur bloque la lecture des
fichiers de données). Il faut un petit serveur local :

```bash
cd /Users/valentingerard/Claude_code/app_jdr && python3 -m http.server 8000
```

Puis ouvre **http://localhost:8000/** dans ton navigateur. Pour arrêter le serveur : `Ctrl+C`.

Si tu viens de modifier le code et que l'écran ne change pas, c'est le cache du navigateur :
fais un rechargement forcé (**Cmd+Maj+R**). Pour l'éviter à tes joueurs, `index.html` numérote
ses fichiers (`css/app.css?v=2`, `js/main.js?v=2`…) : après une modification, incrémente ce
numéro partout dans `index.html` et chacun reprendra la nouvelle version tout seul.

La page de tests du moteur de règles est à l'adresse
**http://localhost:8000/tests/tests.html** (tout doit être vert).

---

## Ce que le joueur traverse

| Écran | Ce qu'il y fait |
|---|---|
| Accueil | Nouveau personnage, ou reprendre son brouillon |
| Bienvenue | La carte d'Osgild, le monde, le rôle, son prénom de joueur |
| Homme ou femme ? | Le sexe du personnage (il guide les listes de prénoms) |
| Profil | Les 4 familles, les 14 profils |
| Peuple | Les 8 peuples |
| Caractéristiques | Série officielle à répartir, ou répartition libre (7 points) |
| Voies | Deux voies de profil, la voie de peuple, le rang 2 des mages |
| Équipement | Sac d'aventurier, bourse aux dés, choix d'armes, objet négocié |
| Touche finale | Nom, âge, taille, poids, idéal, travers, secret, bizarrerie, langues |
| Histoire | Une demi-page qui justifie les quatre traits |
| Récapitulatif | La fiche complète, le prompt d'image, le portrait, le PDF |

Une barre de progression en haut situe l'étape en cours et montre celles qui restent. Le
panneau « Fiche en construction », à droite, recalcule tout en direct ; chaque ligne porte un
« ? » qui explique à quoi sert la valeur. L'application vouvoie le joueur d'un bout à
l'autre — un script le vérifie (voir « Contrôles »).

Le PDF produit fait quatre pages : la feuille officielle (deux pages), **« Les capacités
de … »** avec le texte complet du livre, et **« Histoire de … »** avec le portrait. Les cases
de capacités de la feuille sont trop petites pour tout accueillir : elles portent un renvoi
« (suite en annexe) ». Une longue histoire ouvre une page de plus plutôt que d'être coupée.

---

## Les images des cartes

Les 22 visuels (14 profils + 8 peuples) **sont déjà en place**, générés avec GPT Image :
chacun montre les deux sexes côte à côte, en 1200 × 900. Pour en refaire un, les prompts sont
dans [PROMPTS-IMAGES.md](PROMPTS-IMAGES.md) ; garde le nom de fichier
(`images/profils/barbare.jpg`, `images/peuples/gnome.jpg`…) et recharge la page. Tant qu'une
image manque, la carte affiche un visuel de secours.

La carte des Terres d'Osgild de l'écran de bienvenue est déjà en place
(`images/carte-osgild.jpg`) : pour la remplacer, écrase le fichier en gardant le nom.

## Changer la musique

Le morceau servi aux joueurs est `assets/musique.mp3` (2 h 01, 80 kb/s, 69 Mo). Il se lit en
streaming : le navigateur ne télécharge que ce qu'il joue. La vignette en bas à droite
l'allume et l'éteint, et le choix est retenu d'une visite à l'autre.

Elle démarre toujours éteinte : aucun navigateur n'autorise le son tant que le joueur n'a
rien cliqué. S'il l'avait allumée la fois d'avant, elle repart à son premier clic dans la page.

Pour la remplacer, ré-encode ton fichier et écrase `assets/musique.mp3` en gardant le nom :

```bash
cd /Users/valentingerard/Claude_code/app_jdr && ffmpeg -i "ton-fichier.mp3" -vn -c:a libmp3lame -b:a 80k -map_metadata -1 assets/musique.mp3
```

**Ne pousse pas un fichier de plus de 100 Mo** : GitHub le refuse. À 80 kb/s, ça laisse un peu
plus de deux heures et demie de musique.

## Modifier la table des bizarreries

C'est un ajout maison (pas une règle du livre). La table se trouve dans
`tools/extract_pdf.py`, dans le bloc `MAISON`, sous la clé `bizarreries` : vingt entrées,
tirées au d20. Modifie-les, puis relance :

```bash
cd /Users/valentingerard/Claude_code/app_jdr && python3 tools/extract_pdf.py && python3 tools/check_data.py
```

Les autres textes maison (prologue, guides, notes) sont au même endroit, dans `MAISON`.

---

## En ligne

**L'application est publiée : <https://valentingex.github.io/cof2-creation/>**

C'est l'adresse à donner à tes joueurs, directement. Le site est en `noindex`, `robots.txt`
interdit l'indexation et aucun lien ne pointe vers lui : il faut connaître l'adresse. Le dépôt
est public, parce que GitHub Pages l'exige sur un compte gratuit — les textes de règles de
Black Book Éditions et la carte du livre y sont donc accessibles à qui a l'adresse. C'est un
choix assumé.

Dépôt : <https://github.com/ValentinGEX/cof2-creation>

### Mettre le site à jour

Après une modification :

```bash
cd /Users/valentingerard/Claude_code/app_jdr && git add -A && git commit -m "ce que tu as changé" && git push
```

Le site se reconstruit tout seul en une minute environ. Si tu as touché au code ou au style,
incrémente le `?v=` dans `index.html` (voir plus haut) pour que les navigateurs de tes joueurs
reprennent bien la nouvelle version.

Les deux PDF sources (le livre et la feuille d'origine) ne sont **pas** versionnés : voir
`.gitignore`. La copie de travail `assets/feuille.pdf`, elle, est versionnée — l'application en
a besoin.

---

## Comment c'est fait

HTML, CSS et JavaScript, sans étape de construction ni dépendance en ligne (hors polices Google
Fonts). Une seule bibliothèque, copiée localement : `vendor/pdf-lib.min.js`.

```
index.html              coquille unique
css/app.css             ambiance parchemin, ornements faits en CSS
js/rules.js             moteur de règles (fonctions pures, testées)
js/state.js             état du personnage et brouillon localStorage
js/data.js              chargement et assemblage des données
js/ui.js                cartes, infobulles, blocs repliables
js/dice.js              dés animés
js/musique.js           la vignette de musique d'ambiance
js/pdf.js               remplissage de la feuille + les deux pages annexes
js/pdf-repair.js        réparation des champs de la feuille (voir ci-dessous)
js/prompt.js            prompt d'image du personnage
js/steps/*.js           les onze écrans
js/main.js              routeur d'écrans, barre de progression, panneau latéral
assets/                 la feuille officielle, la carte des champs, la musique
data/                   données de jeu (JSON)
tests/tests.html        tests du moteur, à ouvrir dans le navigateur
tools/                  outils de développement (extraction, contrôles)
```

### D'où viennent les données

* **Les profils, les peuples et la voie du mage** viennent du Document de Référence du Système
  publié gratuitement par Black Book Éditions : <https://drs.chroniques-oubliees.fr>.
  Script : `tools/scrape_drs.py`.
* **Le chapitre « Création du personnage », les tables et l'équipement** viennent du livre PDF.
  Script : `tools/extract_pdf.py`.
* **Les compléments structurés** (équipement en objets, effets chiffrés des capacités,
  modificateurs de peuple) ont été relevés capacité par capacité, chaque entrée citant sa phrase
  source : `tools/revue/*.json`, fusionnés par `tools/fusion_revue.py`.
* **Les textes maison** (prologue, guides, notes, bizarreries, et les infobulles du panneau
  latéral sous `maison.aide`) sont regroupés sous la clé `maison` de `data/creation.json` : ce
  sont les seuls textes que nous ayons écrits, et les seuls qui ne portent pas de mention de
  source.

Tout ce qui est règle du jeu est repris **mot pour mot**. Les écarts constatés entre le DRS, le
livre et les fiches des personnages prétirés sont consignés dans
[tools/verification.md](tools/verification.md).

### Contrôles

```bash
cd /Users/valentingerard/Claude_code/app_jdr
python3 tools/check_data.py     # intégrité des données (bloquant)
python3 tools/check_ton.py      # vouvoiement : aucun « tu » adressé au joueur
python3 tools/crosscheck.py     # recoupement DRS ↔ livre, capacité par capacité
```

Après avoir modifié les textes maison, relancer l'extraction puis les deux premiers
contrôles :

```bash
cd /Users/valentingerard/Claude_code/app_jdr && python3 tools/extract_pdf.py && python3 tools/check_data.py && python3 tools/check_ton.py
```

Et la page `tests/tests.html` pour le moteur (24 tests, dont les 12 personnages prétirés du
livre).

### Un mot sur la feuille PDF

`assets/feuille.pdf` a été ré-enregistrée par Aperçu : la liste interne des champs pointe des
copies orphelines, si bien qu'un remplissage classique **ne s'affiche pas**. `js/pdf-repair.js`
reconstruit cette liste à partir des annotations des pages. Si un jour tu remplaces la feuille
par une version fraîchement téléchargée chez Black Book Éditions, la réparation se désactive
d'elle-même (elle ne fait rien sur un fichier sain) ; il faut en revanche regénérer la carte des
champs :

```bash
# 1. ouvrir http://localhost:8000/tools/dump_fields.html (produit champs-bruts.json)
# 2. python3 tools/build_fields_map.py <chemin/champs-bruts.json>
```

---

## Crédits

Chroniques Oubliées Fantasy 2 est édité par **Black Book Éditions**. Les textes de règles
affichés ici leur appartiennent ; cet outil est un usage personnel, sans lien avec l'éditeur et
sans diffusion publique.
