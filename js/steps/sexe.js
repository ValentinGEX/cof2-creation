/* Écran 2 — Le sexe du personnage. Premier choix qui le concerne : il guide les listes de
   noms de son peuple et l'illustration que le joueur fera générer à la fin.

   Les symboles ♂ et ♀ restent écrits ici, jamais dans data/ : le contrôle d'intégrité exige
   que toutes les données soient encodables dans la police de la feuille PDF, ce qui n'est pas
   le cas de ces deux caractères. Chaque bouton porte aussi son libellé en toutes lettres,
   pour les lecteurs d'écran comme pour les polices qui ne dessinent pas ces glyphes. */

window.ETAPES = window.ETAPES || {};

const SEXES = [
  { valeur: 'M', glyphe: '♂', libelle: 'Masculin' },
  { valeur: 'F', glyphe: '♀', libelle: 'Féminin' },
];

window.ETAPES[2] = {
  titre: 'Homme ou femme ?',
  sansFiche: true,

  rendre(bloc, ctx) {
    bloc.appendChild(ui.el('p', {}, ctx.DATA.creation.maison.ecrans.sexe));

    const choix = ui.el('div', { class: 'choix-sexe' });
    for (const sexe of SEXES) {
      const actif = ctx.etat.touche.genre === sexe.valeur;
      choix.appendChild(ui.el('button', {
        type: 'button', class: 'carte-sexe',
        'aria-pressed': actif ? 'true' : 'false',
        onclick: () => {
          state.modifier((s) => { s.touche.genre = sexe.valeur; });
          ctx.rafraichir();
        },
      }, [
        ui.el('span', { class: 'glyphe-sexe', 'aria-hidden': 'true' }, sexe.glyphe),
        ui.el('span', {}, sexe.libelle),
      ]));
    }
    bloc.appendChild(choix);
  },

  valider(etat) {
    return etat.touche.genre ? [] : ['Choisissez le sexe de votre personnage pour continuer.'];
  },
};
