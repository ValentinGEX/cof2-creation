/* Écran 2 — Profil. Quatre onglets de familles, quatorze cartes, puis la fiche détaillée
   du profil retenu (description, armes et armures, équipement de départ, aperçu des voies). */

const ORDRE_FAMILLES = ['aventuriers', 'combattants', 'mages', 'mystiques'];

window.ETAPES = window.ETAPES || {};

window.ETAPES[2] = {
  titre: 'Quel héros vas-tu jouer ?',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    if (!etat.familleAffichee) {
      etat.familleAffichee = etat.profil ? DATA.profils[etat.profil].famille : 'aventuriers';
    }

    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.profil));

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
    onglets.appendChild(ui.aideDonnee(DATA, 'FAMILLE'));
    bloc.appendChild(onglets);

    const famille = DATA.familles[etat.familleAffichee];
    const resume = ui.el('p', { class: 'detail' }, [
      famille.resume, ' ',
      ui.aideDonnee(DATA, 'PV'), ui.aideDonnee(DATA, 'DR'), ui.aideDonnee(DATA, 'PC'),
    ]);
    bloc.appendChild(resume);
    bloc.appendChild(ui.repliable('Lire l’extrait du livre — ' + famille.nom, famille.description));

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
    return etat.profil ? [] : ['Choisis un profil pour continuer.'];
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
    if (s.caracs.methode === 'rapide') {
      s.caracs.base = rules.methodeRapide(ctx.DATA.profils[slug]);
    }
  });
  ctx.rafraichir();
}

/** Fiche détaillée du profil choisi. */
function ficheProfil(ctx, profil) {
  const DATA = ctx.DATA;
  const bloc = ui.el('div');
  bloc.appendChild(ui.el('h3', {}, profil.nom));
  ui.ajouter(bloc, ui.paragraphes(profil.description));

  const famille = DATA.familles[profil.famille];
  bloc.appendChild(ui.el('p', { class: 'detail' },
    ['Famille : ' + famille.nom + ' — ' + profil.pvText]));

  bloc.appendChild(ui.repliable('Armes et armures',
    profil.armesArmures + (profil.citationArmure ? '' : '')));
  bloc.appendChild(ui.repliable('Équipement de départ', profil.equipementTexte));

  const voies = ui.el('div');
  voies.appendChild(ui.el('h4', {}, ['Les cinq voies du ', profil.nom.toLowerCase(),
    ui.aideDonnee(DATA, 'VOIES')]));
  const liste = ui.el('ul', { class: 'liste-nue' });
  for (const voie of profil.voies) {
    const rang1 = voie.capacites[0];
    liste.appendChild(ui.el('li', {}, [
      ui.el('strong', {}, voie.nom), ' — ', rang1.titre,
      rang1.sort ? ui.el('span', { class: 'sort' }, '*') : null,
    ]));
  }
  voies.appendChild(liste);
  bloc.appendChild(voies);
  return bloc;
}
