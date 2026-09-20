# Prompts d'images — cartes de profils et de peuples

Ce fichier sert à générer les 22 visuels des cartes de l'application (14 profils + 8 peuples).
Les images ne sont pas fournies : tu les génères toi-même dans ChatGPT, puis tu les enregistres
sous le nom indiqué. Tant qu'un fichier manque, l'application affiche un visuel de secours —
rien ne casse.

**Où les ranger**

```
images/profils/<slug>.png     arquebusier, barde, rodeur, voleur, barbare, chevalier, guerrier,
                              ensorceleur, forgesort, magicien, sorcier, druide, moine, pretre
images/peuples/<slug>.png     demi-elfe, demi-orc, elfe-haut, elfe-sylvain, gnome, halfelin,
                              humain, nain
```

Format conseillé : portrait 2:3 (par exemple 800 × 1200 px), PNG, moins de 500 Ko par image
(le dépôt reste léger et les cartes se chargent vite).

**Mode d'emploi** : copie le bloc de style, colle-le dans ChatGPT, puis ajoute à la suite le
prompt du profil ou du peuple voulu.

---

## Bloc de style commun (à coller avant chaque prompt)

> Illustration de jeu de rôle fantasy, à la manière des ouvrages de Chroniques Oubliées :
> peinture numérique détaillée, personnage entier de la tête aux pieds, debout, format portrait
> 2:3, palette chaude (ocre, brun, or), fond sobre et légèrement texturé façon parchemin, pas de
> texte, pas de cadre.

C'est le même bloc que celui utilisé pour le portrait du personnage, à la fin du wizard : les
cartes et les portraits des joueurs se ressembleront.

---

## Les 14 profils

Chaque description reprend l'équipement de départ officiel du profil, pour que la carte
corresponde à ce que le joueur aura réellement en main.

### Arquebusier — `images/profils/arquebusier.png`
Un spécialiste des armes à feu et des explosifs, souvent mercenaire. Il tient une pétoire à long
canon, porte une épée longue au côté, une dague à la ceinture et une armure de cuir renforcé
constellée de poches, de cartouchières et de petits outils. Attitude de baroudeur méfiant, un œil
plissé par la fumée de poudre.

### Barde — `images/profils/barde.png`
Un artiste polyvalent, aussi à l'aise à la rapière qu'à la magie. Rapière fine au côté, dague,
instrument de musique en bandoulière, armure de cuir légère sous des vêtements colorés. Attitude
de conteur en pleine phrase, une main levée comme s'il allait lancer une pique.

### Rôdeur — `images/profils/rodeur.png`
Un spécialiste de la survie en milieu naturel, ami des animaux et archer hors pair. Arc court à
la main, carquois dans le dos, épée longue au côté, dague, armure de cuir renforcé couverte de
boue séchée et de feuilles. Attitude à l'arrêt, à l'écoute, comme s'il venait de repérer une
piste.

### Voleur — `images/profils/voleur.png`
Un filou agile et sournois, taillé pour l'infiltration. Rapière, dagues de lancer glissées dans
un baudrier, outils de crochetage, corde enroulée à l'épaule, armure de cuir sombre, capuche.
Attitude de quelqu'un qui vient de reculer d'un pas dans l'ombre en souriant.

### Barbare — `images/profils/barbare.png`
Un guerrier sauvage issu d'une culture primitive, capable d'entrer en rage. Hache à deux mains
posée sur l'épaule, deux javelots dans le dos, dague, armure de cuir minimale, peintures de
guerre et fourrures. Attitude massive, pieds plantés, souffle court.

### Chevalier — `images/profils/chevalier.png`
Un héros en armure rutilante qui chevauche une monture magique. Cotte de mailles éclatante,
grand bouclier blasonné, épée longue, lance de cavalerie plantée au sol, dague. Attitude droite
et solennelle, cape retombant derrière lui (la monture peut être suggérée à l'arrière-plan, mais
le personnage reste seul au premier plan).

### Guerrier — `images/profils/guerrier.png`
Un spécialiste du corps à corps, un soldat d'élite. Chemise de mailles, grand bouclier, épée
longue en main, épée à deux mains dans le dos, hachette de lancer à la ceinture. Attitude de
professionnel en garde, calme, le regard qui évalue.

### Ensorceleur — `images/profils/ensorceleur.png`
Un magicien charismatique qui emploie une magie subtile. Aucune armure, vêtements amples et
élégants, bâton ferré, dague. Une brise tourne autour de lui et soulève ses habits. Attitude
séduisante, presque nonchalante, une main ouverte où la lumière s'accroche.

### Forgesort — `images/profils/forgesort.png`
Un magicien-artisan qui crée des élixirs et grave des runes. Tablier de cuir sur des vêtements
simples, marteau, dague, bâton ferré, fioles et burins à la ceinture, runes lumineuses gravées
sur ses outils. Attitude concentrée d'artisan au travail.

