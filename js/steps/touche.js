/* Écran 7 — Touche finale : nom, genre, âge, taille, poids, idéal, travers, secret,
   bizarrerie, langues et description physique.

   Les quatre traits (idéal, travers, secret, bizarrerie) sont obligatoires : on peut les
   tirer aux dés, les relancer autant qu'on veut ou les écrire soi-même, jamais les laisser
   vides. La table des bizarreries est un ajout maison, les trois autres viennent du livre. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[7] = {
  titre: 'La touche finale',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    const peuple = DATA.peuples[etat.peuple];
    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.touche));
    ui.ajouter(bloc, ui.paragraphes(DATA.creation.livre.toucheFinale));

    // ---- nom et genre
    bloc.appendChild(ui.el('h3', {}, 'Nom'));
    if (peuple.noms && peuple.noms.intro) {
      bloc.appendChild(ui.el('p', { class: 'detail' }, peuple.noms.intro));
    }
    if (peuple.noms && peuple.noms.empruntes) {
      bloc.appendChild(ui.el('p', { class: 'detail' },
        'Les listes ci-dessous sont celles des deux peuples elfes : ajoute un nom de famille '
        + 'humain de ton cru.'));
    }
    bloc.appendChild(ui.boutonsChoix([
      { valeur: 'M', libelle: 'Masculin' },
      { valeur: 'F', libelle: 'Féminin' },
      { valeur: null, libelle: 'Autre / non précisé' },
    ], etat.touche.genre, (genre) => {
      state.modifier((s) => { s.touche.genre = genre; });
      ctx.rafraichir();
    }));

    const champNom = ui.el('input', {
      type: 'text', value: etat.nom || '', placeholder: 'Le nom de ton personnage',
      oninput: (e) => state.modifier((s) => { s.nom = e.target.value; }),
    });
    bloc.appendChild(champNom);
    const tirerNom = (genre) => {
      const liste = genre === 'F' ? peuple.noms.feminin : peuple.noms.masculin;
      if (!liste || !liste.length) return;
      const nom = dice.dansListe(liste);
      state.modifier((s) => { s.nom = nom; });
      champNom.value = nom;
    };
    bloc.appendChild(ui.el('div', { class: 'tirage' }, [
      ui.el('button', { type: 'button', class: 'bouton bouton-petit bouton-secondaire',
        onclick: () => tirerNom('M') }, 'Nom masculin au hasard'),
      ui.el('button', { type: 'button', class: 'bouton bouton-petit bouton-secondaire',
        onclick: () => tirerNom('F') }, 'Nom féminin au hasard'),
      ui.el('button', { type: 'button', class: 'bouton bouton-petit bouton-secondaire',
        onclick: () => tirerNom(dice.d(2) === 1 ? 'M' : 'F') }, 'Au hasard'),
    ]));

    // ---- âge, taille, poids
    bloc.appendChild(ui.el('hr', { class: 'separateur' }));
    bloc.appendChild(ui.el('h3', {}, 'Âge, taille et poids'));
    const reperes = peuple.reperes;
    // l'âge de départ du peuple est proposé d'office ; le joueur peut le changer
    if (etat.touche.age === null) {
      state.modifier((s) => { s.touche.age = reperes.ageDepart; });
    }
    bloc.appendChild(ui.el('p', { class: 'detail' },
      'Chez les ' + peuple.nom.toLowerCase() + 's : âge de départ '
      + (reperes.ageDepartTexte || reperes.ageDepart) + ', espérance de vie '
      + reperes.esperanceVie + ' ans, taille ' + (reperes.tailleTexte || '')
      + ', poids ' + (reperes.poidsTexte || '') + '.'));

    const champAge = ui.el('input', {
      type: 'number', value: etat.touche.age !== null ? etat.touche.age : reperes.ageDepart,
      min: '1', max: String(reperes.esperanceVie),
      oninput: (e) => state.modifier((s) => { s.touche.age = parseInt(e.target.value, 10) || null; }),
    });
    bloc.appendChild(ui.el('label', {}, 'Âge'));
    bloc.appendChild(ui.el('div', { class: 'ligne' }, [
      champAge,
      ui.el('button', {
        type: 'button', class: 'bouton bouton-petit bouton-secondaire fixe',
        onclick: () => {
          const age = dice.entre(reperes.ageDepart, reperes.esperanceVie);
          state.modifier((s) => { s.touche.age = age; });
          champAge.value = age;
        },
      }, 'Âge au hasard (jusqu’à l’espérance de vie)'),
    ]));

    const champTaille = ui.el('input', {
      type: 'number', value: etat.touche.tailleCm || '', min: '40', max: '260',
      oninput: (e) => state.modifier((s) => { s.touche.tailleCm = parseInt(e.target.value, 10) || null; }),
    });
    const champPoids = ui.el('input', {
      type: 'number', value: etat.touche.poidsKg || '', min: '10', max: '300',
      oninput: (e) => state.modifier((s) => { s.touche.poidsKg = parseInt(e.target.value, 10) || null; }),
    });
    bloc.appendChild(ui.el('div', { class: 'ligne' }, [
      ui.el('div', {}, [ui.el('label', {}, 'Taille (cm)'), champTaille]),
      ui.el('div', {}, [ui.el('label', {}, 'Poids (kg)'), champPoids]),
      ui.el('button', {
        type: 'button', class: 'bouton bouton-petit bouton-secondaire fixe',
        onclick: () => {
          const taille = dice.entre(reperes.tailleCm[0], reperes.tailleCm[1]);
          const poids = dice.entre(reperes.poidsKg[0], reperes.poidsKg[1]);
          state.modifier((s) => { s.touche.tailleCm = taille; s.touche.poidsKg = poids; });
          champTaille.value = taille;
          champPoids.value = poids;
        },
      }, 'Taille et poids au hasard'),
    ]));

    // ---- les quatre traits
    bloc.appendChild(ui.el('hr', { class: 'separateur' }));
    bloc.appendChild(ui.el('h3', {}, 'Idéal, travers, secret et bizarrerie'));
    bloc.appendChild(ui.encadre(DATA.creation.maison.noteTraits, 'maison'));
    ui.ajouter(bloc, ui.repliable('Ce qu’en dit le livre', DATA.creation.livre.idealEtTravers));

    bloc.appendChild(trait(ctx, 'ideal', 'Idéal héroïque', DATA.tables.ideaux, 20));
    bloc.appendChild(trait(ctx, 'travers', 'Travers', DATA.tables.travers, 20));
    bloc.appendChild(secret(ctx));
    bloc.appendChild(trait(ctx, 'bizarrerie', 'Bizarrerie', DATA.tables.bizarreries, 10,
      DATA.creation.maison.noteBizarrerie));

    // ---- langues
    bloc.appendChild(ui.el('hr', { class: 'separateur' }));
    bloc.appendChild(ui.el('h3', {}, 'Langues'));
    bloc.appendChild(langues(ctx));

    // ---- description physique
    bloc.appendChild(ui.el('hr', { class: 'separateur' }));
    bloc.appendChild(ui.el('h3', {}, 'À quoi ressemble-t-il ?'));
    bloc.appendChild(ui.encadre(DATA.creation.livre.questionsDescription));
    bloc.appendChild(ui.el('textarea', {
      placeholder: 'Cheveux, yeux, peau, silhouette, signes distinctifs, caractère…',
      oninput: (e) => state.modifier((s) => { s.touche.description = e.target.value; }),
    }, etat.touche.description || ''));
  },

  valider(etat) {
    const erreurs = [];
    if (!etat.nom || !etat.nom.trim()) erreurs.push('Donne un nom à ton personnage.');
    if (!etat.touche.age) erreurs.push('Indique son âge.');
    if (!etat.touche.tailleCm || !etat.touche.poidsKg) erreurs.push('Indique sa taille et son poids.');
    for (const [cle, libelle] of [['ideal', 'un idéal'], ['travers', 'un travers'],
      ['secret', 'un secret'], ['bizarrerie', 'une bizarrerie']]) {
      if (!etat.touche[cle]) erreurs.push('Il te manque ' + libelle + '.');
    }
    return erreurs;
  },
};

/* ------------------------------------------------------------------ traits */

