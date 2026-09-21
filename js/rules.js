/* Moteur de règles de Chroniques Oubliées Fantasy 2, niveau 1.
   Fonctions pures : aucun accès au DOM, aucune dépendance. Tout ce qui est calculé ici
   l'est à partir de l'état du personnage et des données de data/ — rien n'est stocké.

   Les formules suivent le chapitre 1 du livre (points 6 à 14) :
     PV      = (2 × PV de la famille) + CON + effets
     DR      = [2 + CON] dés (3 + CON pour les mystiques), minimum 0
     PC      = 2 + CHA (+1 pour les aventuriers) + effets
     PM      = VOL + nombre de sorts connus, seulement s'il y a au moins un sort
     Init    = 10 + PER + effets
     DEF     = 10 + AGI (plafonnée par l'armure) + armure + bouclier + effets
     Attaque = niveau + FOR (contact) / AGI (distance) / VOL (magique)
     DM      = dé de l'arme + FOR au contact (sauf mention contraire) */

const CARACS = ['AGI', 'CON', 'FOR', 'PER', 'CHA', 'INT', 'VOL'];

const SERIES = {
  polyvalent: { nom: 'Polyvalent', valeurs: [2, 2, 2, 1, 1, 0, -1] },
  expert: { nom: 'Expert', valeurs: [3, 2, 1, 1, 0, 0, -1] },
  specialiste: { nom: 'Spécialiste', valeurs: [4, 2, 1, 0, 0, -1, -1] },
};

/* Mode « répartition libre » (décision de Valentin) : budget de 7 points, valeurs de -1 à
   +4, coût croissant. Les trois séries officielles coûtent exactement 7 points. */
const BUDGET_POINTS = 7;
const COUTS = { '-1': -1, 0: 0, 1: 1, 2: 2, 3: 4, 4: 6 };
const MIN_POINTS = -1;
const MAX_POINTS = 4;

function pointBuyCost(valeur) {
  const c = COUTS[String(valeur)];
  return c === undefined ? Infinity : c;
}

function coutTotal(caracs) {
  return CARACS.reduce((total, c) => total + pointBuyCost(caracs[c] || 0), 0);
}

function signe(n) {
  return (n > 0 ? '+' : '') + n;
}

/* ------------------------------------------------------------------ caractéristiques */

/** Modificateurs de peuple effectivement appliqués (choix du joueur compris). */
function modificateursPeuple(state, DATA) {
  const peuple = DATA.peuples[state.peuple];
  if (!peuple) return {};
  const mods = {};
  const choix = (state.caracs && state.caracs.choixPeuple) || {};
  for (const carac of CARACS) {
    if (choix[carac]) mods[carac] = (mods[carac] || 0) + choix[carac];
  }
  return mods;
}

/** Caractéristiques finales : valeurs de base + modificateurs de peuple. */
function caracsFinales(state, DATA) {
  const base = (state.caracs && state.caracs.base) || {};
  const mods = modificateursPeuple(state, DATA);
  const sortie = {};
  for (const c of CARACS) sortie[c] = (base[c] || 0) + (mods[c] || 0);
  return sortie;
}

/** Le joueur a-t-il fait tous les choix de modificateur de son peuple ? */
function choixPeupleComplet(state, DATA) {
  const peuple = DATA.peuples[state.peuple];
  if (!peuple || !peuple.modificateurs) return true;
  const choix = (state.caracs && state.caracs.choixPeuple) || {};
  const nbChoisis = CARACS.filter((c) => choix[c]).length;
  return nbChoisis >= peuple.modificateurs.length;
}

/* ------------------------------------------------------------------ voies et capacités */

function voieDeProfil(DATA, profilSlug, voieSlug) {
  const profil = DATA.profils[profilSlug];
  if (!profil) return null;
  return profil.voies.find((v) => v.slug === voieSlug) || null;
}

/** Voie de peuple réellement utilisée (le demi-elfe choisit celle d'un autre peuple). */
function voieDePeuple(state, DATA) {
  const peuple = DATA.peuples[state.peuple];
  if (!peuple) return null;
  if (peuple.voie) return peuple.voie;
  const emprunt = state.voies && state.voies.peupleEmprunte;
  if (emprunt && DATA.peuples[emprunt] && DATA.peuples[emprunt].voie) {
    return DATA.peuples[emprunt].voie;
  }
  return null;
}

