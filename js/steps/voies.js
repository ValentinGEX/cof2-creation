/* Écran 5 — Voies et capacités.

   Deux voies de profil (capacité de rang 1 chacune) + la voie de peuple. Les mages ont en
   plus une capacité de rang 2, et peuvent remplacer leur voie de peuple par la voie du mage
   (ils gardent alors l'effet du rang 1 de leur peuple, sans pouvoir monter cette voie). */

window.ETAPES = window.ETAPES || {};

window.ETAPES[5] = {
  titre: 'Tes voies',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    const profil = DATA.profils[etat.profil];
    bloc.appendChild(ui.el('p', {}, [DATA.creation.maison.ecrans.voies,
      ui.aideDonnee(DATA, 'VOIES')]));

    // ---- les cinq voies du profil
    bloc.appendChild(ui.el('h3', {}, 'Choisis deux voies de ' + profil.nom.toLowerCase()));
    for (const voie of profil.voies) {
      bloc.appendChild(carteVoie(ctx, voie, etat.voies.profil.indexOf(voie.slug) !== -1,
        () => basculerVoie(ctx, voie.slug)));
    }

    // ---- voie de peuple (ou voie du mage)
    bloc.appendChild(ui.el('hr', { class: 'separateur' }));
    bloc.appendChild(sectionPeuple(ctx));

    // ---- capacité de rang 2 des mages
    if (rules.estMage(etat, DATA)) {
      bloc.appendChild(ui.el('hr', { class: 'separateur' }));
      bloc.appendChild(sectionRang2(ctx));
    }

    // ---- sous-choix (Diversité, Don étrange) et options
    const extras = sousChoix(ctx);
    if (extras) {
      bloc.appendChild(ui.el('hr', { class: 'separateur' }));
      bloc.appendChild(extras);
    }
  },

  valider(etat, DATA) {
    const erreurs = [];
    if (etat.voies.profil.length !== 2) erreurs.push('Choisis exactement deux voies de profil.');
    if (rules.estMage(etat, DATA) && !(etat.voies.rang2Mage && etat.voies.rang2Mage.voie)) {
      erreurs.push('Choisis ta capacité de rang 2 de mage.');
    }
    for (const cle of Object.keys(DATA.sousChoix)) {
      if (!sousChoixConcerne(etat, DATA, cle)) continue;
      if (!etat.voies.sousChoix[cle]) {
        erreurs.push('Fais le choix demandé par « ' + DATA.sousChoix[cle].titre + ' ».');
      }
    }
    return erreurs;
  },
};

/* ------------------------------------------------------------------ cartes de voie */

function carteVoie(ctx, voie, choisie, onClick) {
  const DATA = ctx.DATA;
  const bloc = ui.el('div', { class: 'cadre', style: 'padding:.8rem 1rem;margin:.6rem 0;' });
  const entete = ui.el('div', { class: 'ligne' }, [
    ui.el('h4', { style: 'margin:0;flex:1' }, voie.nom),
    onClick ? ui.el('button', {
      type: 'button', class: 'bouton bouton-petit fixe ' + (choisie ? '' : 'bouton-secondaire'),
      onclick: onClick,
    }, choisie ? '✓ Choisie' : 'Choisir') : null,
  ]);
  bloc.appendChild(entete);

  const rang1 = voie.capacites[0];
  bloc.appendChild(capacite(DATA, rang1, true));

  const suite = ui.el('div');
  for (const cap of voie.capacites.slice(1)) suite.appendChild(capacite(DATA, cap, false));
  bloc.appendChild(ui.repliable('Voir les rangs 2 à 5 (pour plus tard)', suite));
  return bloc;
}

/** Affichage d'une capacité : titre, tags, astérisque des sorts, texte intégral. */
function capacite(DATA, cap, complet) {
  const bloc = ui.el('div', { class: 'capacite' });
  const titre = ui.el('p', { class: 'titre-capacite' }, [
    'Rang ' + cap.rang + ' · ' + cap.titre,
  ]);
  for (const tag of cap.tags || []) {
    titre.appendChild(ui.el('span', { class: 'tag' }, tag));
    ui.ajouter(titre, ui.aideDonnee(DATA, tag));
  }
  if (cap.sort) {
    titre.appendChild(ui.el('span', { class: 'sort' }, '*'));
    ui.ajouter(titre, ui.aideDonnee(DATA, 'sort'));
  }
  if (/d4°/.test(cap.texte)) ui.ajouter(titre, ui.aideDonnee(DATA, 'd4°'));
  bloc.appendChild(titre);
  if (complet) ui.ajouter(bloc, ui.paragraphes(cap.texte, 'texte'));
  else bloc.appendChild(ui.el('p', { class: 'texte detail' }, cap.texte));
  return bloc;
}

