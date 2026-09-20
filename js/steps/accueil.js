/* Écran 0 — Accueil. « Nouveau personnage » et, s'il existe un brouillon dans ce
   navigateur, « Reprendre ». Rien n'est envoyé nulle part. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[0] = {
  titre: null,
  sansFiche: true,
  sansNavigation: true,

  rendre(bloc, ctx) {
    const maison = ctx.DATA.creation.maison;
    bloc.appendChild(ui.el('h2', {}, maison.accueilTitre));
    bloc.appendChild(ui.el('p', { class: 'detail' }, maison.accueilSousTitre));
    bloc.appendChild(ui.el('p', {}, maison.accueilTexte));
    bloc.appendChild(ui.separateur());

    const boutons = ui.el('div', { class: 'tirage' });
    boutons.appendChild(ui.el('button', {
      type: 'button', class: 'bouton',
      onclick: () => { state.reinitialiser(); ctx.allerA(1); },
    }, 'Nouveau personnage'));

    if (state.brouillonExiste()) {
      const resume = state.resumeBrouillon() || {};
      const profil = resume.profil ? ctx.DATA.profils[resume.profil] : null;
      const peuple = resume.peuple ? ctx.DATA.peuples[resume.peuple] : null;
      boutons.appendChild(ui.el('button', {
        type: 'button', class: 'bouton bouton-secondaire',
        onclick: () => {
          if (state.charger()) ctx.allerA(state.courant.etape || 1);
        },
      }, 'Reprendre'));
      bloc.appendChild(boutons);
      bloc.appendChild(ui.el('p', { class: 'detail' },
        'Brouillon trouvé : ' + [resume.nom || 'personnage sans nom',
          peuple ? peuple.nom : null, profil ? profil.nom.toLowerCase() : null]
          .filter(Boolean).join(', ') + '.'));
    } else {
      bloc.appendChild(boutons);
    }

    bloc.appendChild(ui.el('p', { class: 'detail' },
      'Ton brouillon reste dans ce navigateur, sur cet ordinateur. Rien n’est envoyé sur '
      + 'Internet : à la fin, tu télécharges ta feuille et tu l’envoies toi-même à ton MJ.'));
  },
};
