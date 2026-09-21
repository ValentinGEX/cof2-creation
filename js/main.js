/* Démarrage, routeur d'étapes et panneau « Fiche en construction ».

   Chaque écran s'enregistre dans window.ETAPES sous son numéro et expose :
     titre            libellé affiché en haut de l'écran
     rendre(bloc, ctx) construit le contenu
     valider(state, DATA) → liste d'erreurs (vide = on peut continuer)
     sansFiche        vrai pour les écrans où le panneau latéral n'a pas de sens */

window.ETAPES = window.ETAPES || {};

/* Numérotation des écrans : 0 accueil · 1 bienvenue · 2 sexe · 3 profil · 4 peuple ·
   5 caractéristiques · 6 voies · 7 équipement · 8 touche finale · 9 histoire · 10 récap. */
const app = {
  DATA: null,
  derniereEtape: 10,
  etapeAffichee: null,

  async demarrer() {
    const bloc = document.getElementById('ecran');
    try {
      app.DATA = await loadAll();
    } catch (e) {
      ui.vider(bloc);
      bloc.appendChild(ui.el('h2', {}, 'Les données n’ont pas pu être chargées'));
      bloc.appendChild(ui.el('p', {}, e.message));
      bloc.appendChild(ui.el('p', {}, 'Lancez l’application depuis un serveur local : '
        + 'python3 -m http.server 8000, puis ouvrez http://localhost:8000/'));
      return;
    }
    state.surChangement(() => app.majFiche());
    app.afficher(0);
  },

  contexte() {
    return {
      DATA: app.DATA,
      etat: state.courant,
      rafraichir: () => app.afficher(state.courant.etape),
      allerA: (n) => app.afficher(n),
      majFiche: () => app.majFiche(),
    };
  },

  afficher(numero) {
    const etape = window.ETAPES[numero];
    if (!etape) return;
    // un simple rafraîchissement reconstruit l'écran : on rend sa place au lecteur au lieu
    // de le renvoyer en haut de page à chaque clic
    const changementEcran = app.etapeAffichee !== numero;
    const position = window.scrollY;
    state.courant.etape = numero;
    if (numero > 0) state.sauver();

    const bloc = ui.vider(document.getElementById('ecran'));
    ui.cacherInfobulle();
    if (etape.titre) bloc.appendChild(ui.el('h2', {}, etape.titre));
    etape.rendre(bloc, app.contexte());

    const navigation = document.getElementById('navigation');
    navigation.hidden = !!etape.sansNavigation;
    document.getElementById('precedent').disabled = numero <= 1;
    const suivant = document.getElementById('suivant');
    suivant.textContent = numero === app.derniereEtape ? 'Terminé' : 'Suivant →';
    suivant.hidden = numero === app.derniereEtape;

    document.getElementById('application').classList.toggle('sans-fiche', !!etape.sansFiche);
    document.getElementById('fiche').hidden = !!etape.sansFiche;
    app.majFiche();
    if (changementEcran) window.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: position });
    app.etapeAffichee = numero;
    app.majErreurs();
  },

  majErreurs() {
    const etape = window.ETAPES[state.courant.etape];
    const zone = document.getElementById('erreurs');
    const suivant = document.getElementById('suivant');
    if (!etape || !etape.valider) {
      zone.textContent = '';
      suivant.disabled = false;
      return [];
    }
    const erreurs = etape.valider(state.courant, app.DATA) || [];
    zone.textContent = erreurs.length ? erreurs[0] : '';
    suivant.disabled = erreurs.length > 0;
    return erreurs;
  },

  /* ---------------------------------------------------------------- panneau fiche */

  majFiche() {
    app.majErreurs();
    const contenu = document.getElementById('fiche-contenu');
    if (!contenu || document.getElementById('fiche').hidden) return;
    const etat = state.courant;
    ui.vider(contenu);
    if (!etat.profil) {
      contenu.appendChild(ui.el('p', { class: 'detail' },
        'Choisissez un profil : les valeurs se calculeront toutes seules.'));
      return;
    }
    const d = rules.computeDerived(etat, app.DATA);
    const profil = app.DATA.profils[etat.profil];
    const peuple = etat.peuple ? app.DATA.peuples[etat.peuple] : null;

    contenu.appendChild(ui.el('p', { class: 'detail' },
      [etat.nom || 'Sans nom', ' — ', peuple ? peuple.nom + ' ' : '', profil.nom.toLowerCase()].join('')));

    const caracs = ui.el('dl');
    for (const c of rules.CARACS) {
      caracs.appendChild(ui.el('dt', {}, [c, ui.aideMaison(app.DATA, c)]));
      caracs.appendChild(ui.el('dd', {}, ui.signe(d.caracs[c])));
    }
    contenu.appendChild(caracs);

    const valeurs = ui.el('dl');
    const ligne = (libelle, valeur, cleAide) => {
      valeurs.appendChild(ui.el('dt', {}, [libelle, ui.aideMaison(app.DATA, cleAide)]));
      valeurs.appendChild(ui.el('dd', {}, String(valeur)));
    };
    ligne('PV', d.pv, 'PV');
    ligne('DEF', d.def, 'DEF');
    ligne('Init.', d.init, 'INIT');
    ligne('PC', d.pc, 'PC');
    ligne('DR', d.dr.n + ' ' + (d.dr.type || ''), 'DR');
    if (d.pm !== null) ligne('PM', d.pm, 'PM');
    ligne('Contact', ui.signe(d.att.contact), 'ATT_CONTACT');
    ligne('Distance', ui.signe(d.att.distance), 'ATT_DISTANCE');
    ligne('Magique', ui.signe(d.att.magique), 'ATT_MAGIQUE');
    contenu.appendChild(valeurs);

    if (d.avertissements.length) {
      const liste = ui.el('ul', { class: 'liste-nue avertissements' });
      for (const message of d.avertissements) liste.appendChild(ui.el('li', {}, '⚠ ' + message));
      contenu.appendChild(liste);
    }
  },
};

document.getElementById('precedent').addEventListener('click', () => {
  app.afficher(Math.max(1, state.courant.etape - 1));
});

document.getElementById('suivant').addEventListener('click', () => {
  const erreurs = app.majErreurs();
  if (erreurs.length) return;
  app.afficher(Math.min(app.derniereEtape, state.courant.etape + 1));
});

document.addEventListener('DOMContentLoaded', () => app.demarrer());
window.app = app;
