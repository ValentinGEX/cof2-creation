/* Écran 1 — Prologue. Texte d'ambiance maison, nom du joueur (obligatoire), concept
   facultatif, et le texte « Rôle » du livre replié derrière un bouton. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[1] = {
  titre: 'Les Terres d’Osgild',
  sansFiche: true,

  rendre(bloc, ctx) {
    const maison = ctx.DATA.creation.maison;
    for (const paragraphe of maison.prologue) {
      bloc.appendChild(ui.el('p', {}, paragraphe));
    }

    bloc.appendChild(ui.repliable('Lire l’extrait du livre — « 1 · Rôle »',
      ctx.DATA.creation.livre.role));

    const champNom = ui.el('input', {
      type: 'text', id: 'champ-joueur', value: ctx.etat.joueur || '',
      placeholder: 'Ton prénom',
      oninput: (e) => state.modifier((s) => { s.joueur = e.target.value.trim(); }),
    });
    bloc.appendChild(ui.el('label', { for: 'champ-joueur' }, 'Ton nom, à toi qui joues'));
    bloc.appendChild(champNom);

    const champConcept = ui.el('input', {
      type: 'text', id: 'champ-concept', value: ctx.etat.concept || '',
      placeholder: 'Une naine bourrue qui parle aux pierres, un escroc au grand cœur…',
      oninput: (e) => state.modifier((s) => { s.concept = e.target.value; }),
    });
    bloc.appendChild(ui.el('label', { for: 'champ-concept' },
      'En une phrase, le personnage que tu as en tête (facultatif)'));
    bloc.appendChild(champConcept);
  },

  valider(etat) {
    return etat.joueur && etat.joueur.trim() ? [] : ['Indique ton nom pour continuer.'];
  },
};
