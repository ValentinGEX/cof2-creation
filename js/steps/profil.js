/* Écran 3 — Profil. Quatre onglets de familles, quatorze cartes, puis la fiche du profil
   retenu : description, armes et armures, équipement de départ. Les valeurs chiffrées et
   leurs explications vivent dans le panneau « Fiche en construction », à droite. */

window.ETAPES = window.ETAPES || {};

const ORDRE_FAMILLES = ['aventuriers', 'combattants', 'mages', 'mystiques'];

window.ETAPES[3] = {
  titre: 'Quel héros allez-vous jouer ?',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    if (!etat.familleAffichee) {
      etat.familleAffichee = etat.profil ? DATA.profils[etat.profil].famille : 'aventuriers';
    }

    // onglets de familles
    const onglets = ui.el('div', { class: 'tirage' });
    for (const cle of ORDRE_FAMILLES) {
      const famille = DATA.familles[cle];
      onglets.appendChild(ui.el('button', {
        type: 'button',
        class: 'bouton bouton-petit ' + (etat.familleAffichee === cle ? '' : 'bouton-secondaire'),
        onclick: () => { etat.familleAffichee = cle; ctx.rafraichir(); },
      }, famille.nom));
    }
    bloc.appendChild(onglets);

    // pas de description de famille : le joueur choisit sur les cartes, et l'apport chiffré
    // suffit à situer ce que la famille lui donne
    const famille = DATA.familles[etat.familleAffichee];
    bloc.appendChild(ui.el('p', { class: 'apport-famille' },
      ['Vous commencez avec : ', ui.el('strong', {}, famille.resume), '.']));

    // cartes des profils de la famille
    const grille = ui.el('div', { class: 'grille-cartes' });
    for (const slug of DATA.slugsProfils) {
      const profil = DATA.profils[slug];
      if (profil.famille !== etat.familleAffichee) continue;
      grille.appendChild(ui.carte({
        titre: profil.nom,
        resume: profil.resume,
        detail: profil.caracsClesTexte,
        image: 'images/profils/' + slug + '.png',
        selectionnee: etat.profil === slug,
        onClick: () => choisirProfil(ctx, slug),
      }));
    }
    bloc.appendChild(grille);

    if (etat.profil) bloc.appendChild(ficheProfil(ctx, DATA.profils[etat.profil]));
  },

  valider(etat) {
    return etat.profil ? [] : ['Choisissez un profil pour continuer.'];
  },
};

function choisirProfil(ctx, slug) {
  state.modifier((s) => {
    if (s.profil === slug) return;
    s.profil = slug;
    // les choix qui dépendaient du profil précédent ne valent plus
    s.voies.profil = [];
    s.voies.rang2Mage = null;
    s.voies.optionsEffets = {};
    s.equipement.choix = {};
    s.equipement.sousChoix = {};
    s.equipement.armes = [];
    s.equipement.armure = null;
    s.equipement.bouclier = null;
  });
  ctx.rafraichir();
}

/** Fiche détaillée du profil choisi. */
function ficheProfil(ctx, profil) {
  const bloc = ui.el('div');
  bloc.appendChild(ui.section(profil.nom, ui.paragraphes(profil.description)));
  bloc.appendChild(ui.section('Armes et armures', ui.paragraphes(profil.armesArmures)));
  bloc.appendChild(ui.section('Équipement de départ', ui.paragraphes(profil.equipementTexte)));
  return bloc;
}