function basculerVoie(ctx, slug) {
  state.modifier((s) => {
    const liste = s.voies.profil;
    const i = liste.indexOf(slug);
    if (i !== -1) liste.splice(i, 1);
    else if (liste.length < 2) liste.push(slug);
    else { liste.shift(); liste.push(slug); }
    // la capacité de rang 2 doit rester dans une voie choisie
    if (s.voies.rang2Mage && s.voies.rang2Mage.voie !== 'voie-du-mage'
        && liste.indexOf(s.voies.rang2Mage.voie) === -1) {
      s.voies.rang2Mage = null;
    }
  });
  ctx.rafraichir();
}

/* ------------------------------------------------------------------ voie de peuple */

function sectionPeuple(ctx) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const voiePeuple = rules.voieDePeuple(etat, DATA);
  const bloc = ui.el('div');
  bloc.appendChild(ui.el('h3', {}, 'Ta voie de peuple'));

  if (!voiePeuple) {
    bloc.appendChild(ui.el('p', {}, 'Reviens à l’écran du peuple pour choisir ta voie.'));
    return bloc;
  }

  if (rules.estMage(etat, DATA)) {
    bloc.appendChild(ui.el('p', {}, 'Un mage peut remplacer sa voie de peuple par la voie du '
      + 'mage. Il conserve alors l’effet du rang 1 de sa voie de peuple, mais ne pourra '
      + 'jamais la faire monter.'));
    bloc.appendChild(ui.boutonsChoix([
      { valeur: 'peuple', libelle: voiePeuple.nom },
      { valeur: 'voie-du-mage', libelle: DATA.voieDuMage.nom },
    ], etat.voies.peuple || 'peuple', (choix) => {
      state.modifier((s) => {
        s.voies.peuple = choix;
        if (choix !== 'voie-du-mage' && s.voies.rang2Mage
            && s.voies.rang2Mage.voie === 'voie-du-mage') {
          s.voies.rang2Mage = null;
        }
      });
      ctx.rafraichir();
    }));
  }

  const utiliseMage = etat.voies.peuple === 'voie-du-mage';
  bloc.appendChild(carteVoie(ctx, utiliseMage ? DATA.voieDuMage : voiePeuple, true, null));
  if (utiliseMage) {
    bloc.appendChild(ui.el('p', { class: 'detail' },
      'Tu conserves l’effet de « ' + voiePeuple.capacites[0].titre + ' » ('
      + voiePeuple.nom + ').'));
  }
  return bloc;
}

/* ------------------------------------------------------------------ rang 2 des mages */

function sectionRang2(ctx) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const profil = DATA.profils[etat.profil];
  const bloc = ui.el('div');
  bloc.appendChild(ui.el('h3', {}, 'Ta capacité de rang 2 (famille des mages)'));
  bloc.appendChild(ui.el('p', { class: 'detail' },
    'Les mages débutent avec une capacité de rang 2 en plus. Elle doit se trouver dans une '
    + 'de tes deux voies — ou être le rang 2 de la voie du mage si tu l’as prise.'));

  const choix = ui.el('div');
  for (const slug of etat.voies.profil) {
    const voie = rules.voieDeProfil(DATA, profil.slug, slug);
    const cap = voie.capacites[1];
    choix.appendChild(optionRang2(ctx, voie.nom, cap, slug));
  }
  if (etat.voies.peuple === 'voie-du-mage') {
    choix.appendChild(optionRang2(ctx, DATA.voieDuMage.nom, DATA.voieDuMage.capacites[1],
      'voie-du-mage'));
  }
  if (!etat.voies.profil.length) {
    choix.appendChild(ui.el('p', {}, 'Choisis d’abord tes deux voies.'));
  }
  bloc.appendChild(choix);
  return bloc;
}

function optionRang2(ctx, nomVoie, cap, slug) {
  const choisie = ctx.etat.voies.rang2Mage && ctx.etat.voies.rang2Mage.voie === slug;
  const bloc = ui.el('div', { class: 'cadre', style: 'padding:.7rem 1rem;margin:.5rem 0;' });
  bloc.appendChild(ui.el('div', { class: 'ligne' }, [
    ui.el('h4', { style: 'margin:0;flex:1' }, nomVoie),
    ui.el('button', {
      type: 'button', class: 'bouton bouton-petit fixe ' + (choisie ? '' : 'bouton-secondaire'),
      onclick: () => {
        state.modifier((s) => { s.voies.rang2Mage = choisie ? null : { voie: slug }; });
        ctx.rafraichir();
      },
    }, choisie ? '✓ Choisie' : 'Choisir'),
  ]));
  bloc.appendChild(capacite(ctx.DATA, cap, true));
  return bloc;
}

