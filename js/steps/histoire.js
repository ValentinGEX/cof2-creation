/* Écran 8 — Histoire. Guide maison, rappel des quatre traits tirés, champ limité à une
   demi-page (compteur). Le texte ira sur la page annexe du PDF. */

const LIMITE_HISTOIRE = 1800;

window.ETAPES = window.ETAPES || {};

window.ETAPES[8] = {
  titre: 'Ton histoire',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.histoire));
    for (const paragraphe of DATA.creation.maison.guideHistoire) {
      bloc.appendChild(ui.el('p', {}, paragraphe));
    }

    bloc.appendChild(ui.repliable('Les questions du livre', DATA.creation.livre.questionsHistoire));

    const rappel = ui.el('ul', { class: 'liste-nue' }, [
      ui.el('li', {}, ['Idéal : ', ui.el('strong', {}, etat.touche.ideal || '—')]),
      ui.el('li', {}, ['Travers : ', ui.el('strong', {}, etat.touche.travers || '—')]),
      ui.el('li', {}, ['Secret : ', ui.el('strong', {}, etat.touche.secret || '—')]),
      ui.el('li', {}, ['Bizarrerie : ', ui.el('strong', {}, etat.touche.bizarrerie || '—')]),
    ]);
    bloc.appendChild(ui.encadre(rappel));

    const compteur = ui.el('p', { class: 'compteur' });
    const zone = ui.el('textarea', {
      style: 'min-height:14rem',
      placeholder: 'D’où viens-tu ? Qu’as-tu fait avant ? Pourquoi es-tu parti ?',
      oninput: (e) => {
        state.modifier((s) => { s.histoire = e.target.value; });
        majCompteur(compteur, e.target.value);
      },
    }, etat.histoire || '');
    bloc.appendChild(zone);
    majCompteur(compteur, etat.histoire || '');
    bloc.appendChild(compteur);
  },

  valider(etat) {
    if ((etat.histoire || '').length > LIMITE_HISTOIRE) {
      return ['Ton histoire dépasse la demi-page : raccourcis-la un peu.'];
    }
    return [];
  },
};

function majCompteur(noeud, texte) {
  const n = (texte || '').length;
  noeud.textContent = n + ' / ' + LIMITE_HISTOIRE + ' caractères'
    + (n > LIMITE_HISTOIRE ? ' — c’est trop long pour la page annexe.' : '');
  noeud.className = 'compteur' + (n > LIMITE_HISTOIRE ? ' trop' : '');
}