function trait(ctx, cle, libelle, table, faces, note) {
  const etat = ctx.etat;
  const bloc = ui.el('div');
  bloc.appendChild(ui.el('h4', {}, libelle));
  if (note) bloc.appendChild(ui.el('p', { class: 'detail' }, note));
  const champ = ui.el('input', {
    type: 'text', value: etat.touche[cle] || '', placeholder: 'Tire au dé ou écris le tien',
    oninput: (e) => state.modifier((s) => { s.touche[cle] = e.target.value.trim() || null; }),
  });
  bloc.appendChild(ui.el('div', { class: 'ligne' }, [
    champ,
    ui.el('div', { class: 'fixe' }, dice.bouton('Lancer 1d' + faces, 1, faces, (resultat) => {
      const valeur = table[resultat.total - 1];
      state.modifier((s) => { s.touche[cle] = valeur; });
      champ.value = valeur;
      ctx.majFiche();
    })),
  ]));
  return bloc;
}

/** Secrets : le livre demande de lancer un d20 sur chacune des deux tables et d'en choisir un. */
function secret(ctx) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const bloc = ui.el('div');
  bloc.appendChild(ui.el('h4', {}, 'Secret intime'));
  bloc.appendChild(ui.el('p', { class: 'detail' },
    'Lance un dé sur chacune des deux tables, puis garde celui qui te parle le plus.'));

  const propositions = ui.el('div');
  const afficherPropositions = () => {
    ui.vider(propositions);
    const tires = etat.touche.secretsTires;
    if (!tires) return;
    for (const texte of tires) {
      propositions.appendChild(ui.el('button', {
        type: 'button',
        class: 'bouton bouton-petit ' + (etat.touche.secret === texte ? '' : 'bouton-secondaire'),
        style: 'display:block;text-align:left;margin:.3rem 0;white-space:normal;',
        onclick: () => {
          state.modifier((s) => { s.touche.secret = texte; });
          champ.value = texte;
          afficherPropositions();
        },
      }, texte));
    }
  };

  const champ = ui.el('input', {
    type: 'text', value: etat.touche.secret || '', placeholder: 'Tire les dés ou écris le tien',
    oninput: (e) => state.modifier((s) => { s.touche.secret = e.target.value.trim() || null; }),
  });

  bloc.appendChild(ui.el('div', { class: 'ligne' }, [
    champ,
    ui.el('button', {
      type: 'button', class: 'bouton bouton-petit bouton-secondaire fixe',
      onclick: () => {
        const a = DATA.tables.secrets1[dice.d(20) - 1];
        const b = DATA.tables.secrets2[dice.d(20) - 1];
        state.modifier((s) => { s.touche.secretsTires = [a, b]; });
        afficherPropositions();
      },
    }, 'Lancer 2d20'),
  ]));
  bloc.appendChild(propositions);
  afficherPropositions();
  return bloc;
}