/* ------------------------------------------------------------------ sous-choix */

/** Le sous-choix s'applique-t-il à ce personnage ? (clé « peuple/voie/rang ») */
function sousChoixConcerne(etat, DATA, cle) {
  const acquises = rules.capacitesAcquises(etat, DATA);
  return acquises.some((a) => a.cle === cle);
}

function sousChoix(ctx) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const bloc = ui.el('div');
  let quelqueChose = false;

  for (const cle of Object.keys(DATA.sousChoix)) {
    if (!sousChoixConcerne(etat, DATA, cle)) continue;
    quelqueChose = true;
    const fiche = DATA.sousChoix[cle];
    bloc.appendChild(ui.el('h3', {}, fiche.titre));
    bloc.appendChild(ui.el('p', { class: 'detail' }, fiche.libelle));

    if (fiche.type === 'origine') {
      const choisie = etat.voies.sousChoix[cle];
      const liste = ui.el('div', { class: 'tirage' });
      fiche.options.forEach((option, i) => {
        liste.appendChild(ui.el('button', {
          type: 'button',
          class: 'bouton bouton-petit ' + (choisie === option.nom ? '' : 'bouton-secondaire'),
          onclick: () => {
            state.modifier((s) => { s.voies.sousChoix[cle] = option.nom; });
            ctx.rafraichir();
          },
        }, (i + 1) + '. ' + option.nom));
      });
      bloc.appendChild(liste);
      bloc.appendChild(dice.bouton('Lancer 1d6', 1, 6, (resultat) => {
        const option = fiche.options[resultat.total - 1];
        state.modifier((s) => { s.voies.sousChoix[cle] = option.nom; });
        ctx.rafraichir();
      }));
      if (choisie) {
        const option = fiche.options.find((o) => o.nom === choisie);
        bloc.appendChild(ui.el('p', { class: 'succes' },
          choisie + ' : +3 en ' + (option ? option.domaines.join(' et en ') : '')));
      }
    } else if (fiche.type === 'capacite') {
      const choisi = etat.voies.sousChoix[cle];
      for (const option of fiche.options) {
        const voie = rules.voieDeProfil(DATA, 'ensorceleur', option.voie);
        const cap = voie.capacites[0];
        const active = choisi && choisi.voie === option.voie;
        const carte = ui.el('div', { class: 'cadre', style: 'padding:.7rem 1rem;margin:.5rem 0;' });
        carte.appendChild(ui.el('div', { class: 'ligne' }, [
          ui.el('h4', { style: 'margin:0;flex:1' }, voie.nom),
          ui.el('button', {
            type: 'button',
            class: 'bouton bouton-petit fixe ' + (active ? '' : 'bouton-secondaire'),
            onclick: () => {
              state.modifier((s) => {
                s.voies.sousChoix[cle] = active ? null
                  : { profil: 'ensorceleur', voie: option.voie, rang: 1, titre: cap.titre };
              });
              ctx.rafraichir();
            },
          }, active ? '✓ Choisie' : 'Choisir'),
        ]));
        carte.appendChild(capacite(DATA, cap, true));
        bloc.appendChild(carte);
      }
    }
  }

  // effets facultatifs (forgesort « Grosse tête »)
  for (const acquise of rules.capacitesAcquises(etat, DATA)) {
    const options = rules.optionsEffets(DATA, acquise.cle);
    for (const option of options) {
      quelqueChose = true;
      const actif = !!(etat.voies.optionsEffets || {})[acquise.cle];
      bloc.appendChild(ui.el('h3', {}, acquise.capacite.titre));
      const bouton = ui.el('button', {
        type: 'button', class: 'bouton bouton-petit ' + (actif ? '' : 'bouton-secondaire'),
        onclick: () => {
          state.modifier((s) => {
            s.voies.optionsEffets = s.voies.optionsEffets || {};
            s.voies.optionsEffets[acquise.cle] = !actif;
          });
          ctx.rafraichir();
        },
      }, (actif ? '✓ ' : '') + option.libelle);
      bloc.appendChild(bouton);
    }
  }
  return quelqueChose ? bloc : null;
}