### Magicien — `images/profils/magicien.png`
Un intellectuel qui pratique une magie académique, efficace et directe. Robe de savant, bâton
ferré, dague, grimoire épais tenu sous le bras, pages annotées qui dépassent. Attitude posée,
regard analytique, une lueur d'arcane au bout des doigts.

### Sorcier — `images/profils/sorcier.png`
Un adepte de la magie noire qui contrôle les morts et les démons. Vêtements sombres et râpés,
bâton ferré, dague, parchemins anciens roulés dans une besace, amulettes d'os. Attitude
inquiétante mais humaine, une ombre un peu trop nette à ses pieds.

### Druide — `images/profils/druide.png`
Un protecteur de la nature et un magicien des forces naturelles. Bâton noueux ou épieu, dague,
arc court, armure de cuir souple, manteau de laine brute, feuillages et gui tressés. Attitude
enracinée, paisible, pieds nus dans la mousse.

### Moine — `images/profils/moine.png`
Un ascète qui endurcit son corps et son esprit, maître du combat à mains nues. Aucune armure,
tunique ceinturée, bâton, mains et avant-bras bandés, pieds nus. Attitude en équilibre, prêt à
frapper ou à esquiver, respiration visible.

### Prêtre — `images/profils/pretre.png`
Le bras armé d'une religion, capable de soigner comme d'occire. Chemise de mailles sous une
tunique liturgique, masse ou marteau de guerre, petit bouclier frappé d'un symbole sacré.
Attitude debout et protectrice, une main levée en bénédiction.

---

## Les 8 peuples

Pour les peuples, montre un individu représentatif en tenue de voyage, sans insister sur un
profil précis : ce sont des cartes d'identité visuelle, pas des héros en action. Les traits
physiques ci-dessous viennent du DRS officiel.

### Demi-elfe — `images/peuples/demi-elfe.png`
Un demi-elfe entre deux cultures : grâce naturelle, oreilles légèrement pointues, pilosité
faible. Taille humaine (1,50 m à 1,90 m). Vêtements mêlant coupe humaine et broderies elfiques.
Expression réservée, un peu à l'écart.

### Demi-orc — `images/peuples/demi-orc.png`
Un demi-orc grand et athlétique (1,70 m à 2,10 m) : peau verdâtre, mâchoire large, front bas,
petits yeux. Vêtements de voyage robustes, rapiécés. Posture puissante, regard qui anticipe le
mépris des autres.

### Elfe haut — `images/peuples/elfe-haut.png`
Un elfe haut élancé, svelte et gracieux, d'une jeunesse éternelle : oreilles pointues, yeux en
amandes verts ou violets, cheveux blancs, argent ou or. Vêtements raffinés aux fils clairs.
Maintien altier, presque immobile.

### Elfe sylvain — `images/peuples/elfe-sylvain.png`
Un elfe sylvain menu et svelte : oreilles pointues, yeux en amandes, cheveux sombres (bruns,
noirs ou roux), tatouages sur la peau, pilosité absente. Tenue de forêt, cuirs souples, teintes
vertes et brunes. En alerte, léger, prêt à disparaître entre les troncs.

### Gnome — `images/peuples/gnome.png`
Un gnome petit et rondouillard (1 m à 1,20 m) : gros nez, oreilles un peu pointues ou grandes et
rondes, moustaches et rouflaquettes. Vêtements bourrés de poches, loupe, petits outils et
mécanismes. Curieux jusqu'à l'imprudence.

### Halfelin — `images/peuples/halfelin.png`
Un halfelin petit et vif (80 cm à 1 m) : pieds poilus et nus, regard espiègle. Vêtements simples
et confortables, sac de provisions. Attitude joyeuse et détendue, comme s'il venait de manger.

### Humain — `images/peuples/humain.png`
Un humain en tenue de voyage, sans attribut magique ni armure lourde : cape, besace, bâton de
marche. Apparence ordinaire mais franche — toute la diversité humaine est possible, sans couleurs
exotiques. Attitude déterminée, prêt à partir.

### Nain — `images/peuples/nain.png`
Un nain robuste et trapu (1,15 m à 1,35 m) : pilosité très développée, tresses dans les cheveux
et la barbe, anneaux et bijoux. Vêtements de cuir et de mailles, outils de mineur à la ceinture.
Attitude bourrue, les bras croisés. (Les naines n'ont pas de barbe : tout juste un fin duvet avec
l'âge.)

---

## Ajouter d'autres visuels

Les cartes cherchent le fichier `images/<dossier>/<slug>.png`. Tu peux remplacer une image quand
tu veux : garde le nom, remplace le fichier, recharge la page.
