/* Tests du moteur de règles, sans framework : chaque test compare une valeur calculée à
   la valeur attendue. Les personnages de référence sont les prétirés du livre
   (p. imprimées 348 à 355). Quand la fiche imprimée contredit les règles, c'est la règle
   qui fait foi (décision de Valentin) et l'écart est signalé en commentaire. */

const resultats = [];

function test(nom, fn) {
  try {
    fn();
    resultats.push({ nom, ok: true });
  } catch (e) {
    resultats.push({ nom, ok: false, message: e.message });
  }
}

function egal(obtenu, attendu, quoi) {
  const a = JSON.stringify(obtenu);
  const b = JSON.stringify(attendu);
  if (a !== b) throw new Error((quoi ? quoi + ' : ' : '') + 'obtenu ' + a + ', attendu ' + b);
}

function vrai(condition, message) {
  if (!condition) throw new Error(message || 'condition fausse');
}

/* ------------------------------------------------------------------ fabrique d'états */

function perso(config) {
  const etat = etatNeuf();
  etat.joueur = 'Test';
  etat.nom = config.nom;
  etat.profil = config.profil;
  etat.peuple = config.peuple;
  etat.caracs.base = Object.assign({ AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    config.caracs);
  etat.caracs.choixPeuple = config.choixPeuple || {};
  etat.voies.profil = config.voies || [];
  etat.voies.peuple = config.voiePeuple || 'peuple';
  etat.voies.peupleEmprunte = config.peupleEmprunte || null;
  etat.voies.rang2Mage = config.rang2Mage || null;
  etat.voies.sousChoix = config.sousChoix || {};
  etat.voies.optionsEffets = config.optionsEffets || {};
  etat.equipement.armure = config.armure || null;
  etat.equipement.bouclier = config.bouclier || null;
  etat.equipement.armes = config.armes || [];
  return etat;
}

/* ------------------------------------------------------------------ les prétirés */

const FIXTURES = [
  {
    // p. imprimée 350. La fiche indique 15 PV : erratum, la règle donne (2 × 5) + 2 = 12.
    nom: 'Lhagva, humaine barbare',
    config: {
      nom: 'Lhagva', profil: 'barbare', peuple: 'humain',
      caracs: { AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: -1, INT: 0, VOL: 1 },
      voies: ['voie-du-pourfendeur', 'voie-de-la-rage'],
      armure: 'cuir-simple', bouclier: 'grand-bouclier',
      armes: ['epee-longue', 'javelot'],
    },
    attendu: {
      pv: 12, def: 16, init: 14, pc: 2, pm: null, dr: { n: 4, type: 'd10' },
      att: { contact: 4, distance: 2, magique: 2 },
      armes: [{ nom: 'Épée longue', att: 4, dm: '1d8+3' }, { nom: 'Javelot', att: 2, dm: '1d6' }],
    },
  },
  {
    nom: 'Ionas, elfe haut ensorceleur',
    config: {
      nom: 'Ionas', profil: 'ensorceleur', peuple: 'elfe-haut',
      caracs: { AGI: 1, CON: 1, FOR: -2, PER: 0, CHA: 3, INT: 0, VOL: 2 },
      choixPeuple: { CHA: 1 },
      voies: ['voie-de-l-air', 'voie-de-l-invocation'],
      rang2Mage: { voie: 'voie-de-l-invocation' },
      voiePeuple: 'voie-du-mage',
      armes: ['baton-ferre'],
    },
    attendu: {
      pv: 7, def: 12, init: 11, pc: 6, pm: 5, dr: { n: 3, type: 'd6' },
      att: { contact: -1, distance: 2, magique: 3 },
      armes: [{ nom: 'Bâton ferré', att: -1, dm: '1d6-2' }],
    },
  },
  {
    nom: 'Weugénie, gnome arquebusier',
    config: {
      nom: 'Weugénie', profil: 'arquebusier', peuple: 'gnome',
      caracs: { AGI: 3, CON: 1, FOR: 0, PER: 0, CHA: 0, INT: 1, VOL: 1 },
      choixPeuple: { INT: 1, FOR: -1 },
      voies: ['voie-de-l-artilleur', 'voie-du-pistolero'],
      sousChoix: { 'gnome/voie-du-gnome/1': { profil: 'ensorceleur', voie: 'voie-de-l-air', rang: 1 } },
      armure: 'cuir-renforce',
      armes: ['petoire', 'epee-courte'],
    },
    attendu: {
      pv: 9, def: 17, init: 11, pc: 3, pm: 2, dr: { n: 3, type: 'd8' },
      att: { contact: 0, distance: 4, magique: 2 },
      armes: [{ nom: 'Pétoire', att: 4, dm: '1d10' }, { nom: 'Épée courte', att: 0, dm: '1d6-1' }],
    },
  },
  {
    nom: 'Korléon, nain barde',
    config: {
      nom: 'Korléon', profil: 'barde', peuple: 'nain',
      caracs: { AGI: 1, CON: 1, FOR: 2, PER: 0, CHA: 2, INT: 0, VOL: 1 },
      choixPeuple: { VOL: 1, AGI: -1 },
      voies: ['voie-du-musicien', 'voie-du-vagabond'],
      armure: 'cuir-simple',
      armes: ['epee-longue', 'dague-lancee'],
    },
    attendu: {
      pv: 9, def: 12, init: 10, pc: 5, pm: 3, dr: { n: 3, type: 'd8' },
      att: { contact: 3, distance: 1, magique: 3 },
      armes: [{ nom: 'Épée longue', att: 3, dm: '1d8+2' }, { nom: 'Dague', att: 1, dm: '1d4' }],
    },
  },
  {
    nom: 'Wilibert, gnome voleur',
    config: {
      nom: 'Wilibert', profil: 'voleur', peuple: 'gnome',
      caracs: { AGI: 2, CON: 1, FOR: 0, PER: 1, CHA: 2, INT: 0, VOL: 0 },
      choixPeuple: { PER: 1, FOR: 0 },
      voies: ['voie-de-l-assassin', 'voie-du-roublard'],
      sousChoix: { 'gnome/voie-du-gnome/1': { profil: 'ensorceleur', voie: 'voie-des-illusion', rang: 1 } },
      armure: 'cuir-simple',
      armes: ['epee-courte', 'couteaux-de-lancer'],
    },
    attendu: {
      pv: 9, def: 14, init: 12, pc: 5, pm: 1, dr: { n: 3, type: 'd8' },
      att: { contact: 1, distance: 3, magique: 1 },
      // « Doigts agiles » ajoute +1 aux DM à distance des dagues et couteaux
      armes: [{ nom: 'Épée courte', att: 1, dm: '1d6' }, { nom: 'Couteaux de lancer', att: 3, dm: '1d4+1' }],
    },
  },
  {
    // p. imprimée 349. La fiche donne PC 1 et DR 4d8 : la règle donne PC 2 (2 - 1 + 1 pour
    // un aventurier) et DR 3d8 (2 + CON). L'échange PC contre DR vient de la capacité
    // « Éclaireur », que cette fiche ne liste pas — écart consigné dans tools/verification.md.
    nom: 'Kamshaka, demi-orc rôdeur',
    config: {
      nom: 'Kamshaka', profil: 'rodeur', peuple: 'demi-orc',
      caracs: { AGI: 3, CON: 1, FOR: 1, PER: 2, CHA: -1, INT: 0, VOL: 0 },
      choixPeuple: { FOR: 1, INT: -1 },
      voies: ['voie-de-la-survie', 'voie-de-l-archer'],
      armure: 'cuir-renforce',
      armes: ['arc-long', 'epee-courte', 'dague-lancee'],
    },
    attendu: {
      pv: 9, def: 16, init: 13, pc: 2, pm: null, dr: { n: 3, type: 'd8' },
      att: { contact: 3, distance: 4, magique: 1 },
      // « Archer émérite » ajoute la PER aux DM à l'arc seulement
      armes: [{ nom: 'Arc long', att: 4, dm: '1d8+2' }, { nom: 'Épée courte', att: 3, dm: '1d6+2' },
        { nom: 'Dague', att: 4, dm: '1d4' }],
    },
  },
  {
    nom: 'Mahardil, humain chevalier',
    config: {
      nom: 'Mahardil', profil: 'chevalier', peuple: 'humain',
      caracs: { AGI: 1, CON: 2, FOR: 2, PER: 0, CHA: 2, INT: 0, VOL: 1 },
      voies: ['voie-du-cavalier', 'voie-du-preux'],
      armure: 'cotte-de-mailles', bouclier: 'grand-bouclier',
      armes: ['epee-longue', 'lance-de-cavalerie'],
    },
    attendu: {
      // la fiche indique PC 4 : la règle donne 2 + 2 CHA = 4, plus 1 PC de « Diversité »
      // (voie de l'humain) = 5. L'écart vient de la fiche.
      pv: 12, def: 18, init: 10, pc: 5, pm: null, dr: { n: 4, type: 'd10' },
      att: { contact: 3, distance: 2, magique: 2 },
      armes: [{ nom: 'Épée longue', att: 3, dm: '1d8+2' },
        { nom: 'Lance de cavalerie', att: 3, dm: '2d6+2' }],
    },
  },
  {
    // « Robustesse » (voie de la résistance) donne +3 PV : 10 + 2 + 3 = 15, comme la fiche.
    nom: 'Isildenn, elfe haut guerrier',
    config: {
      nom: 'Isildenn', profil: 'guerrier', peuple: 'elfe-haut',
      caracs: { AGI: 1, CON: 2, FOR: 2, PER: 0, CHA: 0, INT: 0, VOL: 0 },
      choixPeuple: { CHA: 1, FOR: -1 },
      voies: ['voie-du-maitre-d-armes', 'voie-de-la-resistance'],
      armure: 'cotte-de-mailles',
      armes: ['vivelame'],
    },
    attendu: {
      pv: 15, def: 16, init: 10, pc: 3, pm: null, dr: { n: 4, type: 'd10' },
      att: { contact: 2, distance: 2, magique: 1 },
      armes: [{ nom: 'Vivelame', att: 2, dm: '1d10+1' }],
    },
  },
  {
    // « Vitesse du félin » (voie du fauve) donne +3 Init et +1 DEF : Init 15, DEF 15.
    nom: 'Skodja, demi-orc druidesse',
    config: {
      nom: 'Skodja', profil: 'druide', peuple: 'demi-orc',
      caracs: { AGI: 2, CON: 1, FOR: 1, PER: 2, CHA: -1, INT: -1, VOL: 2 },
      choixPeuple: { FOR: 1, INT: 0 },
      voies: ['voie-du-fauve', 'voie-du-protecteur'],
      armure: 'cuir-simple',
      armes: ['epieu', 'arc-court'],
    },
    attendu: {
      pv: 9, def: 15, init: 15, pc: 1, pm: 3, dr: { n: 4, type: 'd8' },
      att: { contact: 3, distance: 3, magique: 3 },
      armes: [{ nom: 'Épieu', att: 3, dm: '1d6/1d10+2' }, { nom: 'Arc court', att: 3, dm: '1d6' }],
    },
  },
  {
    // « Armure d'os » (rang 2 de la voie de l'outre-tombe) donne +3 DEF, « Petite taille »
    // (halfelin, conservée par la voie du mage) +1 DEF : 10 + 1 + 1 + 3 = 15, comme la fiche.
    nom: 'Tybur, halfelin sorcier',
    config: {
      nom: 'Tybur', profil: 'sorcier', peuple: 'halfelin',
      caracs: { AGI: 1, CON: 1, FOR: -1, PER: 0, CHA: -1, INT: 2, VOL: 3 },
      choixPeuple: { VOL: 1, FOR: 0 },
      voies: ['voie-de-l-outre-tombe', 'voie-de-la-sombre-magie'],
      rang2Mage: { voie: 'voie-de-l-outre-tombe' },
      voiePeuple: 'voie-du-mage',
      armes: ['dague'],
    },
    attendu: {
      pv: 7, def: 15, init: 10, pc: 1, dr: { n: 3, type: 'd6' },
      att: { contact: 0, distance: 2, magique: 5 },
      armes: [{ nom: 'Dague', att: 0, dm: '1d4-1' }],
    },
  },
  {
    // La fiche annonce AGI +0 et pourtant +2 à distance : la règle donne +1 (niveau + AGI).
    nom: 'Helga, naine forgesort',
    config: {
      nom: 'Helga', profil: 'forgesort', peuple: 'nain',
      caracs: { AGI: 1, CON: 2, FOR: 2, PER: 0, CHA: -1, INT: 2, VOL: 1 },
      choixPeuple: { VOL: 1, AGI: -1 },
      voies: ['voie-du-metal', 'voie-des-runes'],
      rang2Mage: { voie: 'voie-du-metal' },
      armure: 'cuir-simple',
      armes: ['marteau'],
    },
    attendu: {
      pv: 8, def: 14, init: 10, pc: 1, pm: 4, dr: { n: 4, type: 'd6' },
      att: { contact: 3, distance: 1, magique: 3 },
      armes: [{ nom: 'Marteau', att: 3, dm: '1d6+2' }],
    },
  },
  {
    // Demi-elfe : pas de voie de peuple propre, il emprunte ici la voie de l'humain
    // (« Diversité – Citadin » sur la fiche). La fiche donne PC 3 ; la règle ajoute le
    // +1 PC de Diversité, conservé par la voie du mage : 2 + 1 + 1 = 4.
    nom: 'Keyrel, demi-elfe magicien',
    config: {
      nom: 'Keyrel', profil: 'magicien', peuple: 'demi-elfe',
      caracs: { AGI: 1, CON: 1, FOR: -1, PER: -1, CHA: 0, INT: 3, VOL: 2 },
      choixPeuple: { CHA: 1, PER: 0 },
      voies: ['voie-de-la-magie-destructrice', 'voie-de-la-magie-protectrice'],
      rang2Mage: { voie: 'voie-de-la-magie-destructrice' },
      voiePeuple: 'voie-du-mage', peupleEmprunte: 'humain',
      armes: ['dague'],
    },
    attendu: {
      pv: 7, def: 11, init: 9, pc: 4, pm: 5, dr: { n: 3, type: 'd6' },
      att: { contact: 0, distance: 2, magique: 3 },
      armes: [{ nom: 'Dague', att: 0, dm: '1d4-1' }],
    },
  },
];

/* ------------------------------------------------------------------ exécution */

function lancerTests(DATA) {
  for (const fixture of FIXTURES) {
    test(fixture.nom, () => {
      const etat = perso(fixture.config);
      const d = rules.computeDerived(etat, DATA);
      const a = fixture.attendu;
      if ('pv' in a) egal(d.pv, a.pv, 'PV');
      if ('def' in a) egal(d.def, a.def, 'DEF');
      if ('init' in a) egal(d.init, a.init, 'Init');
      if ('pc' in a) egal(d.pc, a.pc, 'PC');
      if ('pm' in a) egal(d.pm, a.pm, 'PM');
      if ('dr' in a) egal(d.dr, a.dr, 'DR');
      if ('att' in a) egal(d.att, a.att, 'Attaques');
      if ('armes' in a) {
        egal(d.armes.map((x) => ({ nom: x.nom, att: x.att, dm: x.dm })), a.armes, 'Armes');
      }
    });
  }

  /* ---- règles de répartition ---- */

  test('les trois séries officielles coûtent exactement 7 points', () => {
    for (const cle of Object.keys(rules.SERIES)) {
      const valeurs = rules.SERIES[cle].valeurs;
      const caracs = {};
      rules.CARACS.forEach((c, i) => { caracs[c] = valeurs[i]; });
      egal(rules.coutTotal(caracs), rules.BUDGET_POINTS, 'coût de la série ' + cle);
    }
  });

  test('le barème du mode libre est croissant', () => {
    egal([-1, 0, 1, 2, 3, 4].map(rules.pointBuyCost), [-1, 0, 1, 2, 4, 6]);
  });

  test('la méthode rapide place les trois meilleures valeurs sur les caracs clés', () => {
    const valeurs = rules.methodeRapide(DATA.profils.barbare);
    egal(valeurs.FOR, 3); egal(valeurs.CON, 2); egal(valeurs.AGI, 1);
    egal(valeurs.CHA, 0, 'les autres restent à 0');
  });

  /* ---- cas limites ---- */

  test('une CON de -2 ne donne aucun dé de récupération', () => {
    const etat = perso({
      nom: 'Test', profil: 'magicien', peuple: 'humain',
      caracs: { CON: -2 }, voies: ['voie-de-la-magie-des-arcanes', 'voie-de-la-magie-protectrice'],
      rang2Mage: { voie: 'voie-de-la-magie-protectrice' },
    });
    const d = rules.computeDerived(etat, DATA);
    egal(d.dr.n, 0, 'DR');
    vrai(d.avertissements.some((m) => m.includes('dé de récupération')), 'avertissement CON -2');
  });

  test('un mage sans sort n’a pas de points de mana', () => {
    const etat = perso({
      nom: 'Test', profil: 'forgesort', peuple: 'nain',
      caracs: { VOL: 2, CON: 1 }, voies: ['voie-du-golem', 'voie-des-runes'],
      rang2Mage: { voie: 'voie-du-golem' },   // Golem n'est pas un sort
    });
    const d = rules.computeDerived(etat, DATA);
    vrai(d.capacites.every((c) => !c.capacite.sort), 'aucune capacité choisie n’est un sort');
    egal(d.pm, null, 'PM');
    vrai(d.avertissements.some((m) => m.includes('points de mana')), 'avertissement sans sort');
  });

  test('l’option du forgesort remplace la CON par l’INT pour les PV', () => {
    const base = {
      nom: 'Test', profil: 'forgesort', peuple: 'nain',
      caracs: { CON: 0, INT: 3 }, voies: ['voie-du-golem', 'voie-des-runes'],
      rang2Mage: { voie: 'voie-des-runes' },
    };
    const sans = rules.computeDerived(perso(base), DATA);
    const avec = rules.computeDerived(perso(Object.assign({}, base, {
      optionsEffets: { 'forgesort/voie-du-golem/1': true },
    })), DATA);
    egal(sans.pv, 6, 'PV avec la CON');
    egal(avec.pv, 9, 'PV avec l’INT');
  });

  test('l’armure plafonne le bonus d’AGI en défense', () => {
    const etat = perso({
      nom: 'Test', profil: 'guerrier', peuple: 'humain',
      caracs: { AGI: 4, CON: 0 }, voies: ['voie-du-bouclier', 'voie-du-soldat'],
      armure: 'armure-de-plaques',
    });
    const d = rules.computeDerived(etat, DATA);
    egal(d.def, 10 + 2 + 6, 'DEF plafonnée à AGI +2');
    vrai(d.avertissements.some((m) => m.includes('plafonne')), 'avertissement de plafonnement');
  });

  test('une caractéristique de magie inférieure à +1 déclenche un avertissement', () => {
    const etat = perso({
      nom: 'Test', profil: 'druide', peuple: 'humain',
      caracs: { PER: 0, VOL: 1, CON: 1 }, voies: ['voie-du-protecteur', 'voie-des-animaux'],
    });
    const d = rules.computeDerived(etat, DATA);
    vrai(d.avertissements.some((m) => m.includes('magie')), 'avertissement de magie faible');
  });

  test('une INT négative empêche de lire et d’écrire', () => {
    const etat = perso({
      nom: 'Test', profil: 'barbare', peuple: 'humain',
      caracs: { INT: -1 }, voies: ['voie-de-la-rage', 'voie-du-pagne'],
    });
    const d = rules.computeDerived(etat, DATA);
    vrai(d.avertissements.some((m) => m.includes('lire')), 'avertissement INT négative');
  });

  test('le halfelin est averti s’il porte une arme à une main de plus de 1d6', () => {
    const etat = perso({
      nom: 'Test', profil: 'guerrier', peuple: 'halfelin',
      caracs: { FOR: 2 }, voies: ['voie-du-combat', 'voie-du-soldat'],
      armes: ['epee-longue'],
    });
    const d = rules.computeDerived(etat, DATA);
    vrai(d.avertissements.some((m) => m.includes('Petite taille')), 'avertissement halfelin');
  });

  test('le mage qui prend la voie du mage garde le rang 1 de sa voie de peuple', () => {
    const etat = perso({
      nom: 'Test', profil: 'magicien', peuple: 'halfelin',
      caracs: { AGI: 0, CON: 0 }, voies: ['voie-de-la-magie-des-arcanes', 'voie-de-la-magie-protectrice'],
      rang2Mage: { voie: 'voie-de-la-magie-protectrice' }, voiePeuple: 'voie-du-mage',
    });
    const d = rules.computeDerived(etat, DATA);
    const titres = d.capacites.map((c) => c.capacite.titre);
    vrai(titres.includes('Petite taille'), 'la capacité de peuple est conservée');
    egal(d.def, 11, 'le +1 DEF de Petite taille s’applique');
  });

  /* ---- brouillons d'anciennes versions ---- */

  test('un brouillon v1 est rattrapé jusqu’à la version courante', () => {
    const v1 = {
      version: 1, etape: 4, nom: 'Vieux brouillon', profil: 'barbare', peuple: 'nain',
      caracs: { methode: 'rapide', serie: 'expert', base: { FOR: 3, CON: 2, AGI: 1 } },
    };
    const lu = migrer(v1);
    vrai(lu !== null, 'le brouillon est rattrapé');
    egal(lu.version, VERSION_ETAT, 'version');
    egal(lu.etape, 5, 'l’écran « sexe » a décalé les suivants de +1');
    egal(lu.caracs.base.FOR, 0, 'les valeurs de la méthode rapide sont remises à zéro');
    vrai(lu.caracs.methode === undefined, 'le mode de répartition a disparu');
    egal(v1.etape, 4, 'le brouillon d’origine n’est pas modifié');
  });

  test('un brouillon v2 en série officielle garde ses valeurs', () => {
    const serie = rules.SERIES.expert.valeurs;
    const base = {};
    rules.CARACS.forEach((c, i) => { base[c] = serie[i]; });
    const lu = migrer({ version: 2, etape: 6, caracs: { methode: 'serie', serie: 'expert', base } });
    egal(lu.version, VERSION_ETAT, 'version');
    egal(lu.etape, 6, 'aucun décalage d’écran entre v2 et v3');
    egal(rules.coutTotal(lu.caracs.base), rules.BUDGET_POINTS,
      'la série placée reste valide en répartition libre');
    vrai(lu.caracs.serie === undefined, 'la série choisie a disparu');
  });

  test('un brouillon d’une version inconnue est refusé plutôt que mal lu', () => {
    vrai(migrer({ version: 99 }) === null, 'version trop récente');
    vrai(migrer({ version: 0 }) === null, 'version absurde');
    vrai(migrer(null) === null, 'brouillon vide');
  });

  test('les données couvrent les 14 profils, 8 peuples et la voie du mage', () => {
    egal(Object.keys(DATA.profils).length, 14, 'profils');
    egal(Object.keys(DATA.peuples).length, 8, 'peuples');
    egal(DATA.voieDuMage.capacites.length, 5, 'voie du mage');
    for (const slug of Object.keys(DATA.profils)) {
      const p = DATA.profils[slug];
      egal(p.voies.length, 5, 'voies de ' + slug);
      for (const v of p.voies) egal(v.capacites.length, 5, 'capacités de ' + slug + '/' + v.slug);
    }
  });

  return resultats;
}

if (typeof window !== 'undefined') {
  window.lancerTests = lancerTests;
  window.FIXTURES = FIXTURES;
}