function estMage(state, DATA) {
  const profil = DATA.profils[state.profil];
  return !!(profil && DATA.familles[profil.famille] && DATA.familles[profil.famille].rang2Mage);
}

/** Toutes les capacités acquises au niveau 1, avec leur origine. */
function capacitesAcquises(state, DATA) {
  const acquises = [];
  const voies = state.voies || {};

  for (const slugVoie of voies.profil || []) {
    const voie = voieDeProfil(DATA, state.profil, slugVoie);
    if (!voie) continue;
    const cap = voie.capacites.find((c) => c.rang === 1);
    if (cap) acquises.push({ origine: 'profil', voie, capacite: cap, cle: state.profil + '/' + voie.slug + '/1' });
  }

  // mage : une capacité de rang 2 en plus, dans une de ses deux voies ou dans la voie du mage
  if (estMage(state, DATA) && voies.rang2Mage && voies.rang2Mage.voie) {
    if (voies.rang2Mage.voie === 'voie-du-mage') {
      const cap = DATA.voieDuMage.capacites.find((c) => c.rang === 2);
      if (cap) {
        acquises.push({
          origine: 'rang2', voie: DATA.voieDuMage, capacite: cap,
          cle: 'voie-du-mage/voie-du-mage/2',
        });
      }
    } else {
      const voie = voieDeProfil(DATA, state.profil, voies.rang2Mage.voie);
      const cap = voie && voie.capacites.find((c) => c.rang === 2);
      if (cap) acquises.push({ origine: 'rang2', voie, capacite: cap, cle: state.profil + '/' + voie.slug + '/2' });
    }
  }

  // voie de peuple, ou voie du mage à la place (le rang 1 de peuple reste acquis)
  const voiePeuple = voieDePeuple(state, DATA);
  const peupleSlug = (state.voies && state.voies.peupleEmprunte) || state.peuple;
  if (voies.peuple === 'voie-du-mage') {
    const capMage = DATA.voieDuMage.capacites.find((c) => c.rang === 1);
    if (capMage) {
      acquises.push({
        origine: 'mage', voie: DATA.voieDuMage, capacite: capMage,
        cle: 'voie-du-mage/voie-du-mage/1',
      });
    }
    if (voiePeuple) {
      const cap = voiePeuple.capacites.find((c) => c.rang === 1);
      // le mage conserve l'effet du rang 1 de sa voie de peuple, sans pouvoir la monter
      if (cap) {
        acquises.push({
          origine: 'peupleConserve', voie: voiePeuple, capacite: cap,
          cle: peupleSlug + '/' + voiePeuple.slug + '/1',
        });
      }
    }
  } else if (voiePeuple) {
    const cap = voiePeuple.capacites.find((c) => c.rang === 1);
    if (cap) {
      acquises.push({
        origine: 'peuple', voie: voiePeuple, capacite: cap,
        cle: peupleSlug + '/' + voiePeuple.slug + '/1',
      });
    }
  }

  // capacité obtenue par un sous-choix (gnome « Don étrange » : une capacité d'ensorceleur)
  const sousChoix = (voies.sousChoix || {});
  for (const cle of Object.keys(sousChoix)) {
    const valeur = sousChoix[cle];
    if (!valeur || typeof valeur !== 'object' || !valeur.profil || !valeur.voie) continue;
    const voie = voieDeProfil(DATA, valeur.profil, valeur.voie);
    const cap = voie && voie.capacites.find((c) => c.rang === (valeur.rang || 1));
    if (cap) {
      acquises.push({
        origine: 'sousChoix', voie, capacite: cap,
        cle: valeur.profil + '/' + voie.slug + '/' + (valeur.rang || 1),
      });
    }
  }
  return acquises;
}

/** Effets permanents relevés pour une capacité (data/effets.json). Les effets facultatifs
    (« il peut… s'il le souhaite ») ne comptent que si le joueur les a activés. */
function effetsDe(DATA, cle, state) {
  const entree = DATA.effets && DATA.effets[cle];
  if (!entree) return [];
  const actives = (state && state.voies && state.voies.optionsEffets) || {};
  const optionnels = actives[cle] ? (entree.optionnels || []) : [];
  return (entree.effets || []).concat(optionnels);
}

/** Effets facultatifs proposés au joueur pour une capacité. */
function optionsEffets(DATA, cle) {
  const entree = DATA.effets && DATA.effets[cle];
  return (entree && entree.optionnels) || [];
}

