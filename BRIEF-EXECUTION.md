# Brief d'exécution — Créateur de personnage COF2 (Chroniques Oubliées Fantasy 2)

> Ce document est destiné à un agent d'exécution qui n'a pas accès à la conversation de conception. Il contient tout le contexte, toutes les décisions prises avec Valentin (le commanditaire) et les données déjà relevées. Lis-le en entier avant d'écrire la moindre ligne de code. Réponds et écris toujours en français.

---

## 0. Ta mission en une phrase

Construire, dans le dossier `/Users/valentingerard/Claude_code/app_jdr`, une application web statique (HTML + CSS + JS sans étape de build) qui guide un joueur, pas à pas et dans l'ambiance du jeu, pour créer un personnage de niveau 1 de Chroniques Oubliées Fantasy 2, puis lui fait télécharger la feuille de personnage officielle (PDF éditable) remplie automatiquement, avec une page annexe (histoire + portrait) et un prompt d'image à coller dans ChatGPT.

## 1. Qui commande et pour qui

- **Valentin** : meneur de jeu (MJ) débutant, pas développeur. Il possède légalement le livre de règles (PDF filigrané à son nom). Il relira les textes « maison » et générera lui-même les images.
- **Les joueurs** : débutants en jeu de rôle, chacun chez soi **sur ordinateur** (pas de version mobile pour l'instant). Ils téléchargent leur PDF et l'envoient à Valentin à la main. Rien n'est stocké côté serveur.
- **Ton souhaité** : épique avec une touche d'humour. L'humour est bienvenu dans les bizarreries et les petites notes ; le prologue et les guides restent immersifs. Valentin aime l'absurde (un chevalier d'1,50 m, un barbare de 87 ans, un héros sans sous-vêtements).
- **Règle absolue sur les textes** : tout ce qui est règle du jeu (descriptions de profils, peuples, capacités, tables, formules, explications des caractéristiques) est **repris mot pour mot** du livre ou du DRS officiel. On n'invente rien côté règles. Les seuls textes écrits par nous sont listés au §9 (prologue, guides, notes, bizarreries, avertissements).
- **Pas de pavés de texte** : les explications sont des infobulles courtes au survol d'une icône « ? » ; les longs extraits du livre sont repliés derrière « Lire l'extrait du livre ».

## 2. Environnement vérifié (le 20 septembre 2026)

- Dossier de travail : `/Users/valentingerard/Claude_code/app_jdr` (pas encore un dépôt git).
- Il contient uniquement :
  - `CBHS_06_Chroniques_Oubliees_2_web_v2.pdf` : le livre de règles, 358 pages, 32 Mo, texte extractible, chiffré en lecture seule (copie et impression autorisées). Filigrane « VALENTIN GERARD - fortunevgaming@gmail.com - … » sur chaque page : **à supprimer de tout texte extrait**.
  - `941_cof2_a12_feuille_de_personnage_editable_v0.pdf` : feuille de personnage officielle, 2 pages, formulaire AcroForm, ~159 noms de champs (253 widgets texte `/Tx`, 70 widgets bouton `/Btn`). Producteur « macOS Quartz PDFContext » : le fichier a été ré-enregistré par Aperçu, chaque nom de champ apparaît deux fois dans le binaire (ancien + nouvel objet). À tester avec pdf-lib en tout premier (phase 0).
- Outils disponibles : `python3` (sans pypdf, ni reportlab, ni pymupdf), `pdftotext`, `pdftoppm`, `pdfinfo` (poppler), `git` 2.50 (aucune identité globale configurée), `gh` (installé mais **non connecté**), `curl`.
- **Node absent** : ni dans le PATH, ni nvm, ni Volta, ni fnm. Ne pas en dépendre. N'installe rien sans demander.
- Pagination du livre : la page PDF N correspond à la page imprimée N+1 (la couverture a été retirée). Les numéros ci-dessous sont des **pages PDF** sauf mention « p. imprimée ».
- Commande d'extraction de référence (mode flux, meilleur pour le texte courant) et mode layout (meilleur pour les tableaux) :

```bash
cd /Users/valentingerard/Claude_code/app_jdr
pdftotext -f 19 -l 37 CBHS_06_Chroniques_Oubliees_2_web_v2.pdf - | grep -v 'VALENTIN GERARD'
pdftotext -layout -f 182 -l 188 CBHS_06_Chroniques_Oubliees_2_web_v2.pdf - | grep -v 'VALENTIN GERARD'
```

Pour rendre une page en image (pointage visuel) : `pdftoppm -f 79 -l 79 -r 110 -png CBHS_06_Chroniques_Oubliees_2_web_v2.pdf <scratchpad>/p79`.

## 3. Sources de données

### 3.1 Le DRS officiel (source principale des profils, peuples et voie du mage)

Black Book Éditions publie gratuitement le Document de Référence du Système : **https://drs.chroniques-oubliees.fr**. Site Next.js rendu côté serveur : le HTML récupéré par `curl -sL -A "Mozilla/5.0"` contient le contenu complet (vérifié).

- Profils : `https://drs.chroniques-oubliees.fr/fantasy/profils/<slug>` avec slugs `arquebusier barde rodeur voleur barbare chevalier guerrier ensorceleur forgesort magicien sorcier druide moine pretre`.
  Chaque page contient : description courte, « Points de vigueur / dé de récupération / points de chance », « Armes & armures », « Équipement de départ », et les **5 voies avec leurs 5 capacités en texte intégral**.
- Peuples : `https://drs.chroniques-oubliees.fr/fantasy/peuples/<slug>` avec slugs `demi-elfe demi-orc elfe-haut elfe-sylvain gnome halfelin humain nain` et en plus `mage` (la voie du mage, qui remplace la voie de peuple pour les mages).
  Chaque page contient : description courte, noms typiques (masculin / féminin), repères (âge de départ, espérance de vie, taille, poids, traits), modificateur de caractéristiques, voie du peuple en 5 rangs.
- Le DRS ne contient **pas** : les paragraphes « Dans les Terres d'Osgild » et « Interpréter un … » (on n'en veut pas), le chapitre de création, les tables d'armes et d'armures, les tables d'idéaux/travers/secrets, les langues.
- Balisage observé (page barbare) : titre de capacité dans `<div class="font-semibold font-mendl-sans">1<!-- --> · <!-- -->Argument de taille</div>`, texte dans le `<div class="prose leading-snug px-5"><p>…</p></div>` qui suit ; nom de voie dans un cadre décoratif `<div>Voie de la brute</div>` ; sections « Armes &amp; armures » et « Équipement de départ » en titres. Les tags d'action (L)/(A)/(G) et les sorts `*` sont présents : repère précisément comment ils sont balisés avant d'écrire le parseur (peut-être dans un `<div class="flex space-x-1">` à côté du titre).
- **Ne réutilise aucun fichier graphique du DRS** (cadres SVG, polices, images) : on fait nos propres ornements en CSS/SVG.

### 3.2 Le PDF du livre (complément)

| Contenu | Pages PDF | Usage |
|---|---|---|
| Chapitre 1 « Création du personnage » : les 15 étapes, texte « Rôle », présentation des 4 familles et des 14 profils (une phrase chacun), liste des 8 peuples (une phrase chacun), 7 caractéristiques avec « Actions type », échelle des valeurs, 3 séries, méthode rapide, PV/DR/PC/PM/Init/Équipement/DEF/Attaques/DM, touche finale (idéaux, travers, secrets, âge, taille/poids, langues, talent secondaire) | 19–37 | textes des étapes, infobulles, tables |
| Progression & niveaux (définition de `d4°`, dés évolutifs) | 37–43 | infobulle `d4°` |
| Peuples | 43–59 | vérification croisée du DRS uniquement |
| Voie du mage | 59–60 | vérification croisée |
| Profils (chapitres 4 à 7) | 60–127 | vérification croisée du DRS |
| Équipement : monnaie, armes de contact, armes à distance, armures | 180–189 | `armes.json`, `armures.json` |
| Règles de base / combat : définition des actions (L) limitée, (A) attaque, (M) mouvement, (G) gratuite | 197–226 | infobulles des tags |
| Personnages prétirés | 347–357 | **fixtures de tests uniquement** |

### 3.3 Normalisation du texte extrait (fonction unique `clean()`)

