/* Écran 4 — Peuple. Huit cartes, puis la fiche du peuple retenu en sections titrées :
   description, modificateur de caractéristiques, repères, noms typiques, voie de peuple.
   Le demi-elfe choisit ici la voie de peuple qu'il emprunte. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[4] = {
  titre: 'De quel peuple venez-vous ?',

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
        detail: peuple.modificateursTexte + (typique ? ' · va bien avec votre profil' : ''),
        image: 'images/peuples/' + slug + '.png',
        selectionnee: etat.peuple === slug,
        onClick: () => choisirPeuple(ctx, slug),
      }));
    }
    bloc.appendChild(grille);

    if (etat.peuple) bloc.appendChild(fichePeuple(ctx, DATA.peuples[etat.peuple]));
  },

  valider(etat, DATA) {
    if (!etat.peuple) return ['Choisissez un peuple pour continuer.'];
    const peuple = DATA.peuples[etat.peuple];
    if (!peuple.voie && !etat.voies.peupleEmprunte) {
      return ['Choisissez la voie de peuple de votre demi-elfe.'];
    }
    return [];
  },
};

function choisirPeuple(ctx, slug) {
  state.modifier((s) => {
    if (s.peuple === slug) return;
    s.peuple = slug;
    s.caracs.choixPeuple = {};
    s.caracs.choixPeupleIndex = [];
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

  bloc.appendChild(ui.section(peuple.nom, ui.paragraphes(peuple.description)));

  bloc.appendChild(ui.section('Modificateur de caractéristiques',
    ui.el('p', {}, peuple.modificateursTexte)));

  const reperes = peuple.reperes || {};
  bloc.appendChild(ui.section('Repères', ui.el('ul', { class: 'liste-nue' }, [
    ui.el('li', {}, 'Âge de départ : ' + (reperes.ageDepartTexte || reperes.ageDepart)
      + ' — espérance de vie : ' + (reperes.esperanceVieTexte || reperes.esperanceVie + ' ans')),
    ui.el('li', {}, 'Taille : ' + (reperes.tailleTexte || '')
      + ' — poids : ' + (reperes.poidsTexte || '')),
    reperes.traits ? ui.el('li', {}, 'Traits : ' + reperes.traits) : null,
  ])));

  if (peuple.noms && (peuple.noms.intro || (peuple.noms.masculin || []).length)) {
    const noms = ui.el('div');
    if (peuple.noms.intro) ui.ajouter(noms, ui.paragraphes(peuple.noms.intro));
    noms.appendChild(ui.el('p', {}, [ui.el('strong', {}, 'Masculin. '),
      (peuple.noms.masculin || []).slice(0, 8).join(', '), '…']));
    noms.appendChild(ui.el('p', {}, [ui.el('strong', {}, 'Féminin. '),
      (peuple.noms.feminin || []).slice(0, 8).join(', '), '…']));
    bloc.appendChild(ui.section('Noms typiques', noms));
  }

  // voie de peuple : automatique, sauf pour le demi-elfe qui emprunte celle d'un autre peuple
  if (peuple.voie) {
    bloc.appendChild(ui.section('Voie de peuple', ui.el('p', {}, [
      ui.el('strong', {}, peuple.voie.nom), ' — au niveau 1, vous gagnez « ',
      peuple.voie.capacites[0].titre, ' ».',
    ])));
  } else if (peuple.voieAuChoix) {
    const contenu = ui.el('div');
    ui.ajouter(contenu, ui.paragraphes(peuple.voieAuChoix.texte));
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
    contenu.appendChild(choix);
    if (ctx.etat.voies.peupleEmprunte) {
      const voie = DATA.peuples[ctx.etat.voies.peupleEmprunte].voie;
      contenu.appendChild(ui.el('p', { class: 'detail' },
        'Au niveau 1, vous gagnez « ' + voie.capacites[0].titre + ' ».'));
    }
    bloc.appendChild(ui.section('Voie de peuple', contenu));
  }
  return bloc;
}