/* ------------------------------------------------------------------ équipement */

function armureChoisie(state, DATA) {
  const slug = state.equipement && state.equipement.armure;
  return (slug && DATA.armures[slug]) || null;
}

function bouclierChoisi(state, DATA) {
  const slug = state.equipement && state.equipement.bouclier;
  return (slug && DATA.armures[slug]) || null;
}

function conditionRemplie(condition, armure, bouclier) {
  if (!condition) return true;
  if (condition === 'sansArmure') return !armure;
  if (condition === 'armureLegere') return !armure || armure.def <= 2;
  if (condition === 'avecBouclier') return !!bouclier;
  return false;
}

/** Équipement de départ du profil, une fois les choix du joueur appliqués.
    Renvoie une liste d'objets { type, ref, nom, qte, source } où type vaut
    'arme', 'armure', 'bouclier' ou 'libre'. */
function equipementResolu(state, DATA) {
  const profil = DATA.profils[state.profil];
  if (!profil) return [];
  const choix = (state.equipement && state.equipement.choix) || {};
  const sousChoix = (state.equipement && state.equipement.sousChoix) || {};
  const sortie = [];

  function ajouter(objet, cle) {
    if (objet.libre) {
      sortie.push({ type: 'libre', nom: objet.libre, qte: objet.qte || 1 });
      return;
    }
    const ref = (objet.liste && sousChoix[cle]) ? sousChoix[cle] : objet.ref;
    const arme = DATA.armes[ref];
    if (arme) {
      sortie.push({ type: 'arme', ref, nom: arme.nom, qte: objet.qte || 1, arme });
      return;
    }
    const armure = DATA.armures[ref];
    if (armure) {
      sortie.push({
        type: armure.type === 'bouclier' ? 'bouclier' : 'armure',
        ref, nom: armure.nom, qte: 1, armure,
      });
    }
  }

  (profil.equipement || []).forEach((entree, index) => {
    if (entree.choix) {
      const option = entree.choix[choix[index] || 0] || entree.choix[0];
      option.forEach((objet, j) => ajouter(objet, index + '.' + j));
      return;
    }
    ajouter(entree, String(index));
  });
  return sortie;
}

/* ------------------------------------------------------------------ valeurs dérivées */