- U+2011 (tiret insécable, très fréquent) → `-` ; conserver les vrais tirets des mots composés (« demi-elfe »).
- Points de conduite après les titres (rendus en U+FFFD ou en longues suites) → supprimer.
- Puces Wingdings (`\x91`, U+F074) → `•`.
- Supprimer : lignes de filigrane « VALENTIN GERARD … », `PAGE nn PARTIE I`, onglets latéraux (`INTRO`, `Création du personnage`, `Famille des combattants`, `Peuples`, `Équipement`, chiffres isolés de la frise).
- Césures : recoller `mot‑\nsuite` seulement si le tiret est en fin de ligne **et** que le mot recollé existe ailleurs dans le texte.
- Conserver `d4°`, `’`, `« »`, `…`, `œ`, `É` (tous encodables en WinAnsi pour le PDF).
- En mode flux, les deux colonnes du livre s'entremêlent parfois (ex. « Murmures dans le vent » page 96 est coupé par d'autres capacités). C'est pour ça que le DRS est la source des capacités ; le PDF ne sert qu'à vérifier.

## 4. Règles du jeu à implémenter (relevées dans le livre, p. imprimées 20–37)

### 4.1 Les 15 étapes officielles
1 Rôle · 2 Profil · 3 Peuple · 4 Caractéristiques · 5 Voies et capacités · 6 PV · 7 Dé de récupération · 8 Points de chance · 9 Points de mana · 10 Initiative · 11 Équipement · 12 Défense · 13 Valeurs d'attaque · 14 Dommages · 15 Touche finale.

### 4.2 Familles et profils
- **Aventuriers** (4 PV/niveau, DR d8, **+1 PC**) : Arquebusier [AGI, INT, CON], Barde [CHA, AGI, VOL], Rôdeur [AGI, PER, CON], Voleur [AGI, INT, CHA].
- **Combattants** (5 PV, d10) : Barbare [FOR, CON, AGI], Chevalier [FOR, CHA, CON], Guerrier [FOR, CON, AGI].
- **Mages** (3 PV, d6, **+1 capacité de rang 2** à la création) : Ensorceleur [CHA, VOL, AGI], Forgesort [INT, VOL, CON], Magicien [INT, VOL, AGI], Sorcier [INT, VOL, CON].
- **Mystiques** (4 PV, d8, **+1 DR**) : Druide [PER, VOL, CON ou AGI], Moine [VOL, PER, AGI], Prêtre [CHA, VOL, FOR].
- Phrases de résumé (p. imprimées 24-25), à reprendre telles quelles sur les cartes : « Arquebusier : un spécialiste de l'usage des armes à feu et des explosifs, souvent mercenaire », « Barde : un artiste polyvalent capable d'utiliser la rapière autant que la magie », « Rôdeur : un spécialiste de la survie en milieu naturel, ami des animaux et archer hors pair », « Voleur : un filou agile et sournois taillé pour l'infiltration ou la criminalité », « Barbare : un guerrier sauvage issu d'une culture primitive capable d'entrer en rage », « Chevalier : un héros en armure rutilante qui chevauche une monture magique », « Guerrier : un spécialiste du combat au corps à corps, un soldat d'élite », « Ensorceleur : un magicien charismatique qui emploie une magie subtile », « Forgesort : un magicien et artisan qui crée des élixirs ou inscrit des runes », « Magicien : un intellectuel qui pratique une magie académique efficace et directe », « Sorcier : un adepte de la magie noire qui contrôle les morts et les démons », « Druide : un protecteur de la nature et un magicien des forces naturelles », « Moine : un ascète qui endurcit son corps, son esprit et maîtrise le combat à mains nues », « Prêtre : le bras armé d'une religion capable de soigner ceux qui en ont besoin comme d'occire les infidèles ». Re-vérifie l'orthographe exacte dans le PDF (p. 23-25).

### 4.3 Peuples
Phrases du livre (p. imprimée 25) : Demi-elfe « un être entre deux cultures, souvent d'une grande sensibilité (profils typiques : barde, prêtre) » ; Demi-orc « une force de la nature en butte aux préjugés (barbare, guerrier) » ; Elfe haut « un peuple d'intellectuels et d'artistes (barde, magicien, ensorceleur) » ; Elfe sylvain « le peuple de la forêt, vif et en alerte (druide, rôdeur) » ; Gnome « un petit peuple passé maître dans les sciences (forgesort, arquebusier) » ; Halfelin « un petit peuple discret, mais plein d'astuce et de courage (voleur, rôdeur) » ; Humain « le peuple le plus polyvalent (tous) » ; Nain « un peuple bourru, idéaliste et résistant (guerrier, prêtre) ».

Modificateurs de caractéristiques (à prendre **dans le DRS**, section « Caractéristiques » de chaque peuple, et à recouper avec le tableau p. imprimée 28) : Gnome « +1 en INT ou PER, -1 en FOR » ; Halfelin « +1 AGI ou VOL, -1 FOR » ; Nain « +1 en CON ou VOL, -1 en AGI » ; Elfe haut « +1 INT ou CHA, -1 FOR » ; Elfe sylvain « +1 AGI ou PER, -1 FOR » ; Humain « +1 à la valeur d'une de ses deux plus faibles caractéristiques au choix » ; Demi-elfe et Demi-orc : à relever (le tableau extrait est illisible : demi-elfe a deux +1 au choix et un -1 au choix, demi-orc a +1 FOR, +1 AGI ou CON et -1 CHA ou INT — **vérifier**).

Âge et espérance de vie (p. imprimée 36) : Demi-elfe 20+/150 · Demi-orc 15+/60 · Elfe haut 80+/450 · Elfe sylvain 50+/350 · Gnome 40+/250 · Humain 18+/100 · Nain 40+/250 · Halfelin 20+/150.
Taille et poids (p. imprimée 37) : Demi-elfe 1,50–1,90 m, 40–80 kg · Demi-orc 1,70–2,10 m, 70–150 kg · Elfe haut 1,50–1,80 m, 40–70 kg · Elfe sylvain 1,40–1,70 m, 30–60 kg · Gnome 1–1,20 m, 30–50 kg · Halfelin 80 cm–1 m, 20–30 kg · Humain 1,50–2 m, 40–120 kg · Nain 1,15–1,35 m, 50–100 kg.

Sous-choix connus au rang 1 des voies de peuple :
- Humain, « Diversité » : +3 à deux domaines selon une origine « choisissez ou lancez un d6 » : 1 Montagnard (escalade et résistance au froid), 2 Citadin (commerce et résistance aux maladies), 3 Campagnard (météorologie et équitation), 4 Riverain (natation et navigation), 5 Sauvage (chasser et pister), 6 Nomade (orientation et résistance à la chaleur ou au froid). Donne aussi **+1 PC**.
- Gnome, « Don étrange » : le gnome choisit une capacité de rang 1 d'ensorceleur (si c'est un sort, il compte pour les PM). Charger les données de l'ensorceleur pour proposer la liste.
- Vérifie les 8 autres rangs 1 (Impressionnant, Lumière intérieure, Lumière des étoiles, Petite taille, Habitant des tunnels, et le demi-elfe) pour d'éventuels autres sous-choix.

### 4.4 Caractéristiques
- 7 caractéristiques : AGI, CON, FOR, PER (physiques), CHA, INT, VOL (mentales). Ordre sur la feuille : AGI, CON, FOR, PER, CHA, INT, VOL.
- Séries officielles : **Polyvalent** +2, +2, +2, +1, +1, +0, -1 · **Expert** +3, +2, +1, +1, +0, +0, -1 · **Spécialiste** +4, +2, +1, +0, +0, -1, -1.
- Méthode rapide débutant : série expert, les trois meilleures valeurs sur les 3 caracs clés du profil, puis le +1 et le -1 au choix, le reste à 0.
- Magie : au moins +1 dans la carac de magie du profil (INT magicien/forgesort/sorcier, CHA ensorceleur/barde/prêtre, PER druide).
- Puis modificateur de peuple.
- Échelle (p. imprimée 27) : -3 Catastrophique · -2 Très faible · -1 Faible, sous la moyenne pour un humain · 0 Moyen pour un humain · +1 Supérieur à la moyenne pour un humain · +2 Bon · +3 Très bon · +4 Excellent, maximum pour un humain à la création · +5 Extraordinaire, maximum pour un héros non humain à la création.
- « Actions type » de chaque carac (p. imprimées 26-27) → infobulles ; les reprendre verbatim (ex. FOR : « gagner un bras de fer, soulever, tordre, lancer un objet lourd, immobiliser un adversaire. Attaquer au contact et infliger des blessures »). Un personnage avec INT négative ne sait ni lire ni écrire.

