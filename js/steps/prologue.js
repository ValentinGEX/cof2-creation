/* Écran 1 — Bienvenue. La carte des Terres d'Osgild, le monde en deux paragraphes, le texte
   « Rôle » du livre, puis le prénom du joueur. Rien n'est replié : tout se lit d'affilée. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[1] = {
  titre: 'Bienvenue, aventurier !',
  sansFiche: true,

  rendre(bloc, ctx) {
    const maison = ctx.DATA.creation.maison;

    bloc.appendChild(ui.image('images/carte-osgild.jpg', 'Carte des Terres d’Osgild',
      'image-monde'));

    for (const paragraphe of maison.prologue) {
      bloc.appendChild(ui.el('p', {}, paragraphe));
    }

    bloc.appendChild(ui.section('Votre rôle', ui.paragraphes(ctx.DATA.creation.livre.role)));

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