function computeDerived(state, DATA) {
  const profil = DATA.profils[state.profil] || null;
  const famille = profil ? DATA.familles[profil.famille] : null;
  const caracs = caracsFinales(state, DATA);
  const armure = armureChoisie(state, DATA);
  const bouclier = bouclierChoisi(state, DATA);
  const capacites = capacitesAcquises(state, DATA);

  // somme des effets permanents, avec le détail pour l'affichage
  const bonus = { PV: 0, DEF: 0, INIT: 0, PC: 0, PM: 0, DR: 0, ATT_CONTACT: 0, ATT_DISTANCE: 0, ATT_MAGIQUE: 0, DM_CONTACT: 0, DM_DISTANCE: 0 };
  const details = { PV: [], DEF: [], INIT: [], PC: [], PM: [], DR: [], ATT_CONTACT: [], ATT_DISTANCE: [], ATT_MAGIQUE: [], DM_CONTACT: [], DM_DISTANCE: [] };
  const effetsParArme = [];   // bonus aux DM réservés à certaines armes
  const notes = [];           // rappels de règles non chiffrables sur la feuille
  let caracPV = 'CON';        // le forgesort peut compter ses PV avec son INT
  for (const acquise of capacites) {
    const entree = (DATA.effets && DATA.effets[acquise.cle]) || null;
    if (entree && entree.note) notes.push({ titre: acquise.capacite.titre, texte: entree.note });
    for (const effet of effetsDe(DATA, acquise.cle, state)) {
      if (!(effet.cible in bonus)) continue;
      if (!conditionRemplie(effet.condition, armure, bouclier)) continue;
      if (effet.caracRemplace) {
        if (effet.cible === 'PV') caracPV = effet.caracRemplace.par;
        continue;
      }
      if (effet.armes && effet.armes.length) {
        effetsParArme.push({ effet, titre: acquise.capacite.titre });
        continue;
      }
      const valeur = effet.carac ? (caracs[effet.carac] || 0) : (effet.valeur || 0);
      if (!valeur) continue;
      bonus[effet.cible] += valeur;
      details[effet.cible].push({ libelle: acquise.capacite.titre, valeur });
    }
  }

  // points de vigueur
  const pvBase = famille ? famille.pv * 2 : 0;
  const pv = pvBase + caracs[caracPV] + bonus.PV;

  // dés de récupération
  const drBonus = famille ? (famille.drBonus || 0) : 0;
  const drNombre = Math.max(0, 2 + drBonus + caracs.CON + bonus.DR);
  const dr = { n: drNombre, type: famille ? famille.dr : null };

  // points de chance
  const pcBonusFamille = famille ? (famille.pcBonus || 0) : 0;
  const pc = 2 + caracs.CHA + pcBonusFamille + bonus.PC;

  // points de mana : seulement si le personnage connaît au moins un sort
  const sorts = capacites.filter((c) => c.capacite.sort);
  const pm = sorts.length ? caracs.VOL + sorts.length + bonus.PM : null;

  // initiative
  const init = 10 + caracs.PER + bonus.INIT;

  // défense : l'armure plafonne le bonus d'agilité
  const agiMax = armure && armure.agiMax !== null && armure.agiMax !== undefined ? armure.agiMax : null;
  const agiPourDef = agiMax !== null ? Math.min(caracs.AGI, agiMax) : caracs.AGI;
  const def = 10 + agiPourDef + (armure ? armure.def : 0) + (bouclier ? bouclier.def : 0) + bonus.DEF;

  // valeurs d'attaque (niveau 1)
  const niveau = 1;
  const att = {
    contact: niveau + caracs.FOR + bonus.ATT_CONTACT,
    distance: niveau + caracs.AGI + bonus.ATT_DISTANCE,
    magique: niveau + caracs.VOL + bonus.ATT_MAGIQUE,
  };

  const resultat = {
    niveau,
    caracs,
    caracsBase: (state.caracs && state.caracs.base) || {},
    modificateursPeuple: modificateursPeuple(state, DATA),
    famille: famille ? famille.nom : null,
    pv, pvDetail: { base: pvBase, con: caracs[caracPV], caracPV, effets: details.PV },
    dr, drDetail: { base: 2 + drBonus, con: caracs.CON, effets: details.DR },
    pc, pcDetail: { base: 2, cha: caracs.CHA, famille: pcBonusFamille, effets: details.PC },
    pm, pmDetail: { vol: caracs.VOL, sorts: sorts.length, effets: details.PM },
    sorts: sorts.map((s) => ({ titre: s.capacite.titre, voie: s.voie.nom })),
    init, initDetail: { base: 10, per: caracs.PER, effets: details.INIT },
    def,
    defDetail: {
      base: 10, agi: agiPourDef, agiBrute: caracs.AGI, agiPlafonnee: agiMax !== null && caracs.AGI > agiMax,
      armure: armure ? { nom: armure.nom, def: armure.def } : null,
      bouclier: bouclier ? { nom: bouclier.nom, def: bouclier.def } : null,
      effets: details.DEF,
    },
    att,
    attDetail: {
      contact: { niveau, carac: caracs.FOR, effets: details.ATT_CONTACT },
      distance: { niveau, carac: caracs.AGI, effets: details.ATT_DISTANCE },
      magique: { niveau, carac: caracs.VOL, effets: details.ATT_MAGIQUE },
    },
    capacites,
    armes: armesDuPersonnage(state, DATA, caracs, att, bonus, effetsParArme),
    notes,
    bonus,
  };
  resultat.avertissements = warnings(state, DATA, resultat);
  return resultat;
}

/** Les armes retenues pour la feuille : valeur d'attaque et dommages. */
function armesDuPersonnage(state, DATA, caracs, att, bonus, effetsParArme) {
  const choisies = (state.equipement && state.equipement.armes) || [];
  return choisies.map((slug) => {
    const arme = DATA.armes[slug];
    if (!arme) return { nom: slug, att: null, dm: '', special: '' };
    const distance = arme.categorie === 'distance';
    const valeurAtt = distance ? att.distance : att.contact;
    let dm = arme.dm;
    if (arme.dmDeuxMains) dm += '/' + arme.dmDeuxMains;
    let modDm = 0;
    if (!distance && arme.forAuxDM !== false) modDm += caracs.FOR;
    modDm += distance ? bonus.DM_DISTANCE : bonus.DM_CONTACT;
    // bonus réservés à certaines armes (Archer émérite à l'arc, Doigts agiles aux dagues…)
    for (const { effet } of (effetsParArme || [])) {
      const bonneCible = effet.cible === (distance ? 'DM_DISTANCE' : 'DM_CONTACT');
      if (bonneCible && effet.armes.indexOf(slug) !== -1) {
        modDm += effet.carac ? (caracs[effet.carac] || 0) : (effet.valeur || 0);
      }
    }
    if (modDm) dm += signe(modDm);
    const special = [arme.portee ? 'Portée ' + arme.portee : null, arme.notes || null]
      .filter(Boolean).join(' — ');
    return { slug, nom: arme.nom, att: valeurAtt, dm, special, categorie: arme.categorie };
  });
}

