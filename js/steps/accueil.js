/* Écran 0 — Accueil. Deux boutons, rien d'autre : « Nouveau personnage » et « Reprendre ».
   Le second est désactivé tant qu'aucun brouillon n'a été enregistré dans ce navigateur. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[0] = {
  titre: null,
  sansFiche: true,
  sansNavigation: true,

  rendre(bloc, ctx) {
    const zone = ui.el('div', { class: 'ecran-accueil' });

    zone.appendChild(ui.el('button', {
      type: 'button', class: 'bouton',
      onclick: () => { state.reinitialiser(); ctx.allerA(1); },
    }, 'Nouveau personnage'));

    const brouillon = state.brouillonExiste() ? state.resumeBrouillon() : null;
    const profil = brouillon && brouillon.profil ? ctx.DATA.profils[brouillon.profil] : null;
    const peuple = brouillon && brouillon.peuple ? ctx.DATA.peuples[brouillon.peuple] : null;
    const resume = brouillon
      ? [brouillon.nom || 'personnage sans nom', peuple ? peuple.nom : null,
        profil ? profil.nom.toLowerCase() : null].filter(Boolean).join(', ')
      : 'Aucun personnage commencé sur cet ordinateur';

    zone.appendChild(ui.el('button', {
      type: 'button', class: 'bouton bouton-secondaire',
      disabled: !brouillon, title: resume,
      onclick: () => { if (state.charger()) ctx.allerA(state.courant.etape || 1); },
    }, 'Reprendre'));

    bloc.appendChild(zone);
  },
};