/* ------------------------------------------------------------------ langues */

function langues(ctx) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const peuple = DATA.peuples[etat.peuple];
  const caracs = rules.caracsFinales(etat, DATA);
  const bloc = ui.el('div');

  ui.ajouter(bloc, ui.repliable('Ce qu’en dit le livre', DATA.creation.livre.langues));

  const base = peuple.langues || ['Commun'];
  bloc.appendChild(ui.el('p', {}, 'Tu parles d’office : ' + base.join(', ') + '.'));

  const supplementaires = Math.max(0, caracs.INT);
  if (!supplementaires) {
    if (caracs.INT < 0) {
      bloc.appendChild(ui.el('p', { class: 'detail' },
        'Avec une INT de ' + ui.signe(caracs.INT) + ', ton personnage ne sait pas lire'
        + (caracs.INT <= -2 ? ' et ne parle que la langue de son peuple.' : '.')));
    }
    return bloc;
  }

  bloc.appendChild(ui.el('p', { class: 'detail' },
    'Ton INT de ' + ui.signe(caracs.INT) + ' te donne ' + supplementaires
    + ' langue' + (supplementaires > 1 ? 's' : '') + ' de plus.'));

  const choisies = etat.touche.languesBonus || [];
  const liste = ui.el('div', { class: 'tirage' });
  for (const langue of DATA.tables.langues) {
    if (base.indexOf(langue.nom) !== -1) continue;
    const active = choisies.indexOf(langue.nom) !== -1;
    const bouton = ui.el('button', {
      type: 'button', class: 'bouton bouton-petit ' + (active ? '' : 'bouton-secondaire'),
      onclick: () => {
        state.modifier((s) => {
          const liste_ = s.touche.languesBonus;
          const i = liste_.indexOf(langue.nom);
          if (i !== -1) liste_.splice(i, 1);
          else if (liste_.length < supplementaires) liste_.push(langue.nom);
        });
        ctx.rafraichir();
      },
    }, langue.nom);
    liste.appendChild(bouton);
    if (langue.note) ui.ajouter(liste, ui.aide(langue.nom, langue.note, 'Livre, p. 37'));
  }
  bloc.appendChild(liste);
  return bloc;
}
