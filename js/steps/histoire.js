/* Écran 9 — Histoire. Le guide, les questions du livre dans la foulée, le rappel des quatre
   traits, puis un champ limité à une demi-page. Le texte ira sur la page annexe du PDF. */

window.ETAPES = window.ETAPES || {};

const LIMITE_HISTOIRE = 1800;

window.ETAPES[9] = {
  titre: 'Votre histoire',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.histoire));
    for (const paragraphe of DATA.creation.maison.guideHistoire) {
      bloc.appendChild(ui.el('p', {}, paragraphe));
    }
    ui.ajouter(bloc, ui.paragraphes(DATA.creation.livre.questionsHistoire));

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
      placeholder: 'D’où venez-vous ? Qu’avez-vous fait avant ? Pourquoi être parti ?',
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
      return ['Votre histoire dépasse la demi-page : raccourcissez-la un peu.'];
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