### 4.5 Voies et capacités
- 2 voies parmi les 5 du profil → capacité de rang 1 de chacune ; + la voie de peuple (rang 1 automatique).
- Mages : en plus, **soit** une capacité de rang 2 dans l'une des deux voies choisies, **soit** le rang 2 de la voie du mage. Les mages peuvent remplacer leur voie de peuple par la **voie du mage** ; dans ce cas ils bénéficient quand même de l'effet du rang 1 de leur voie de peuple (mais ne pourront jamais monter cette voie).
- Notation des capacités dans le livre : `N. Titre (L|A|M|G)* :` — (L) action limitée, (A) action d'attaque, (M) action de mouvement, (G) action gratuite ; `*` = sort (compte pour les PM). Exemple : « 1. Cri de guerre (G) : », « 1. Murmures dans le vent (G)* : ».
- `d4°` = dé évolutif (d4 au niveau 1-5, d6 dès le niveau 6, puis d8, d10, d12 tous les 3 niveaux).

### 4.6 Valeurs dérivées (niveau 1)
- **PV** = (2 × PV de la famille) + CON, + effets de capacités. Aventuriers 8+CON, Combattants 10+CON, Mages 6+CON, Mystiques 8+CON.
- **DR** = 2 + CON dés (mystiques : 3 + CON), minimum 0 ; type d8 / d10 / d6 / d8 selon famille.
- **PC** = 2 + CHA (+1 aventuriers, +1 humain via Diversité).
- **PM** = VOL + nombre de sorts connus, seulement si au moins un sort ; sinon pas de PM.
- **Init** = 10 + PER + effets.
- **DEF** = 10 + AGI (plafonnée par l'AGI max de l'armure) + armure + bouclier + effets.
- **Attaques** : contact = 1 + FOR ; distance = 1 + AGI ; magique = 1 + VOL.
- **DM** : armes de contact = dé + FOR (sauf stylet) ; armes à distance = dé seul.

Effets de rang 1 déjà repérés (à compléter par la revue des 110 capacités de rang 1 et des rangs 2 des voies de mages) : Réflexes éclair (barbare, pourfendeur) +3 Init, +1 DEF · Vigueur (barbare, pagne) +1 PV · Argument de taille (barbare, brute) +FOR aux PV max · Proche de la nature (barbare, primitif) +1 PV · Petite taille (halfelin) +1 DEF · Diversité (humain) +1 PC · Murmures dans le vent (ensorceleur, air) +1 Init, +1 DEF · Vêtements sacrés (prêtre) +2 DEF sans armure · Runes de défense (forgesort) +2 DEF · Robustesse +3 PV (rang + 2). Les sorts à effet temporaire (Armure de mana…) n'ont pas d'effet permanent.

### 4.7 Équipement
Sac d'aventurier (p. imprimée 31) : une couverture, une torche, un briquet à silex, une outre, une gamelle, une bourse de **2d6 pa**.

Équipement de départ par profil (relevé dans le PDF ; vérifier dans le DRS) :
- Arquebusier : Pétoire (DM 1d10, portée 20 m), épée longue (DM 1d8), dague (DM 1d4), cuir renforcé (DEF +3).
- Barde : Rapière (DM 1d6, Crit 19-20), dague (DM 1d4), instrument de musique, armure de cuir (DEF +2).
- Rôdeur : Épée longue (DM 1d8), arc court et carquois (DM 1d6, portée 30 m) ou une autre arme de contact (épée courte, hachette, lance), dague (DM 1d4), armure de cuir renforcé (DEF +3).
- Voleur : Rapière (DM 1d6, Crit 19-20), 5 dagues (DM 1d4, portée 5 m), outils de crochetage, armure de cuir (DEF +2), une corde de 10 m.
- Barbare : Hache à deux mains (DM 2d6) ou Arme à une main (d8) et bouclier (+2 en DEF), 2 javelots (DM 1d6, portée 20 m), dague (DM 1d4), armure de cuir (DEF +2).
- Chevalier : Épée longue (DM 1d8), grand bouclier (DEF +2), lance de cavalerie (DM 2d6), dague (DM 1d4), cotte de mailles (DEF +5).
- Guerrier : Épée longue (DM 1d8), épée ou hache à deux mains (DM 2d6), une dague ou une hachette de lancer, un grand bouclier (DEF +2) et chemise de mailles (DEF +4).
- Ensorceleur : Bâton ferré (DM 1d6), dague (DM d4) ou autre arme maîtrisée au choix.
- Forgesort : Dague (DM 1d4), bâton ferré (DM 1d6), marteau (DM 1d6).
- Magicien : Bâton ferré (DM 1d6), dague (DM 1d4), grimoire de sorts.
- Sorcier : Bâton ferré (DM 1d6), dague (DM 1d4), grimoire de sorts ou parchemins anciens.
- Druide : Bâton noueux (DM 1d6) ou épieu (DM 1d6 ou 1d10), dague (DM 1d4), arc court (DM 1d6, portée 30 m), armure de cuir (DEF +2).
- Moine : Bâton (DM 1d6).
- Prêtre : Masse, marteau de guerre (DM 1d6) ou bâton ferré (DM 1d6, à deux mains), petit bouclier (DEF +1), chemise de mailles (DEF +4).

Armes de contact (p. PDF 183) — `Nom | DM | Prix | Type | Notes` :
Mains nues 1d3 – Contondants (DM temporaires) · Bâton 1d4 – Contondants (deux mains, DM temporaires possibles) · Bâton ferré 1d6 2 pa Contondants (deux mains) · Dague 1d4 3 pa Perforants (légère) · Épée à deux mains 2d6 10 pa Tranchants (deux mains) · Épée bâtarde 1d8/1d12 9 pa Tranchants (une ou deux mains) · Épée courte 1d6 5 pa Perforants (légère) · Épée longue 1d8 6 pa Tranchants · Épieu 1d6/1d10 4 pa Perforants (une ou deux mains) · Fléau 1d6 5 pa Contondants · Fléau à deux mains 1d10 8 pa Contondants (deux mains, relance 1 attaque ratée/combat) · Gourdin (1d4) 1 pa Contondants (DM temporaires possibles) · Hache 1d8 6 pa Tranchants · Hache à deux mains 2d6 10 pa Tranchants (deux mains) · Lance 1d6/1d10 4 pa Perforants (une ou deux mains) · Lance de cavalerie 2d6 8 pa Perforants (dé malus au contact) · Marteau 1d6 4 pa Contondants · Masse 1d6 4 pa Contondants · Pique 1d10 5 pa Perforants (deux mains, spécial) · Rapière 1d6 6 pa Perforants (légère, critique 19-20) · Stylet 1d3 1 pa Perforants (légère ; **pas de FOR aux DM**, 1d6+AGI si surpris) · Vivelame 1d10 15 pa Tranchants (deux mains, critique 19-20).

Armes à distance (p. PDF 185) — `Nom | Portée | DM | Prix | Type | Notes` :
Arbalète de poing 10 m 1d6 8 pa · Arbalète légère 30 m 2d4 10 pa (deux mains, recharge : action de mouvement) · Arbalète lourde 60 m 2d6 15 pa (deux mains, recharge : action limitée) · Arc court 30 m 1d6 4 pa (deux mains) · Arc long 50 m 1d8 8 pa (deux mains, FOR +1 minimum) · Couteaux de lancer 10 m 1d4 3 pa · Dague 5 m 1d4 3 pa · Fronde 20 m 1d4 – Contondants · Hachette 5 m 1d6 2 pa Tranchants · Javelot 20 m 1d6 1 pa · Lance 10 m 1d6 3 pa · Lance-pierre 10 m 1d3 1 pc Contondants · Pétoire 20 m 1d10 50 pa (arme à poudre, recharge : action limitée) · Mousquet 50 m 2d6 100 pa (arme à poudre, deux mains). Type Perforants sauf mention.

