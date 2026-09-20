/* Écran 3 — Peuple. Huit cartes, puis la fiche du peuple retenu : description, profils
   typiques, modificateur de caractéristiques, repères (âge, taille, poids, traits) et noms
   typiques. Le demi-elfe choisit ici la voie de peuple qu'il emprunte. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[3] = {
  titre: 'De quel peuple viens-tu ?',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.peuple));

    const profil = etat.profil ? DATA.profils[etat.profil] : null;
    const grille = ui.el('div', { class: 'grille-cartes' });
    for (const slug of DATA.slugsPeuples) {
      const peuple = DATA.peuples[slug];
      const typique = profil && (peuple.profilsTypiques.indexOf(profil.slug) !== -1
        || peuple.profilsTypiques.indexOf('tous') !== -1);
      grille.appendChild(ui.carte({
        titre: peuple.nom,
        resume: peuple.resume,
        detail: peuple.modificateursTexte + (typique ? ' · va bien avec ton profil' : ''),
        image: 'images/peuples/' + slug + '.png',
        selectionnee: etat.peuple === slug,
        onClick: () => choisirPeuple(ctx, slug),
      }));
    }
    bloc.appendChild(grille);

    if (etat.peuple) bloc.appendChild(fichePeuple(ctx, DATA.peuples[etat.peuple]));
  },

  valider(etat, DATA) {
    if (!etat.peuple) return ['Choisis un peuple pour continuer.'];
    const peuple = DATA.peuples[etat.peuple];
    if (!peuple.voie && !etat.voies.peupleEmprunte) {
      return ['Choisis la voie de peuple de ton demi-elfe.'];
    }
    return [];
  },
};

function choisirPeuple(ctx, slug) {
  state.modifier((s) => {
    if (s.peuple === slug) return;
    s.peuple = slug;
    s.caracs.choixPeuple = {};
    s.voies.peupleEmprunte = null;
    s.voies.sousChoix = {};
    s.touche.langues = (ctx.DATA.peuples[slug].langues || []).slice();
    s.touche.age = null;
    s.touche.tailleCm = null;
    s.touche.poidsKg = null;
  });
  ctx.rafraichir();
}

function fichePeuple(ctx, peuple) {
  const DATA = ctx.DATA;
  const bloc = ui.el('div');
  bloc.appendChild(ui.el('h3', {}, peuple.nom));
  ui.ajouter(bloc, ui.paragraphes(peuple.description));

  const profils = peuple.profilsTypiques
    .map((s) => (s === 'tous' ? 'tous' : (DATA.profils[s] ? DATA.profils[s].nom.toLowerCase() : s)))
    .join(', ');
  bloc.appendChild(ui.el('p', { class: 'detail' }, 'Profils typiques : ' + profils + '.'));

  bloc.appendChild(ui.encadre('Modificateur de caractéristiques : ' + peuple.modificateursTexte
    + '\nTu choisiras à l’étape suivante.'));

  const reperes = peuple.reperes || {};
  const listeReperes = ui.el('ul', { class: 'liste-nue' }, [
    ui.el('li', {}, 'Âge de départ : ' + (reperes.ageDepartTexte || reperes.ageDepart)
      + ' — espérance de vie : ' + (reperes.esperanceVieTexte || reperes.esperanceVie + ' ans')),
    ui.el('li', {}, 'Taille : ' + (reperes.tailleTexte || '') + ' — poids : ' + (reperes.poidsTexte || '')),
    reperes.traits ? ui.el('li', {}, 'Traits : ' + reperes.traits) : null,
  ]);
  bloc.appendChild(listeReperes);

  if (peuple.noms && peuple.noms.intro) {
    bloc.appendChild(ui.repliable('Noms typiques', [
      ui.paragraphes(peuple.noms.intro),
      ui.el('p', {}, ['Masculin : ', (peuple.noms.masculin || []).slice(0, 8).join(', '), '…']),
      ui.el('p', {}, ['Féminin : ', (peuple.noms.feminin || []).slice(0, 8).join(', '), '…']),
    ]));
  }

  // voie de peuple : automatique, sauf pour le demi-elfe
  if (peuple.voie) {
    const rang1 = peuple.voie.capacites[0];
    bloc.appendChild(ui.el('p', {}, [
      ui.el('strong', {}, peuple.voie.nom), ' — au niveau 1, tu gagnes « ', rang1.titre, ' ».',
    ]));
  } else if (peuple.voieAuChoix) {
    bloc.appendChild(ui.el('h4', {}, 'Voie de peuple'));
    ui.ajouter(bloc, ui.paragraphes(peuple.voieAuChoix.texte));
    const choix = ui.el('div', { class: 'tirage' });
    for (const slug of peuple.voieAuChoix.peuples) {
      const autre = DATA.peuples[slug];
      choix.appendChild(ui.el('button', {
        type: 'button',
        class: 'bouton bouton-petit '
          + (ctx.etat.voies.peupleEmprunte === slug ? '' : 'bouton-secondaire'),
        onclick: () => {
          state.modifier((s) => { s.voies.peupleEmprunte = slug; });
          ctx.rafraichir();
        },
      }, autre.voie.nom));
    }
    bloc.appendChild(choix);
    if (ctx.etat.voies.peupleEmprunte) {
      const voie = DATA.peuples[ctx.etat.voies.peupleEmprunte].voie;
      bloc.appendChild(ui.el('p', { class: 'detail' },
        'Au niveau 1, tu gagnes « ' + voie.capacites[0].titre + ' ».'));
    }
  }
  return bloc;
}
