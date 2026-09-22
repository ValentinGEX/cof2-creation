# Journal de vérification des données

Ce fichier consigne les contrôles faits sur les données et les écarts constatés entre les
trois sources : le **DRS officiel** (source des capacités, des profils et des peuples), le
**livre** (source du chapitre 1, des tables et de l'équipement) et les **fiches des
personnages prétirés** du livre (utilisées uniquement comme fixtures de test).

Règle appliquée partout : en cas de contradiction, **le texte des règles fait foi**, l'écart
est consigné ici (décision de Valentin, §5.18 du brief).

---

## 1. Contrôles automatiques

| Contrôle | Commande | Résultat |
|---|---|---|
| Intégrité des données | `python3 tools/check_data.py` | 390 capacités, 36 armes, 9 armures, 21 sorts de rang 1 — conforme |
| Recoupement DRS ↔ livre | `python3 tools/crosscheck.py` | 390 capacités comparées : 8 titres de graphie différente, 2 textes différents, 3 écarts de tags |
| Moteur de règles | `tests/tests.html` | 24 tests au vert, dont les 12 prétirés du livre |

`check_data.py` vérifie notamment : 14 profils × 5 voies × 5 capacités, 7 voies de peuple
(le demi-elfe n'en a pas), la voie du mage, les rangs consécutifs, les titres uniques, les
textes d'au moins 40 caractères, l'absence de caractère non encodable dans la feuille PDF
(WinAnsi), les tags ⊂ {L, A, M, G}, les trois caractéristiques clés par profil, toutes les
références d'équipement, les tables de 20 idéaux / 20 travers / 2 × 20 secrets / 20
bizarreries / 10 langues, les seize infobulles maison, et les 21 sorts de rang 1 attendus.

## 2. Écarts entre le DRS et le livre

Aucun écart de fond. Huit titres diffèrent par la graphie, deux textes par un renvoi de page.

| Capacité | DRS (retenu) | Livre | Rang |
|---|---|---|---|
| Barde, voie du musicien | Chant du réconfort | Chant de réconfort | 2 |
| Barde, voie du saltimbanque | Lanceur de couteaux | Lanceur de couteau | 3 |
| Barde, voie de la séduction | Dentelle et rapière | Dentelles et rapière | 2 |
| Guerrier, voie du combat | Manoœuvre *(coquille du DRS)* | Manœuvre | 2 |
| **Magicien, voie de la magie élémentaire** | **Asphixie** *(coquille du DRS)* | **Asphyxie** | **1** |
| Sorcier, voie du sang | Rituel du sang | Rituel de sang | 4 |
| Sorcier, voie de la sombre magie | Manteau de l'ombre | Manteau d'ombre | 4 |
| Moine, voie de l'énergie vitale | Projection de ki | Projection du ki | 2 |

* **À arbitrer par Valentin** : « Asphixie » est une capacité de **rang 1**, donc susceptible
  d'être imprimée sur une feuille de personnage. Le DRS est suivi tel quel (règle du brief) ;
  un mot suffit pour corriger la graphie en « Asphyxie ».
* Deux textes diffèrent d'un renvoi de pagination absent du DRS : chevalier « Fidèle monture »
  (« (voir page suivante) ») et voleur « Attaque sournoise ».

Écarts de notation (aucun au rang 1, donc sans effet sur l'application) :

* Prêtre, voie des soins, rang 2 « Vigueur divine » : le livre note `(L)*`, le DRS ne met ni
  tag ni astérisque.
* Elfe sylvain, rang 4 « Flèche sanglante » : le livre note `(L)`, le DRS rien.

## 3. Écarts entre les règles et les fiches des prétirés

Ces fiches ne servent qu'aux tests. Le moteur suit la règle ; l'écart est indiqué en
commentaire dans `tests/tests.js`.

| Personnage | Fiche du livre | Règle appliquée | Explication |
|---|---|---|---|
| Lhagva (humaine barbare) | PV 15 | **PV 12** | (2 × 5) + CON 2 ; aucune de ses capacités ne donne de PV |
| Kamshaka (demi-orc rôdeur) | PC 1, DR 4d8 | **PC 2, DR 3d8** | correspond à l'échange PC → DR de la capacité « Éclaireur », que sa fiche ne liste pas |
| Mahardil (humain chevalier) | PC 4 | **PC 5** | « Diversité » (voie de l'humain) donne 1 PC de plus |
| Keyrel (demi-elfe magicien) | PC 3 | **PC 4** | idem, la capacité de peuple est conservée par la voie du mage |
| Helga (naine forgesort) | AGI +0 et attaque à distance +2 | **+1** | la fiche est incohérente avec elle-même (niveau + AGI) |
| Yellen (elfe sylvaine moine) | DR 3d6 | **4d8** | mystique : 3 + CON dés, type d8 |
| Elluwëe (elfe haute prêtresse) | DR 3d8 | **4d8** | mystique : 3 + CON dés |

## 4. Points relevés pendant la revue des capacités

Revue faite profil par profil (une passe par famille) et pour les huit peuples, à partir des
textes du DRS, chaque effet étant justifié par la phrase citée dans `tools/revue/*.json`.

* **Effets permanents retenus au niveau 1** : 20 capacités seulement modifient une valeur de
  la feuille (PV, DEF, Init, PC). Tout le reste (bonus aux tests, vision nocturne, bonus
  temporaires, sorts) n'entre pas dans les calculs.
* **Bonus réservés à certaines armes** : « Archer émérite » (PER aux DM à l'arc) et « Doigts
  agiles » (+1 aux DM des dagues et couteaux lancés) sont appliqués arme par arme.
* **Effet facultatif** : forgesort « Grosse tête » permet de compter les PV avec l'INT *à la
  place* de la CON ; c'est une case à cocher, décochée par défaut.
* **Non appliqués, rappelés au joueur** : magicien « Familier » (+2 Init et DEF *lorsque le
  familier est en vue*), substitutions FOR → AGI du voleur et du barde, dés de dommages des
  mains nues du moine. Ces règles restent visibles dans le texte de la capacité.
* **Chevalier** : aucune de ses cinq capacités de rang 1 ne modifie une valeur chiffrée.
* **Sous-choix de rang 1** : seulement deux, comme prévu — humain « Diversité » (six origines)
  et gnome « Don étrange » (une capacité de rang 1 d'ensorceleur).

## 5. Corrections apportées aux sources

* `tools/scrape_drs.py` cherchait le titre « Armes & armures » ; les pages des quatre
  aventuriers titrent « Armes & armures maîtrisées ». Corrigé, les 14 profils sont complets.
* **Demi-elfe** : le livre (p. imprimée 46) précise qu'il « ne possède pas de voie de peuple
  dédiée » et choisit entre la voie de l'humain, de l'elfe sylvain ou de l'elfe haut. Le DRS,
  lui, affiche la voie de l'elfe haut sur sa page : on suit le livre et l'application propose
  les trois voies.
* **Demi-orc** : le brief supposait « +1 FOR, +1 AGI ou CON, -1 CHA ou INT ». Le DRS **et** le
  tableau du livre (p. imprimée 28) donnent « +1 FOR ou CON, -1 CHA ou INT ». C'est cette
  version qui est appliquée.
* **Noms de demi-elfe** : le DRS ne donne aucune liste, seulement la règle de composition
  (« un prénom elfique et un nom de famille humain »). L'application propose donc les prénoms
  des deux peuples elfes et affiche la phrase du DRS.
* **Table des origines de « Diversité »** : elle est dans un tableau HTML du DRS que le
  scraper ne reprend pas dans le texte de la capacité ; elle a été relevée dans la page
  d'origine et figure dans `data/complements.json` (sous-choix), pas dans le texte de règle.
* La coquille de slug `voie-des-illusion` (« Voie des illusion », au singulier) vient du DRS
  et a été conservée telle quelle.

## 6. Feuille de personnage (phase 0)

* La feuille fournie a été ré-enregistrée par Aperçu : `/AcroForm/Fields` liste des copies
  orphelines des 163 champs, alors que les widgets affichés sont les annotations des pages.
  Un remplissage sans réparation **ne s'affiche pas** (vérifié : PDF produit, rendu vide).
  `js/pdf-repair.js` reconstruit `/AcroForm/Fields` à partir des annotations des pages ; le
  remplissage devient visible (vérifié page par page en rendu image).
* 165 widgets pour 163 champs (le champ « Niv » des attaques en a trois).
* Le champ de l'idéal héroïque existe bien : il s'appelle `IDÉAL HÉROÎQUE` (avec un î), d'où
  son absence de la liste brute du brief. Les champs « spécial/portée » s'appellent
  `SPÉCIALPORTÉE`, `SPÉCIALPORTÉE_2` et `SPÉCIALPORTÉE_3`.
* Noms inversés par rapport au visuel dans le bloc des points de vigueur : le petit champ
  marqué MAX s'appelle `PV` et le grand champ `PV MAX` (les deux reçoivent la même valeur au
  niveau 1).
* 13 cases à cocher de la page 2 sont cochées à l'origine : toutes les cases sont remises à
  zéro avant remplissage.
* La carte complète des champs est dans `assets/fields-map.json`, produite par
  `tools/dump_fields.html` puis `tools/build_fields_map.py`.

## 7. Refonte ergonomique du 21 septembre 2026

Passe d'interface demandée par Valentin après sa première utilisation. Le moteur de règles et
les données du livre n'ont pas bougé ; les 24 tests restent au vert.

* **Vouvoiement** partout, textes maison compris. Le brief d'origine (§9) prescrivait le
  tutoiement : décision changée par Valentin le 21 septembre 2026. Un contrôle automatique
  (`tools/check_ton.py`) refuse désormais tout « tu » adressé au joueur.
* **Correction d'extraction** : `creation.livre.langues` contenait, collée en fin de texte, la
  table « Taille et poids du personnage » de la colonne voisine (341 caractères). La borne de
  fin a été corrigée dans `tools/extract_pdf.py` ; le texte passe de 1638 à 1296 caractères.
* **Table des bizarreries** portée de dix à vingt entrées (tirage au d20). Les dix nouvelles
  sont à relire par Valentin, comme les dix premières.
* **Secret intime** : le livre fait lancer un d20 sur chacune des deux tables puis choisir.
  L'application tire maintenant une seule proposition parmi les quarante secrets — c'est une
  simplification d'interface assumée, la règle du livre reste possible à la main.
* **Infobulles du panneau latéral** : seize nouveaux textes maison (`maison.aide`), qui
  expliquent à quoi sert chaque valeur. Ils ne portent volontairement aucune mention « Livre,
  p. XX » : ils ne viennent pas du livre. Les infobulles verbatim (actions type des
  caractéristiques, tags (L)/(A)/(M)/(G), sort, d4°) sont inchangées.
* **Carte des Terres d'Osgild** : Valentin a fourni l'image et a explicitement levé la consigne
  du brief « ne pas embarquer d'illustrations du livre ». Elle est versionnée en
  `images/carte-osgild.jpg`, réduite à 1600 px de large (9,3 Mo → 0,8 Mo) pour que l'écran de
  bienvenue reste rapide à charger. Elle partira donc dans le dépôt public : c'est un choix
  assumé par le commanditaire, au même titre que les textes de règles.
* **Brouillons** : l'insertion de l'écran « sexe » décale la numérotation des écrans. Les
  brouillons enregistrés avant la refonte (version 1) sont migrés automatiquement au
  chargement (`migrer()` dans `js/state.js`) : l'étape est décalée et l'ancien mode « méthode
  rapide », supprimé, bascule sur la série officielle avec des valeurs à replacer.

## 8. Deuxième passe d'ergonomie (21 septembre 2026, soir)

* **Présentation du monde** : le texte maison de l'écran de bienvenue est remplacé par celui
  du livre (p. imprimées 15-16) — présentation de la région, le Mitan, l'ancien empire, le
  traité de Monastir, l'an 325 PM. Nouvelle clé `creation.livre.osgild`.
* **Texte « Rôle »** : deux corrections. Un espace manquait après « Vous ressemble-t-il »
  (le marqueur de début d'extraction était concaténé sans espace), et le paragraphe final sur
  la création de groupe a été retiré : ici, chaque joueur crée son personnage chez lui.
* **Onglet parasite** : « INTRODUCTION » s'invitait dans les textes des pages 14-16 ; ajouté
  à la liste des onglets latéraux filtrés.
* **Cartes de profils et de peuples** : trois par ligne, illustration en tête et en grand.
  Les prompts demandent désormais des images de 1200 × 900 px (paysage 4:3), avec les deux
  sexes côte à côte.
* **Carte d'Osgild** : affichée en entier (`object-fit: contain`), plus rognée.
* **Répartition libre** : le bouton « + » se ferme dès que le point suivant ferait dépasser
  les 7 points ; on ne peut plus être en dépassement.
* **Armes de la feuille** : la feuille officielle n'a que trois lignes. L'équipement de départ
  du livre ne donne jamais plus de trois armes (vérifié sur les quatorze profils, toutes
  options confondues), donc elles y sont reportées automatiquement ; la section « Votre
  personnage a trop d'armes ! » ne s'affiche qu'au-delà, en filet de sécurité.
* **Descriptions** : celle de la famille disparaît de l'écran Profil (seul l'apport chiffré
  reste) ; celles du profil et du peuple sont conservées, elles aident à choisir.

## 9. Barre de progression, musique et capacités lisibles (22 septembre 2026)

Après une vraie partie de test : Taïna a créé Ninquessa (elfe haute magicienne) de bout en
bout sur le site publié. Trois demandes de Valentin, et un défaut trouvé en chemin.

### Les capacités débordaient de leur case

Deux défauts distincts sur la feuille de Ninquessa, pas un seul :

1. **Débordement horizontal.** Sur « Armure de mana », les mots de fin de ligne passaient
   par-dessus le filet doré et mordaient sur la colonne voisine. Cause : pdf-lib coupait les
   lignes lui-même, sur un cadre légèrement plus large que le filet imprimé — les six blocs
   de voies de la page 2 ne sont séparés que de 2,4 pt. Corrigé en coupant les lignes nous-
   mêmes avant de les lui donner, avec 4,5 pt de marge de chaque côté (`MARGE_CHAMP`).
2. **Texte amputé.** La case se terminait par « Ce sort […] » : la règle était coupée au
   milieu. Ce n'était pas un cas isolé — mesuré sur les 140 capacités de rang 1 et 2 du
   livre, **74 ne tiennent pas** dans la case et 33 la dépassent franchement. La case fait
   environ 330 caractères à 4 pt, une taille déjà illisible en jeu.

Agrandir la case est impossible : la mise en page de la feuille officielle est fixe.
**Décision de Valentin : le texte complet part en annexe**, plutôt qu'un résumé maison qui
aurait réécrit des règles de Black Book avec mes mots.

* Le plancher de police des cases de capacités passe de 4 à **6 pt** (`TAILLE_CAPACITE_MIN`).
* On y écrit des **phrases entières** tant qu'elles rentrent, jamais un mot coupé, suivies de
  « (suite en annexe) » dès qu'il manque quelque chose. La flèche « → » a dû être abandonnée :
  la police standard du PDF ne sait pas l'écrire (WinAnsi).
* Nouvelle page annexe **« Les capacités de … »**, placée juste après la page 2 : texte
  intégral du livre à 9,5 pt, avec en bas le rappel des seules mentions employées par le
  personnage (L, A, M, G, sort), pris dans `data/aide.json`.

### Les pages annexes ne coupent plus en silence

L'ancienne page annexe s'arrêtait net (`if (y < 50) return;`) : une histoire un peu longue
disparaissait sans un mot. Un petit rédacteur (`redacteur()`) tient désormais la position et
ouvre une page de plus quand le bas est atteint. Vérifié avec une histoire de 26 paragraphes :
8 pages, dernier paragraphe intact.

### Barre de progression

Dix étapes nommées sous le bandeau. **Purement indicative** (choix de Valentin) : elle ne se
clique pas. Cachée sur l'accueil ; sous 46 rem, les noms cèdent la place à une ligne
« Étape 5 sur 10 — Caractéristiques » au-dessus de dix pastilles.

Elle répond à une question posée pendant la partie de test : « mes caractéristiques sont à
zéro, je comprends pas ». Voir plus loin que l'étape en cours suffit à comprendre.

### Musique

Le mp3 fourni faisait **291 Mo** (2 h 01 en 320 kb/s) : GitHub refuse au-delà de 100 Mo. Ré-
encodé en 80 kb/s → `assets/musique.mp3`, 69 Mo, servi en streaming. L'original reste en local
et est exclu par `.gitignore`.

Vignette en bas à droite, **éteinte au démarrage** : aucun navigateur n'autorise le son avant
un geste du joueur. Le choix est retenu (`localStorage`), et s'il avait la musique allumée, on
la reprend à son premier clic dans la page, quel qu'il soit.

### La feuille de Ninquessa

Refaite à l'identique avec les corrections. L'état du personnage a été reconstitué depuis son
PDF (toutes les valeurs y étaient lisibles) et son portrait extrait du fichier ; les valeurs
calculées correspondent exactement à sa feuille d'origine : PV 7, DEF 11, Init. 11, PC 3,
PM 4, DR 3d6, attaques 0 / +2 / +2, caractéristiques +1 +1 -1 +1 +1 +3 +1. Elle avait utilisé
la répartition libre (7 points pile).

## 10. Répartition libre seule, voies expliquées, boutons (22 septembre 2026)

Trois retouches demandées par Valentin après son propre passage sur l'application.

* **Caractéristiques** : le mode « série officielle à répartir » disparaît, il ne reste que
  la répartition libre, jugée plus claire. Les trois séries du livre restent dans
  `rules.SERIES` — c'est sur elles qu'est calibré le barème des 7 points, et un test le
  vérifie — mais elles ne sont plus proposées. Les champs `caracs.methode` et `caracs.serie`
  disparaissent de l'état.
* **Brouillons** : `VERSION_ETAT` passe à 3 et `migrer()` enchaîne désormais les migrations
  une par une (v1 → v2 → v3) au lieu de ne traiter qu'un saut. Le passage v2 → v3 ne perd
  rien : les deux modes écrivaient dans `caracs.base`, et une série officielle déjà placée
  coûte exactement 7 points, donc elle reste valide en répartition libre. Trois tests
  couvrent ces migrations (27 tests au total).
* **Voies** : l'infobulle « ? » à côté de « Les cinq voies de … » est remplacée par un
  paragraphe maison qui explique ce qu'est une voie, combien on en choisit au niveau 1, ce
  qui se passe en montant de niveau, et invite à jouer collectif. Nouvelle clé
  `maison.ecrans.voies`. L'infobulle verbatim du livre (`aide.termes.VOIES`) reste dans les
  données, simplement plus affichée là.
* **Récapitulatif** : « Copier le texte » devient « Copier le prompt », et « Choisir mon
  image… » devient « Insérer l'image de mon personnage ». Les deux passent en
  `bouton-secondaire` (contour simple), pour que « Télécharger la feuille PDF » reste le seul
  bouton plein de l'écran — la seule action qui produise quelque chose.
* **Page de tests** : ses scripts sont versionnés comme ceux de l'application. Sans cela, le
  navigateur servait l'ancienne version des tests depuis son cache.
