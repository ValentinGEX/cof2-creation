/* État du personnage et brouillon local.

   Rien n'est envoyé nulle part : le brouillon vit dans le localStorage du navigateur du
   joueur (clé cof2.brouillon.v1), le portrait à part (cof2.portrait.v1) parce qu'il pèse
   plus lourd. Les valeurs dérivées (PV, DEF, attaques…) ne sont jamais stockées : elles
   sont recalculées par rules.computeDerived(). */

const CLE_BROUILLON = 'cof2.brouillon.v1';
const CLE_PORTRAIT = 'cof2.portrait.v1';
const VERSION_ETAT = 3;

function etatNeuf() {
  return {
    version: VERSION_ETAT,
    etape: 1,
    joueur: '',
    nom: '',
    profil: null,
    peuple: null,
    caracs: {
      base: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
      choixPeuple: {},        // caractéristique -> modificateur appliqué
      choixPeupleIndex: [],   // caractéristique choisie pour chaque modificateur du peuple
    },
    voies: {
      profil: [],
      peuple: null,
      peupleEmprunte: null,
      rang2Mage: null,
      sousChoix: {},
    },
    equipement: {
      choix: {},
      sousChoix: {},
      bourse: null,
      armes: [],
      armure: null,
      bouclier: null,
      libre: '',
    },
    touche: {
      genre: null,
      ideal: null,
      travers: null,
      secret: null,
      bizarrerie: null,
      age: null,
      tailleCm: null,
      poidsKg: null,
      langues: [],
      languesBonus: [],
      description: '',
    },
    histoire: '',
    promptPerso: null,
  };
}

/** Brouillon d'une version antérieure : on le rattrape plutôt que de le jeter, en passant
    par toutes les versions intermédiaires.
      v1 → v2 : l'écran « sexe » s'est intercalé en position 2, les suivants ont pris +1 ;
                le mode de caractéristiques « rapide » n'existe plus.
      v2 → v3 : il ne reste que la répartition libre. Rien n'est perdu : les deux modes
                écrivaient dans caracs.base, et les trois séries officielles coûtent
                exactement 7 points, donc une série déjà placée reste valide telle quelle. */
const MIGRATIONS = {
  1(copie) {
    copie.etape = (copie.etape >= 2) ? copie.etape + 1 : copie.etape;
    if (copie.caracs && copie.caracs.methode === 'rapide') {
      // les valeurs de la méthode rapide ne forment pas une série complète : on repart à zéro
      copie.caracs.base = { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 };
    }
  },
  2(copie) {
    if (copie.caracs) {
      delete copie.caracs.methode;
      delete copie.caracs.serie;
    }
  },
};

function migrer(lu) {
  if (!lu || typeof lu !== 'object') return null;
  if (lu.version === VERSION_ETAT) return lu;
  if (typeof lu.version !== 'number' || lu.version < 1 || lu.version > VERSION_ETAT) return null;
  const copie = JSON.parse(JSON.stringify(lu));
  for (let v = lu.version; v < VERSION_ETAT; v++) {
    const etape = MIGRATIONS[v];
    if (!etape) return null;
    etape(copie);
    copie.version = v + 1;
  }
  return copie;
}

const state = {
  courant: etatNeuf(),
  ecouteurs: [],

  /** Remplace l'état courant et prévient les écouteurs. */
  remplacer(nouvel) {
    this.courant = nouvel;
    this.sauver();
    this.notifier();
  },

  reinitialiser() {
    this.courant = etatNeuf();
    try {
      localStorage.removeItem(CLE_BROUILLON);
      localStorage.removeItem(CLE_PORTRAIT);
    } catch (e) { /* stockage indisponible : on continue sans brouillon */ }
    this.notifier();
  },

  /** Modifie l'état (fonction de mutation), sauvegarde et notifie. */
  modifier(fn) {
    fn(this.courant);
    this.sauver();
    this.notifier();
  },

  surChangement(fn) { this.ecouteurs.push(fn); },

  notifier() {
    for (const fn of this.ecouteurs) fn(this.courant);
  },

  sauver() {
    try {
      localStorage.setItem(CLE_BROUILLON, JSON.stringify(this.courant));
    } catch (e) {
      console.warn('Brouillon non sauvegardé :', e.message);
    }
  },

  /** Brouillon présent dans ce navigateur ? */
  brouillonExiste() {
    try {
      const brut = localStorage.getItem(CLE_BROUILLON);
      if (!brut) return false;
      return !!migrer(JSON.parse(brut));
    } catch (e) { return false; }
  },

  /** Résumé du brouillon pour l'écran d'accueil. */
  resumeBrouillon() {
    try {
      const lu = migrer(JSON.parse(localStorage.getItem(CLE_BROUILLON)));
      if (!lu) return null;
      return { nom: lu.nom, profil: lu.profil, peuple: lu.peuple, etape: lu.etape };
    } catch (e) { return null; }
  },

  charger() {
    try {
      const lu = migrer(JSON.parse(localStorage.getItem(CLE_BROUILLON)));
      if (!lu) return false;
      // fusion avec un état neuf : un brouillon plus ancien peut manquer de champs
      this.courant = fusionner(etatNeuf(), lu);
      this.notifier();
      return true;
    } catch (e) { return false; }
  },

  /* ---- portrait (data URL JPEG, stocké à part pour ne pas alourdir le brouillon) ---- */

  portrait() {
    try { return localStorage.getItem(CLE_PORTRAIT); } catch (e) { return null; }
  },

  enregistrerPortrait(dataUrl) {
    try {
      localStorage.setItem(CLE_PORTRAIT, dataUrl);
      return true;
    } catch (e) {
      console.warn('Portrait non enregistré :', e.message);
      return false;
    }
  },

  effacerPortrait() {
    try { localStorage.removeItem(CLE_PORTRAIT); } catch (e) { /* rien à faire */ }
  },
};

/** Fusion récursive : les valeurs du brouillon l'emportent, la forme reste celle du neuf. */
function fusionner(modele, lu) {
  if (Array.isArray(modele)) return Array.isArray(lu) ? lu : modele;
  if (modele && typeof modele === 'object') {
    const sortie = {};
    for (const cle of Object.keys(modele)) {
      sortie[cle] = (lu && cle in lu) ? fusionner(modele[cle], lu[cle]) : modele[cle];
    }
    // champs ajoutés par le brouillon (sous-choix libres, etc.)
    if (lu && typeof lu === 'object') {
      for (const cle of Object.keys(lu)) if (!(cle in sortie)) sortie[cle] = lu[cle];
    }
    return sortie;
  }
  return lu === undefined ? modele : lu;
}

if (typeof window !== 'undefined') {
  window.state = state;
  window.etatNeuf = etatNeuf;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { state, etatNeuf, fusionner, migrer, CLE_BROUILLON, CLE_PORTRAIT,
    VERSION_ETAT };
}