/* ------------------------------------------------------------------ avertissements */

/** Avertissements affichés au joueur. Ils n'empêchent jamais de continuer. */
function warnings(state, DATA, derive) {
  const messages = [];
  const profil = DATA.profils[state.profil];
  if (!profil) return messages;
  const caracs = derive.caracs;

  if (profil.caracMagie && caracs[profil.caracMagie] < 1) {
    messages.push('Votre caractéristique de magie (' + profil.caracMagie + ') est inférieure '
      + 'à +1 : vos sorts de magie seront peu efficaces.');
  }
  for (const cle of profil.caracsCles || []) {
    const codes = Array.isArray(cle) ? cle : [cle];
    const meilleure = Math.max.apply(null, codes.map((c) => caracs[c]));
    if (meilleure <= 0) {
      messages.push('Votre valeur de ' + codes.join(' ou ') + ' est de ' + signe(meilleure)
        + ' : c’est faible pour un ' + profil.nom.toLowerCase() + '.');
    }
  }
  if (caracs.CON <= -2) {
    messages.push('Avec une CON de ' + signe(caracs.CON)
      + ', vous n’avez aucun dé de récupération.');
  }
  if (caracs.INT < 0) {
    messages.push('Avec une INT négative, votre personnage ne sait ni lire ni écrire.');
  }
  if (derive.defDetail.agiPlafonnee) {
    messages.push('Votre armure (' + derive.defDetail.armure.nom + ') plafonne votre bonus '
      + 'd’AGI à ' + signe(derive.defDetail.agi) + ' pour la Défense.');
  }
  if (profil.caracMagie && !derive.sorts.length) {
    messages.push('Vous n’avez choisi aucun sort : votre personnage n’a pas de points de mana.');
  }
  if (state.peuple === 'halfelin') {
    const armes = (state.equipement && state.equipement.armes) || [];
    const lourde = armes.map((s) => DATA.armes[s]).filter(Boolean)
      .find((a) => a.categorie === 'contact' && !a.deuxMains && dmMaximal(a.dm) > 6);
    if (lourde) {
      messages.push('Rappel de la capacité Petite taille : un halfelin ne peut pas utiliser '
        + 'à une main une arme dont les DM dépassent 1d6 (' + lourde.nom + ').');
    }
  }
  return messages;
}

/** Valeur maximale d'un dé de dommages écrit « 1d8 » ou « 2d6 ». */
function dmMaximal(dm) {
  const m = /(\d*)d(\d+)/.exec(dm || '');
  if (!m) return 0;
  return (parseInt(m[1] || '1', 10)) * parseInt(m[2], 10);
}

/* ------------------------------------------------------------------ méthode rapide */

/** Méthode rapide du livre : série expert, les trois meilleures valeurs sur les trois
    caractéristiques clés du profil, le reste à 0 (le dernier +1 et le -1 au choix). */
function methodeRapide(profil) {
  const valeurs = { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 };
  const cles = (profil.caracsCles || []).map((c) => (Array.isArray(c) ? c[0] : c));
  const meilleures = [3, 2, 1];
  cles.forEach((carac, i) => { if (meilleures[i] !== undefined) valeurs[carac] = meilleures[i]; });
  return valeurs;
}

/* ------------------------------------------------------------------ export */

const rules = {
  CARACS, SERIES, BUDGET_POINTS, MIN_POINTS, MAX_POINTS,
  pointBuyCost, coutTotal, signe,
  caracsFinales, modificateursPeuple, choixPeupleComplet,
  capacitesAcquises, voieDePeuple, voieDeProfil, estMage, optionsEffets, equipementResolu,
  computeDerived, warnings, methodeRapide, dmMaximal,
};

if (typeof module !== 'undefined' && module.exports) module.exports = rules;
if (typeof window !== 'undefined') window.rules = rules;