Armures (p. PDF 188) — `Nom | DEF | AGI max | Prix` :
Tissus matelassés, fourrures +1 / +7 / 2 pa · Cuir simple +2 / +6 / 4 pa · Cuir renforcé, broigne +3 / +5 / 8 pa · Chemise de mailles +4 / +4 / 15 pa · Cotte de mailles +5 / +3 / 25 pa · Armure de plaques +6 / +2 / 60 pa · Plaque complète +7 / +1 / 200 pa (chevalier seulement, rang 3 noblesse) · Petit bouclier +1 / 2 pa · Grand bouclier +2 / 4 pa. Règle : « peut porter jusqu'à X » = toutes les armures de DEF ≤ X.

### 4.8 Touche finale (p. imprimées 33–37)
**Idéaux héroïques (d20)** : 1 Abnégation · 2 Clémence · 3 Compassion · 4 Courage · 5 Égalité · 6 Éducation · 7 Fraternité · 8 Frugalité · 9 Générosité · 10 Honnêteté · 11 Honneur · 12 Humilité · 13 Justice · 14 Liberté · 15 Loyauté · 16 Pacifisme · 17 Protection · 18 Sens du sacrifice · 19 Solidarité · 20 Vérité.
**Travers (d20)** : 1 Alcoolique · 2 Couard · 3 Crédule · 4 Cupide · 5 Colérique · 6 Distrait · 7 Dragueur · 8 Fanfaron · 9 Gourmand · 10 Grossier · 11 Impatient · 12 Indécis · 13 Menteur · 14 Orgueilleux · 15 Paranoïaque · 16 Paresseux · 17 Phobie (au choix) · 18 Timide · 19 Violent · 20 Voleur.
**Secrets intimes, table 1 (d20)** : 1 Je ne suis pas celui que je prétends être. · 2 Je recherche un membre de ma famille. · 3 Je suis victime d'une malédiction. · 4 Je suis recherché pour un crime (mais l'ai-je commis ?). · 5 J'ai perdu la mémoire d'une période de ma vie. · 6 J'ai une phobie que j'ai honte d'avouer. · 7 J'ai une addiction qui me cause du tort. · 8 Il y a une chose en particulier qui me fait sortir de mes gonds. · 9 Un membre de ma propre famille est devenu un ennemi mortel. · 10 Je mène une double vie. · 11 Je suis déjà mort une fois. · 12 J'ai d'énormes dettes. · 13 Ceci n'est pas mon corps (ou deux esprits cohabitent dans mon corps). · 14 J'ai brisé un serment sacré. · 15 Je possède un objet qui ne doit pas tomber entre de mauvaises mains. · 16 Je porte un deuil terrible. · 17 J'ai fui une amante ou un amant puissant (socialement). · 18 Un terrible cauchemar me hante chaque nuit (est-ce que je m'en souviens ?). · 19 Je n'ai pas réussi à empêcher un grand mal et je porte ce fardeau. · 20 Je fais partie d'une organisation secrète (ou je la fuis).
**Secrets intimes, table 2 (d20)** : 1 Toute ma famille est décédée ou m'a renié, mais j'ignore pourquoi. · 2 J'ai été recruté pour surveiller/protéger/espionner un autre membre du groupe. · 3 On m'a prédit que je causerai une terrible catastrophe. · 4 Je suis porteur d'une marque de naissance (j'en ignore l'origine et la signification). · 5 Mon enfant/frère/sœur/amour a disparu sans explication. · 6 Je possède un objet qui est un héritage familial et j'y tiens comme à ma vie. · 7 J'ai passé un pacte secret avec un démon ou une entité supérieure. · 8 J'ai été trahi et cela a bouleversé ma vie. · 9 J'ai un handicap, mais je le surmonte à tout prix. · 10 Je suis célèbre pour une histoire que je préfère oublier… · 11 Je veux devenir célèbre pour gagner le cœur de quelqu'un. · 12 Je veux prouver à mon père/ma mère que je vaux mieux que ce qu'il croit. · 13 J'ai besoin de beaucoup d'argent pour une bonne cause. · 14 J'ai un objectif affiché, mais ce n'est pas celui que je cherche à atteindre. · 15 Je veux devenir puissant pour abattre un tyran/une créature. · 16 J'ai fait quelque chose d'horrible et je tente de me racheter. · 17 Je sais comment je vais mourir, je l'ai vu. · 18 Je n'ai aucun secret ou originalité, alors je m'en invente. · 19 Je suis le parfait compagnon, mais un jour tous devront ployer le genou devant moi. · 20 Je viens d'un autre monde et tout ce qui m'entoure me semble étrange.
Règle du livre : lancer un d20 sur chaque table et choisir l'un des deux secrets.
**Langues** : chaque personnage parle la langue officielle de la région (Commun) + la langue de son peuple ; INT +0 déchiffre sa langue maternelle avec hésitation ; INT négative ne sait pas lire ; INT -2 ne parle que la langue de son peuple ; INT positive : une langue supplémentaire par point. Liste : Commun (humains, halfelins) · Sylvestre (elfes, fées, dryades, sylvaniens) · Runique (gnomes, nains, géants, élémentaires de terre) · Noir parlé (orcs et goblinoïdes, trolls, ogres) · Draconique (dragons, kobolds, hommes-lézards) · Abyssal (démons, élémentaires de feu) · Célestien (anges, élémentaires d'air) · Argotien (voleurs ; compte pour deux langues si le profil n'est ni voleur ni barde) · Profond (créatures souterraines) · Aquarien (créatures sous-marines).
**Questions de description** (p. imprimée 34, verbatim) : « Votre personnage est-il grand ou petit ? Maigre ou gros ? De quelle couleur sont ses cheveux, ses yeux et sa peau ? A-t-il des signes distinctifs (tatouages, cicatrices, etc.) ? Quel est son caractère ? Est-il plutôt honnête ? Solitaire ? Timide ? Curieux ? » et « D'où vient-il ? Qu'a-t-il fait durant sa jeunesse ? Quel événement l'a poussé à quitter son foyer ? Quel est son but (devenir riche, puissant, célèbre, rendre justice, servir sa nation, répandre ses idées, percer des mystères, réparer une humiliation…) ? »

## 5. Décisions prises avec Valentin (non négociables sans lui)

