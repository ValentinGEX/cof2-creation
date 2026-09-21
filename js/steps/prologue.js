/* Écran 1 — Bienvenue. La carte des Terres d'Osgild, la présentation du monde et le texte
   « Rôle », tous deux repris du livre, puis le prénom du joueur. Rien n'est replié. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[1] = {
  titre: 'Bienvenue, aventurier !',
  sansFiche: true,

  rendre(bloc, ctx) {
    const livre = ctx.DATA.creation.livre;

    bloc.appendChild(ui.image('images/carte-osgild.jpg', 'Carte des Terres d’Osgild',
      'image-monde'));

    bloc.appendChild(ui.section('Les Terres d’Osgild', ui.paragraphes(livre.osgild)));
    bloc.appendChild(ui.section('Votre rôle', ui.paragraphes(livre.role)));

    const champNom = ui.el('input', {
      type: 'text', id: 'champ-joueur', value: ctx.etat.joueur || '',
      placeholder: 'Votre prénom',
      oninput: (e) => state.modifier((s) => { s.joueur = e.target.value.trim(); }),
    });
    const bas = ui.section(null, [
      ui.el('label', { for: 'champ-joueur' }, 'Quel est votre prénom de joueur ?'),
      champNom,
    ]);
    bloc.appendChild(bas);
  },

  valider(etat) {
    return etat.joueur && etat.joueur.trim() ? [] : ['Indiquez votre prénom pour continuer.'];
  },
};