1. Ordinateur uniquement. Pas de barre de progression. Accueil avec « Nouveau personnage » et « Reprendre » seulement (pas d'import/export de fichier).
2. Aucun stockage serveur ; brouillon dans `localStorage` pour reprendre.
3. Feuille PDF : **seulement les voies acquises** (2 voies de profil + voie de peuple ou du mage ; rang 2 supplémentaire des mages), texte intégral du rang en petite police. Pas d'annexe de capacités.
4. Caractéristiques : deux modes. **A** règle officielle (série + répartition, méthode rapide proposée en premier). **B** répartition libre « comme dans un jeu vidéo » : budget de **7 points**, valeurs entre -1 et +4, coût croissant `-1 → -1, 0 → 0, +1 → 1, +2 → 2, +3 → 4, +4 → 6` (les trois séries officielles coûtent exactement 7 ; Valentin a validé « on garde le nombre d'un perso niveau 1 »). Aucune autre contrainte, mais un avertissement permanent avec exemple (voir §9) et des alertes dynamiques (§8).
5. Descriptions de profils et de peuples : **le court paragraphe descriptif seulement** (celui du DRS). Ni lore d'Osgild ni « Interpréter un … ».
6. Aléatoire aux dés virtuels animés : bourse 2d6 pa ; idéal d20 ; travers d20 ; secrets 2×d20 (choisir un) ; **bizarrerie d10** (table maison §9) ; taille et poids uniformes et indépendants dans les bornes du peuple ; nom tiré dans les noms typiques du peuple (Masculin / Féminin / Au hasard, ou saisie libre). **Les 4 traits (idéal, travers, secret, bizarrerie) sont obligatoires** : relançables ou saisis à la main, jamais vides.
7. **Âge** : champ libre (âge de départ du peuple proposé), plus un bouton de dé optionnel qui tire entre l'âge de départ et l'espérance de vie complète.
8. Équipement : uniquement l'équipement de départ du profil (avec ses choix « X ou Y ») + sac d'aventurier + champ libre « objet négocié avec le MJ » avec la note du §9. Pas de boutique. Armes à poudre incluses pour l'arquebusier.
9. Background : écran « Histoire » avec un guide (§9) qui demande de **justifier par son histoire** l'idéal, le travers, le secret et la bizarrerie ; limite d'une demi-page (compteur, ~1800 caractères) ; va dans une **page annexe** ajoutée au PDF.
10. **Portrait** : au récapitulatif, le joueur copie le prompt d'image (pré-rempli à partir de tous ses choix, **modifiable**, avec une note l'invitant à le personnaliser), génère l'image dans ChatGPT, revient (brouillon conservé) et **téléverse son image** ; elle est placée sur la page annexe à côté de l'histoire.
11. Visuels des cartes : 14 profils + 8 peuples générés par Valentin avec ChatGPT (style des ouvrages COF, **personnage entier de la tête aux pieds**) à partir de `PROMPTS-IMAGES.md`. Visuel de secours si le fichier manque.
12. Ambiance visuelle **claire, façon parchemin** : fond crème, cadres et ornements or-brun comme la feuille de personnage, titres en serif. Ornements faits maison.
13. Textes maison : ton épique avec une touche d'humour ; jamais plus de deux courts paragraphes. Prologue situé dans **les Terres d'Osgild** sans entrer dans le lore.
14. Pas de section « C'est quoi le jeu de rôle ? ». Explications en **infobulles « ? »** courtes reprises du livre.
15. Hébergement : **GitHub Pages**. Valentin a un compte GitHub (nom d'utilisateur à lui demander). Site en `noindex`, aucun lien public. Il sait que le dépôt gratuit sera public et que les textes BBE y seront ; il a tranché.
16. Niveau 1 uniquement ; pas de profils hybrides ni de voies de prestige.
17. Les personnages prétirés du livre ne servent qu'aux tests automatisés ; ils n'apparaissent pas dans l'app.
18. Errata : le moteur suit le **texte des règles**, pas les fiches imprimées (Lhagva : PV 12 par la règle, 15 sur sa fiche).

## 6. Architecture

Site statique sans build. Test local : `cd /Users/valentingerard/Claude_code/app_jdr && python3 -m http.server 8000` puis `http://localhost:8000/` (le `fetch()` échoue en `file://`).

```
app_jdr/
├── index.html                      # coquille unique + <meta name="robots" content="noindex,nofollow">
├── robots.txt                      # User-agent: * / Disallow: /
├── .nojekyll                       # GitHub Pages : servir tel quel
├── .gitignore                      # ne PAS versionner les deux PDF sources (livre + feuille d'origine) ; versionner assets/feuille.pdf
├── css/app.css
├── js/
│   ├── main.js                     # démarrage, routeur d'étapes, panneau "Fiche en construction"
│   ├── data.js                     # loadAll() : fetch des JSON → DATA figé (Object.freeze)
│   ├── state.js                    # état du perso, brouillon localStorage (cof2.brouillon.v1), portrait (cof2.portrait.v1)
│   ├── rules.js                    # MOTEUR PUR sans DOM : computeDerived(), pointBuyCost(), applyPeuple(), warnings()
│   ├── dice.js                     # roll(n, faces) + animation
│   ├── pdf.js                      # fillSheet(state, DATA, fieldsMap) + page annexe → Uint8Array ; download()
│   ├── prompt.js                   # buildImagePrompt(state, DATA)
│   ├── ui.js                       # helpers DOM : cartes, boutons, image de secours, infobulles « ? », blocs repliables
│   └── steps/                      # accueil.js, prologue.js, profil.js, peuple.js, caracs.js, voies.js,
│                                   #   equipement.js, touche.js, histoire.js, recap.js
├── data/
│   ├── familles.json, armes.json, armures.json
│   ├── creation.json               # textes du chap. 1 (verbatim) + textes maison (clairement séparés, clé "maison")
│   ├── aide.json                   # infobulles : terme → texte court verbatim + page source
│   ├── tables.json                 # ideaux[20], travers[20], secrets1[20], secrets2[20], bizarreries[10], langues[], ages, tailles
│   ├── voie-du-mage.json
│   ├── profils/<slug>.json         # 14
│   └── peuples/<slug>.json         # 8
├── vendor/pdf-lib.min.js           # copie locale (UMD, window.PDFLib), pas de CDN
├── assets/feuille.pdf              # copie de 941_cof2_a12_feuille_de_personnage_editable_v0.pdf
├── assets/fields-map.json          # champ PDF ↔ rôle logique (produit en phase 0)
├── images/profils/<slug>.png, images/peuples/<slug>.png   # fournis par Valentin
├── tests/tests.html + tests/tests.js                       # tests du moteur sans framework (page qui affiche vert/rouge)
├── tools/                          # dev uniquement
│   ├── scrape_drs.py               # DRS → data/profils, data/peuples, voie-du-mage (stdlib : urllib + html.parser)
│   ├── extract_pdf.py              # pdftotext → creation.json, tables.json, armes/armures, aide.json
│   ├── check_data.py               # contrôle d'intégrité (bloquant)
│   ├── crosscheck.py               # DRS vs PDF : écarts de texte par capacité
│   ├── dump_fields.html            # découverte des champs PDF (pdf-lib + PNG de la feuille)
│   └── verification.md             # journal du pointage visuel
├── PROMPTS-IMAGES.md               # 22 prompts (en pied) + convention de nommage + bloc de style commun
├── README.md                       # lancement local, déploiement GitHub Pages, ajout d'images / bizarreries
└── BRIEF-EXECUTION.md              # ce document
```

Slugs : `arquebusier barde rodeur voleur barbare chevalier guerrier ensorceleur forgesort magicien sorcier druide moine pretre` ; `demi-elfe demi-orc elfe-haut elfe-sylvain gnome halfelin humain nain`.

Design : polices Google Fonts auto-hébergées ou liées (ex. Cinzel pour les titres, EB Garamond ou Cormorant Garamond pour le texte) ; palette parchemin (crème `#f4ecd8` environ), or-brun (`#a67c2e` / `#8a6a2b` comme les cadres de la feuille), brun encre pour le texte ; cadres à coins ornés faits en CSS/SVG ; cartes de profil au format 2:3 avec l'image en pied.

## 7. Modèle de données

Textes de règles = chaînes verbatim ; les champs structurés s'ajoutent à côté, jamais à la place.

```json
// familles.json
{ "aventuriers": { "nom": "Aventuriers", "pv": 4, "dr": "d8", "pcBonus": 1, "drBonus": 0, "rang2Mage": false, "description": "…verbatim p. imprimée 23…" },
  "combattants": { "pv": 5, "dr": "d10" }, "mages": { "pv": 3, "dr": "d6", "rang2Mage": true }, "mystiques": { "pv": 4, "dr": "d8", "drBonus": 1 } }

// profils/barbare.json
{ "slug": "barbare", "nom": "Barbare", "famille": "combattants",
  "caracsCles": ["FOR", "CON", "AGI"],            // druide : ["PER", "VOL", ["CON", "AGI"]]
  "caracMagie": null,                             // "INT" | "CHA" | "PER" pour les lanceurs de sorts
  "resume": "un guerrier sauvage issu d’une culture primitive capable d’entrer en rage",
  "description": "…DRS…", "pvText": "…", "armesArmures": "…DRS…",
  "armureMax": "cuir-renforce", "bouclier": true,
  "equipementTexte": "Hache à deux mains (DM 2d6) ou Arme à une main (d8) et bouclier (+2 en DEF), 2 javelots…",
  "equipement": [
    { "choix": [ [ { "ref": "hache-a-deux-mains" } ],
                 [ { "ref": "arme-une-main-1d8", "liste": ["epee-longue", "hache"] }, { "ref": "grand-bouclier" } ] ] },
    { "ref": "javelot", "qte": 2 }, { "ref": "dague" }, { "ref": "cuir-simple" } ],
  "voies": [ { "slug": "voie-de-la-brute", "nom": "Voie de la brute",
    "capacites": [ { "rang": 1, "titre": "Argument de taille", "tags": [], "sort": false,
                     "texte": "Le barbare ajoute sa FOR à son maximum de PV…",
                     "effets": [ { "cible": "PV", "carac": "FOR" } ] } ] } ] }

// peuples/gnome.json
{ "slug": "gnome", "nom": "Gnome", "profilsTypiques": ["forgesort", "arquebusier"],
  "resume": "un petit peuple passé maître dans les sciences", "description": "…DRS…",
  "noms": { "masculin": ["…"], "feminin": ["…"] },
  "reperes": { "ageDepart": 40, "esperanceVie": 250, "tailleCm": [100, 120], "poidsKg": [30, 50], "traits": "…" },
  "modificateursTexte": "+1 en INT ou PER, -1 en FOR",
  "modificateurs": [ { "valeur": 1, "choix": ["INT", "PER"] }, { "valeur": -1, "choix": ["FOR"] } ],
  "langues": ["Commun", "Runique"],
  "voie": { "slug": "voie-du-gnome", "nom": "Voie du gnome", "capacites": [ … 5 rangs, avec "sousChoix" sur Don étrange … ] } }
// humain : "modificateurs": [ { "valeur": 1, "regle": "deuxPlusFaibles" } ]

// armes.json : { "slug", "nom", "categorie": "contact"|"distance", "dm": "1d8", "dmDeuxMains": null, "portee": null,
//                "prix": "6 pa", "typeDM": "Tranchants", "notes": "", "deuxMains": false, "legere": false, "forAuxDM": true }
// armures.json : { "slug", "nom", "def": 2, "agiMax": 6, "prix": "4 pa", "type": "armure"|"bouclier" }
// tables.json : ideaux[20], travers[20], secrets1[20], secrets2[20], bizarreries[10], langues[{nom, locuteurs, note}], ages{peuple:[depart, esperance]}, tailles{peuple:{tailleCm, poidsKg}}
// aide.json : { "FOR": { "titre": "Force (FOR)", "texte": "…Actions type verbatim…", "page": 26 }, "PV": {…}, "L": {…}, "sort": {…}, "d4°": {…} … }

// État du personnage (state.js) — les valeurs dérivées ne sont JAMAIS stockées
{ "version": 1, "etape": 4, "joueur": "", "nom": "", "concept": "",
  "profil": "barbare", "peuple": "humain",
  "caracs": { "methode": "rapide"|"serie"|"points", "serie": "expert",
              "base": { "AGI": 1, "CON": 2, "FOR": 3, "PER": 0, "CHA": -1, "INT": 0, "VOL": 1 },
              "choixPeuple": { "PER": 1 } },
  "voies": { "profil": ["voie-du-pourfendeur", "voie-de-la-rage"], "peuple": "voie-de-l-humain"|"voie-du-mage",
             "rang2Mage": { "voie": "voie-de-l-invocation" } | null,
             "sousChoix": { "diversite": "Sauvage", "don-etrange": "murmures-dans-le-vent" } },
  "equipement": { "choix": [1], "sousChoix": { "arme-une-main-1d8": "epee-longue" }, "bourse": 7,
                  "armes": ["epee-longue", "javelot", "dague"], "armure": "cuir-simple", "bouclier": "grand-bouclier", "libre": "" },
  "touche": { "ideal": "Courage", "travers": "Violent", "secret": "…", "bizarrerie": "…", "genre": "F",
              "age": 22, "tailleCm": 178, "poidsKg": 80, "langues": ["Commun"], "description": "", "histoire": "" },
  "promptPerso": null }
```

`rules.computeDerived(state, DATA)` → `{ caracs (après peuple), pv, dr: {n, type}, pc, pm, init, def, att: {contact, distance, magique}, armes: [{nom, att, dm, portee}], sorts: [...], details: {...}, avertissements: [...] }`.

Portrait : redimensionné dans le navigateur (canvas, 1200 px max, JPEG qualité 0,85) et stocké en data URL sous `cof2.portrait.v1` (quelques centaines de Ko, sous le quota localStorage) ; embarqué dans le PDF avec `embedJpg`.

## 8. Avertissements (jamais bloquants)

- Carac de magie du profil < +1 → « tes sorts seront peu efficaces ».
- Une des 3 caracs clés du profil ≤ 0 → « valeur faible pour un <profil> ».
- CON = -2 → aucun dé de récupération.
- INT négative → ne sait ni lire ni écrire.
- AGI supérieure à l'AGI max de l'armure → bonus d'AGI plafonné.
- Lanceur de sorts (profil avec `caracMagie`) sans aucun sort choisi → pas de points de mana.
- Halfelin avec une arme à une main de DM > 1d6 → rappel de la règle de Petite taille.

> **Mise à jour du 21 septembre 2026.** Après sa première utilisation, Valentin a demandé le
> **vouvoiement** partout (et non le tutoiement indiqué ci-dessous), un écran de choix du sexe
> du personnage, la suppression de la méthode rapide et des blocs repliables, vingt bizarreries
> au lieu de dix, et des infobulles qui disent à quoi servent les valeurs plutôt que comment
> elles se calculent. Voir `tools/verification.md` §7 et le plan de refonte.

## 9. Textes maison (à écrire par toi, à faire relire à Valentin ; clé `maison` dans `creation.json`)

Ton : épique, une touche d'humour, jamais plus de deux courts paragraphes. Tutoiement du joueur.

- **Prologue (écran 1)** : situer dans les Terres d'Osgild sans lore (des royaumes humains fragments d'un ancien empire, des forêts elfiques, des montagnes naines, des dangers aux frontières), annoncer qu'une grande quête attend le groupe et qu'elle commence ici, par la naissance d'un héros. Terminer par une invitation à se présenter (nom du joueur) et à imaginer son personnage.
- **Guide de l'histoire (écran 8)** : raconter d'où vient le personnage, ce qu'il a vécu, pourquoi il est parti à l'aventure ; **justifier par cette histoire** l'idéal, le travers, le secret et la bizarrerie tirés (rappeler les quatre sous le champ) ; « une demi-page suffit, laisse des zones d'ombre au MJ ».
- **Note de l'objet négocié (écran 6)** : « Ça peut être lié à ton histoire (un porte-bonheur, une lettre, un médaillon…) ou quelque chose de très pratique (une petite corde de 3 m, une cuillère pour manger…). Le MJ tranche. »
- **Avertissement du mode libre (écran 4)** : « Tu es libre, mais une mauvaise répartition peut te handicaper. Exemple : un guerrier avec FOR à 0 touchera rarement ses adversaires et fera peu de dégâts. »
- **Note du prompt (écran 9)** : « Ce prompt reprend tout ce que tu as choisi. Si le résultat ne te plaît pas, modifie-le librement avant de le coller dans ChatGPT. »
- **Table des bizarreries (d10)**, proposition à faire valider :
  1. N'a pas de sous-vêtements. Jamais. Par principe.
  2. Refuse de passer par les portes : il n'entre et ne sort que par les fenêtres.
  3. Vomit dès qu'il aperçoit une personne âgée.
  4. Parle de lui à la troisième personne dès qu'il est stressé.
  5. Consulte sa cuillère avant toute décision importante, car elle « sait ».
  6. Éternue bruyamment chaque fois que quelqu'un prononce le mot « dragon ».
  7. Ne peut s'endormir que si quelqu'un lui chante une berceuse.
  8. Collectionne les cailloux « qui ont une bonne tête » et leur donne des prénoms.
  9. Salue solennellement chaque cheval qu'il croise, par respect.
  10. Compte tout à voix haute (marches, pièces, ennemis) et se trompe toujours.

## 10. Écrans du wizard

Panneau latéral « Fiche en construction » recalculé à chaque changement (caracs, PV, DR, PC, PM, Init, DEF, attaques). Chaque écran a `validate(state) → erreurs[]` ; « Suivant » bloqué tant qu'il reste une erreur ; retour arrière toujours possible ; brouillon sauvegardé à chaque action.

| # | Écran | Contenu |
|---|---|---|
| 0 | Accueil | « Nouveau personnage » / « Reprendre » (si brouillon) |
| 1 | Prologue | Nom du joueur (obligatoire) ; prologue maison ; texte « Rôle » du livre replié derrière « Lire l'extrait » ; champ « concept » optionnel |
| 2 | Profil | 4 onglets familles (une phrase + extrait verbatim replié) ; 14 cartes (image en pied + phrase de résumé + 3 caracs clés) ; fiche détaillée : description, armes & armures, équipement, aperçu des 5 voies ; « ? » sur famille, PV, DR, PC |
| 3 | Peuple | 8 cartes ; description courte ; profils typiques ; modificateur verbatim ; repères et noms typiques |
| 4 | Caractéristiques | 7 caracs avec « ? » (« Actions type ») et échelle des valeurs en infobulle ; mode A (méthode rapide pré-remplie ou série au choix, valeurs à placer) ou mode B (budget 7, coûts croissants, compteur, avertissement) ; puis modificateur de peuple (choix X ou Y ; humain : +1 sur l'une des deux plus faibles) ; alertes dynamiques |
| 5 | Voies | 5 cartes de voies (rang 1 en clair, rangs 2-5 repliés) → en choisir 2 ; voie de peuple automatique ; mages : rang 2 dans une voie choisie **ou** voie du mage à la place de la voie de peuple (+ option rang 2 Maîtrise de la magie) ; sous-choix (Diversité, Don étrange) ; « ? » sur voie, rang, (L)/(A)/(M)/(G), sort `*`, `d4°` |
| 6 | Équipement | Sac d'aventurier (verbatim), dé 2d6 pa animé, choix « X ou Y » du profil, jusqu'à 3 armes pour la feuille, objet négocié (note) ; DEF, attaques et DM en direct avec le détail du calcul |
| 7 | Touche finale | Idéal, travers, secrets (2 dés, en choisir un), bizarrerie : 4 obligatoires, relançables ou saisis ; taille/poids aléatoires ; âge (champ + dé optionnel) ; nom (M/F/hasard/libre) ; langues (peuple + Commun + INT au choix dans la liste) ; description physique guidée par les questions du livre |
| 8 | Histoire | Guide maison ; rappel des 4 traits ; champ limité à une demi-page avec compteur |
| 9 | Récapitulatif | Fiche complète + avertissements ; prompt d'image modifiable + « Copier » + note ; téléversement du portrait (aperçu) ; « Télécharger la feuille PDF » ; case « figer la feuille » ; « Recommencer » |

## 11. Remplissage du PDF avec pdf-lib

Champs relevés dans la feuille (noms exacts, 159) :
`NOM PERSONNAGE, JOUEUR, NIVEAU, AGI, CON, FOR, PER, CHA, INT, VOL, NOTES AGI, NOTES CON, NOTES FOR, NOTES PER, NOTES CHA, NOTES INT, NOTES VOL, FAMILLE, PROFIL, TRAVERS, INIT, DEF, PV, PV MAX, PCmax, TypeDR, DRmax, PM, PM MAX, PEUPLE, PEUPLE RG1..RG5, VP RG1..RG5, Rang 1, Rang 2, Rang 4, Rang 5, Rang 3__2, Contact, Dist, Mag, Niv, mFOR, mAGI, mVOL, ARME 1..3, ATT1..3, DM1..3, EQUIPEMENT, DESCRIPTION DU PERSONNAGE, VOIE1..VOIE5, VOIE PRESTIGE, Titre Rang N_X et Rang N_X pour N = 1..5 et X = 1..5 ou P, undefined_19..undefined_39`.
Le champ « idéal héroïque » n'est pas apparu dans la liste brute (probablement un nom avec accents encodé) : le retrouver avec `dump_fields.html`. Types : 253 widgets texte, 70 widgets bouton (cases des rangs, diamants de PC…). Apparences (`/DA`) : Helvetica 7 à 14 pt pour les textes, ZapfDingbats pour les cases. Sur le rendu, plusieurs cases de la page 2 sont **cochées par défaut** : fixer explicitement toutes les cases.

Mise en page (page 1) : en-tête nom du personnage ; joueur + niveau ; colonne caracs (valeur + notes) ; bloc « Voie du peuple » avec 5 rangs et cases ; à droite Init, DEF, PV (max), points de chance (diamants), dés de récupération (type + max), points de mana (max) ; en bas famille, profil, idéal héroïque, travers, attaques (contact/distance/magique : total = niveau + carac) ; armes (3 lignes : nom, attaque « 1d20 + », DM, spécial/portée) ; équipement. Page 2 : description du personnage ; six blocs de voies (VOIE 1 à 5 et Prestige) avec 5 rangs chacun (case + titre + texte).

Procédure :
1. **Phase 0 (avant tout le reste)** : `tools/dump_fields.html` charge `assets/feuille.pdf` avec pdf-lib, liste `form.getFields()` (nom, type, page, rectangle via les widgets), trie par page/y/x et dessine les rectangles numérotés sur les PNG des pages (`pdftoppm -r 80`). Produire `assets/fields-map.json`. Tester un remplissage complet : nom, une case, un champ multiligne long, une page annexe avec un JPEG ; ouvrir le résultat dans Aperçu. Si pdf-lib bute sur les doublons de champs, prévenir Valentin : la solution est de re-télécharger la feuille d'origine sur le site de Black Book Éditions.
2. Police : `pdfDoc.embedStandardFont(StandardFonts.Helvetica)` puis `form.updateFieldAppearances(font)` ; `sanitizeWinAnsi()` (mêmes règles que `clean()`, tout caractère hors WinAnsi → `?` + avertissement console).
3. Textes longs (`Rang N_X`, `DESCRIPTION DU PERSONNAGE`) : `enableMultiline()` + `setFontSize(0)` (auto-ajustement).
4. Remplissage : `VOIE1`/`VOIE2` = noms des voies de profil ; `Titre Rang 1_1`/`Rang 1_1` = titre affiché (avec tags) + texte intégral ; mage rang 2 → `Titre Rang 2_x`/`Rang 2_x` ; voie de peuple ou du mage en page 1 (`PEUPLE` + `PEUPLE RG1`, et si voie du mage : mentionner aussi le rang 1 de peuple conservé) ; `VOIE3..5`, prestige et rangs non acquis vides ; `NIVEAU` = 1 ; `FAMILLE`, `PROFIL` ; caracs + `NOTES *` (ex. « +1 peuple ») ; `INIT`, `DEF`, `PV`/`PV MAX`, `PCmax`, `TypeDR`/`DRmax`, `PM`/`PM MAX` ; `Contact`/`Dist`/`Mag` + `Niv`/`mFOR`/`mAGI`/`mVOL` ; `ARME 1..3`/`ATT1..3`/`DM1..3` ; `EQUIPEMENT` (équipement + bourse + objet négocié) ; idéal, `TRAVERS` ; `DESCRIPTION DU PERSONNAGE` = description physique, genre, âge/taille/poids, secret, bizarrerie, langues.
5. **Page annexe « Histoire de <nom> »** : `addPage` au même format (473,4 × 609,4 pt), titre, bloc des 4 traits, portrait en colonne de droite s'il existe (`embedJpg`, largeur ≈ un tiers de page), histoire repliée à la main (fonction de retour à la ligne) en Helvetica 10-11, demi-page maximum.
6. Pas d'aplatissement par défaut ; case « figer la feuille » → `form.flatten()`.
7. Téléchargement : `fetch('assets/feuille.pdf')` → `PDFDocument.load` → `save()` → `Blob` → `<a download="<Nom> - COF2.pdf">`.

## 12. Prompts d'images

- `PROMPTS-IMAGES.md` : un bloc de style commun à copier avant chaque prompt (illustration fantasy à la manière des ouvrages de Chroniques Oubliées : peinture numérique détaillée, **personnage entier de la tête aux pieds, debout**, format portrait 2:3, palette chaude, fond sobre et légèrement texturé, pas de texte) ; puis 14 prompts de profils et 8 prompts de peuples (décrire l'archétype, l'équipement de départ, l'attitude), chacun suivi du nom de fichier attendu (`images/profils/barbare.png`, `images/peuples/gnome.png`).
- `prompt.js` : même bloc de style + tout ce que le joueur a renseigné : peuple (traits des repères), profil, armes et armure choisies, nom, genre, âge, taille/poids, idéal, travers, bizarrerie visible, description physique. En français. Modifiable ; la version modifiée est conservée dans le brouillon (`promptPerso`).

## 13. Extraction et contrôles

1. `tools/scrape_drs.py` (stdlib seulement) : télécharge 14 + 9 pages, parse, écrit les JSON et un `.review.txt` par fichier (titre / tags / texte, lisible).
2. `tools/extract_pdf.py` : relance `pdftotext` ; produit `creation.json`, `tables.json`, `armes.json`, `armures.json`, `aide.json` avec les pages sources.
3. Revue par sous-agents en parallèle (un par famille + un pour les peuples) : `caracsCles`, `caracMagie`, `equipement` structuré, `armureMax`, `effets` (citer la phrase source), `sousChoix`.
4. `tools/crosscheck.py` : DRS vs PDF, capacité par capacité (texte normalisé) ; lister les écarts pour arbitrage par Valentin.
5. `tools/check_data.py` (bloquant) : 14 × 5 × 5 = 350 capacités de profil, 8 × 5 = 40 de peuple, 5 de mage ; rangs 1..5 consécutifs ; titres non vides ; texte ≥ 40 caractères ; aucun doublon ; aucun caractère hors WinAnsi ; tags ⊂ {L, A, M, G} ; 3 caracs clés ; toutes les `ref` d'équipement existent ; au moins 20 sorts de rang 1 marqués `sort:true` (Chant des héros, Murmures dans le vent, Divination, Injonction, Mirage, Choc, Morsure de la forge, Projectile de mana, Arc de feu, Asphyxie, Armure de mana, Lumière, Malédiction, Un pied dans la tombe, Saignements, Ténèbres, Baies magiques, Peau d'écorce, Arme bénie, Bénédiction, Récupération mineure).
6. Pointage visuel : pour chaque profil et peuple, 3 capacités au hasard + équipement + caracs clés comparés à l'image de la page (`pdftoppm`), consignés dans `tools/verification.md`.

## 14. Fixtures de tests (prétirés du livre, valeurs attendues)

- **Lhagva**, humaine barbare : AGI +1, CON +2, FOR +3, PER +1, CHA -1, INT 0, VOL +1 ; armure de cuir + bouclier ; Réflexes éclair (pourfendeur) + Cri de guerre (rage) + Diversité (humain). Attendu : **PV 12** (règle ; la fiche imprimée dit 15 = erratum), DEF 16 (10 + 1 + 2 + 2 + 1), Init 14 (10 + 1 + 3), PC 2 (2 - 1 + 1), DR 4d10, contact +4, distance +2, magique +2, épée longue 1d8+3, javelot 1d6 (20 m).
- **Ionas**, elfe haut ensorceleur : AGI +1, CON +1, FOR -2, PER 0, CHA +4, INT 0, VOL +2 ; sans armure ; Murmures dans le vent (air, sort) + Choc (invocation, sort) + Serviteur invisible (invocation rang 2, sort) + voie du mage rang 1. Attendu : PV 7, DEF 12 (10 + 1 + 1), Init 11 (10 + 0 + 1), PC 6, PM 5 (2 + 3 sorts), contact -1, distance +2, magique +3, bâton ferré 1d6-2.
- **Weugénie**, gnome arquebusier : AGI +3, CON +1, FOR -1, PER 0, CHA 0, INT +2, VOL +1 ; cuir renforcé ; Mécanismes + Plus vite que son ombre + Don étrange (Murmures dans le vent). Attendu : PV 9, DEF 17, Init 11, PC 3, PM 2, DR 3d8, contact +0, distance +4, magique +2, pétoire +4 DM d10, épée courte +0 DM 1d6-1.
- **Korléon**, nain barde : AGI 0, CON +1, FOR +2, PER 0, CHA +2, INT 0, VOL +2 ; cuir ; Chant des héros + Rumeurs et légendes + Habitant des tunnels. Attendu : PV 9, DEF 12, Init 10, PC 5, PM 3, DR 3d8, contact +3, distance +1, magique +3, épée longue +3 DM 1d8+2.
- **Wilibert**, gnome voleur : AGI +2, CON +1, FOR 0, PER +2, CHA +2, INT 0, VOL 0 ; cuir ; Discrétion + Doigts agiles + Don étrange (Mirage). Attendu : PV 9, DEF 14, Init 12, PC 5, PM 1, DR 3d8, contact +1, distance +3, magique +1.
- **Kamshaka**, demi-orc rôdeur : AGI +3, CON +1, FOR +2, PER +2, CHA -1, INT -1, VOL 0 ; cuir renforcé ; Survie + Archer émérite + Impressionnant. Attendu : PV 9, DEF 16, Init 13, PC 1, DR 4d8, contact +3, distance +4, magique +1, arc long +4 DM 1d8+2 (Archer émérite ajoute quelque chose aux DM : lire la capacité).
- D'autres prétirés p. PDF 350-357 (Helga, Keyrel, Tybur, Skodja, Mahardil, Isildenn…) : les relever et les ajouter si leurs valeurs sont cohérentes avec les règles ; noter les errata rencontrés.
- Tests supplémentaires : les 3 séries coûtent exactement 7 points en mode libre ; humain +1 sur l'une des deux plus faibles ; mage sans sort → PM absent ; CON -2 → DR 0 ; chaque avertissement.

## 15. Phases et vérifications

0. **Spike PDF** (§11.1) → `assets/fields-map.json`, PDF de test ouvert dans Aperçu.
1. **Squelette + moteur + tests** : `index.html`, `data.js`, `rules.js`, petits JSON, `tests/tests.html` tout vert avec les fixtures du §14.
2. **Données** (§13) : `check_data.py` et `crosscheck.py` sans erreur ; pointage visuel consigné ; les 14 + 8 + 1 fichiers chargent dans l'app.
3. **Écrans 1-5** : refaire Lhagva et Ionas à la main dans le navigateur intégré ; panneau latéral = valeurs des tests ; recharger la page à mi-parcours → reprise du brouillon.
4. **Écran 6** : barbare (hache à deux mains vs arme + bouclier), DEF/attaques/DM = fixtures ; Ionas sans armure.
5. **Écrans 7-8 + dés** : tirages relançables, saisie libre, taille/poids dans les bornes, noms du bon peuple et du bon genre, langues, compteur de l'histoire, 4 traits obligatoires.
6. **Export** : PDF de Lhagva et Ionas comparés champ par champ aux fiches du livre ; page annexe lisible avec et sans portrait ; portrait conservé après rechargement ; prompt cohérent et modifiable.
7. **Finitions** : ambiance parchemin, infobulles sur chaque écran, aucun pavé visible par défaut, images manquantes → secours, `noindex`, README, `PROMPTS-IMAGES.md`, dépôt git initialisé et prêt.
8. **Déploiement** (avec l'accord explicite de Valentin) : il lance `gh auth login` dans un terminal et donne son nom d'utilisateur ; ensuite création du dépôt, push, activation de Pages (`gh api`), test de l'URL. Sans son accord dans la conversation, ne rien pousser.

## 16. Règles de conduite pour l'agent d'exécution

- Ne jamais inventer ou reformuler un texte de règle ; en cas de doute entre DRS et PDF, garder le DRS et signaler l'écart.
- Interface, commentaires utiles, README, messages : en français.
- Ne pas installer d'outil (Node, pip…) sans demander. Ne pas modifier les deux PDF sources.
- Ne pas réutiliser les fichiers graphiques ni les polices du DRS ; ne pas embarquer d'illustrations du livre.
- Ne pas créer de compte, ne pas se connecter à GitHub à la place de Valentin, ne pas pousser sans son accord explicite.
- Fichiers temporaires dans le scratchpad de la session, pas dans le projet (sauf `tools/`).
- Rapporter fidèlement : si un test échoue ou si une étape est sautée, le dire tel quel.
- Questions à Valentin uniquement quand une décision lui appartient vraiment (errata contradictoires, ton d'un texte, blocage sur la feuille PDF). Tout le reste est décidé ici.

## 17. Risques connus

1. Écarts entre DRS, texte des règles et fiches prétirées : suivre les règles, lister les écarts.
2. Feuille PDF ré-enregistrée par Aperçu (doublons de champs) : à valider en phase 0.
3. Sous-choix de rang 1 : d'autres cas que Diversité et Don étrange peuvent apparaître.
4. Textes maison et table des bizarreries : à faire relire par Valentin après la première version.
5. Barème du mode libre : validé, mais modifiable en une ligne (`pointBuyCost`) si Valentin change d'avis.
