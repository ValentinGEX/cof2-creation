/* Écran 8 — Touche finale : nom, âge, taille, poids, idéal, travers, secret, bizarrerie,
   langues et description physique.

   Les quatre traits sont obligatoires : on les tire au dé, on relance autant qu'on veut, ou
   on les écrit soi-même — jamais on ne les laisse vides. Le sexe a été choisi à l'écran 2 :
   c'est lui qui décide dans quelle liste de prénoms on pioche. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[8] = {
  titre: 'La touche finale',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    const peuple = DATA.peuples[etat.peuple];
    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.touche));
    ui.ajouter(bloc, ui.paragraphes(DATA.creation.livre.toucheFinale));

    bloc.appendChild(sectionNom(ctx, peuple));
    bloc.appendChild(sectionMensurations(ctx, peuple));
    bloc.appendChild(sectionTraits(ctx));
    bloc.appendChild(ui.section('Langues', langues(ctx)));
    bloc.appendChild(ui.section('À quoi ressemble votre personnage ?', [
      ui.encadre(DATA.creation.livre.questionsDescription),
      ui.el('textarea', {
        placeholder: 'Cheveux, yeux, peau, silhouette, signes distinctifs, caractère…',
        oninput: (e) => state.modifier((s) => { s.touche.description = e.target.value; }),
      }, etat.touche.description || ''),
    ]));
  },

  valider(etat) {
    const erreurs = [];
    if (!etat.nom || !etat.nom.trim()) erreurs.push('Donnez un nom à votre personnage.');
    if (!etat.touche.age) erreurs.push('Indiquez son âge.');
    if (!etat.touche.tailleCm || !etat.touche.poidsKg) {
      erreurs.push('Indiquez sa taille et son poids.');
    }
    for (const [cle, libelle] of [['ideal', 'un idéal'], ['travers', 'un travers'],
      ['secret', 'un secret'], ['bizarrerie', 'une bizarrerie']]) {
      if (!etat.touche[cle]) erreurs.push('Il vous manque ' + libelle + '.');
    }
    return erreurs;
  },
};

/* ------------------------------------------------------------------ nom */

function sectionNom(ctx, peuple) {
  const etat = ctx.etat;
  const contenu = ui.el('div');
  if (peuple.noms && peuple.noms.intro) {
    contenu.appendChild(ui.el('p', { class: 'detail' }, peuple.noms.intro));
  }
  if (peuple.noms && peuple.noms.empruntes) {
    contenu.appendChild(ui.el('p', { class: 'detail' },
      'Les listes ci-dessous sont celles des deux peuples elfes : ajoutez-y un nom de '
      + 'famille humain de votre cru.'));
  }

  const champNom = ui.el('input', {
    type: 'text', value: etat.nom || '', placeholder: 'Le nom de votre personnage',
    oninput: (e) => state.modifier((s) => { s.nom = e.target.value; }),
  });
  contenu.appendChild(champNom);

  const genre = etat.touche.genre;
  contenu.appendChild(ui.el('div', { class: 'tirage' }, [
    ui.el('button', {
      type: 'button', class: 'bouton bouton-petit bouton-secondaire',
      onclick: () => {
        // le sexe vient de l'écran 2 ; en son absence (brouillon d'une version antérieure)
        // on pioche dans l'une des deux listes au hasard
        const choisi = genre || (dice.d(2) === 1 ? 'M' : 'F');
        const liste = choisi === 'F' ? peuple.noms.feminin : peuple.noms.masculin;
        if (!liste || !liste.length) return;
        const nom = dice.dansListe(liste);
        state.modifier((s) => { s.nom = nom; });
        champNom.value = nom;
      },
    }, 'Tirer un nom au hasard'),
    ui.el('span', { class: 'detail' }, genre === 'F' ? 'Prénoms féminins'
      : genre === 'M' ? 'Prénoms masculins' : 'Sexe non précisé'),
  ]));
  return ui.section('Nom', contenu);
}

/* ------------------------------------------------------------------ âge, taille, poids */

function sectionMensurations(ctx, peuple) {
  const etat = ctx.etat;
  const reperes = peuple.reperes;
  // l'âge de départ du peuple est proposé d'office ; le joueur peut le changer
  if (etat.touche.age === null) {
    state.modifier((s) => { s.touche.age = reperes.ageDepart; });
  }

  const contenu = ui.el('div');
  contenu.appendChild(ui.el('p', { class: 'detail' },
    'Chez les ' + peuple.nom.toLowerCase() + 's : âge de départ '
    + (reperes.ageDepartTexte || reperes.ageDepart) + ', espérance de vie '
    + reperes.esperanceVie + ' ans, taille ' + (reperes.tailleTexte || '')
    + ', poids ' + (reperes.poidsTexte || '') + '.'));

  const champAge = ui.el('input', {
    type: 'number', value: etat.touche.age !== null ? etat.touche.age : reperes.ageDepart,
    min: '1', max: String(reperes.esperanceVie),
    oninput: (e) => state.modifier((s) => {
      s.touche.age = parseInt(e.target.value, 10) || null;
    }),
  });
  contenu.appendChild(ui.el('label', {}, 'Âge'));
  contenu.appendChild(ui.el('div', { class: 'ligne' }, [
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
    oninput: (e) => state.modifier((s) => {
      s.touche.tailleCm = parseInt(e.target.value, 10) || null;
    }),
  });
  const champPoids = ui.el('input', {
    type: 'number', value: etat.touche.poidsKg || '', min: '10', max: '300',
    oninput: (e) => state.modifier((s) => {
      s.touche.poidsKg = parseInt(e.target.value, 10) || null;
    }),
  });
  contenu.appendChild(ui.el('div', { class: 'ligne' }, [
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
  return ui.section('Âge, taille et poids', contenu);
}

/* ------------------------------------------------------------------ les quatre traits */

function sectionTraits(ctx) {
  const DATA = ctx.DATA;
  const contenu = ui.el('div');
  contenu.appendChild(ui.encadre(DATA.creation.maison.noteTraits, 'maison'));
  contenu.appendChild(trait(ctx, 'ideal', 'Idéal héroïque', DATA.tables.ideaux));
  contenu.appendChild(trait(ctx, 'travers', 'Travers', DATA.tables.travers));
  // le livre propose deux tables de vingt secrets : on tire dans l'une ou l'autre
  contenu.appendChild(trait(ctx, 'secret', 'Secret intime',
    DATA.tables.secrets1.concat(DATA.tables.secrets2)));
  contenu.appendChild(trait(ctx, 'bizarrerie', 'Bizarrerie', DATA.tables.bizarreries,
    DATA.creation.maison.noteBizarrerie));
  return ui.section('Idéal, travers, secret et bizarrerie', contenu);
}

/** Un trait : un champ libre et un dé qui écrit sa suggestion dedans. La table peut
    compter plus de vingt entrées (les secrets) : on tire alors d'abord la table. */
function trait(ctx, cle, libelle, table, note) {
  const etat = ctx.etat;
  const bloc = ui.el('div', { class: 'trait' });
  bloc.appendChild(ui.el('h4', {}, libelle));
  if (note) bloc.appendChild(ui.el('p', { class: 'detail' }, note));

  const champ = ui.el('input', {
    type: 'text', value: etat.touche[cle] || '',
    placeholder: 'Tirez au dé, ou écrivez le vôtre',
    oninput: (e) => state.modifier((s) => { s.touche[cle] = e.target.value.trim() || null; }),
  });
  bloc.appendChild(ui.el('div', { class: 'ligne' }, [
    champ,
    ui.el('div', { class: 'fixe' }, dice.bouton('Lancer 1d20', 1, 20, (resultat) => {
      const bloc20 = table.length > 20 ? (dice.d(Math.ceil(table.length / 20)) - 1) : 0;
      const valeur = table[bloc20 * 20 + resultat.total - 1] || table[resultat.total - 1];
      state.modifier((s) => { s.touche[cle] = valeur; });
      champ.value = valeur;
      ctx.majFiche();
    })),
  ]));
  return bloc;
}

/* ------------------------------------------------------------------ langues */

function langues(ctx) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const peuple = DATA.peuples[etat.peuple];
  const caracs = rules.caracsFinales(etat, DATA);
  const bloc = ui.el('div');

  bloc.appendChild(ui.el('p', {}, DATA.creation.maison.noteLangues));

  const base = peuple.langues || ['Commun'];
  const parlees = ui.el('div', { class: 'tirage' });
  parlees.appendChild(ui.el('span', { class: 'detail' }, 'Votre personnage parle :'));
  for (const nom of base.concat(etat.touche.languesBonus || [])) {
    parlees.appendChild(ui.el('span', { class: 'langue parlee' }, nom));
  }
  bloc.appendChild(parlees);

  const supplementaires = Math.max(0, caracs.INT);
  if (!supplementaires) {
    if (caracs.INT < 0) {
      bloc.appendChild(ui.el('p', { class: 'detail' },
        'Avec une INT de ' + ui.signe(caracs.INT) + ', votre personnage ne sait pas lire'
        + (caracs.INT <= -2 ? ' et ne parle que la langue de son peuple.' : '.')));
    }
    return bloc;
  }

  const choisies = etat.touche.languesBonus || [];
  bloc.appendChild(ui.el('p', { class: 'detail' },
    'Son INT de ' + ui.signe(caracs.INT) + ' lui offre ' + supplementaires
    + ' langue' + (supplementaires > 1 ? 's' : '') + ' de plus ('
    + choisies.length + ' sur ' + supplementaires + ' choisie'
    + (choisies.length > 1 ? 's' : '') + ').'));

  const liste = ui.el('div', { class: 'tirage' });
  for (const langue of DATA.tables.langues) {
    if (base.indexOf(langue.nom) !== -1) continue;
    const active = choisies.indexOf(langue.nom) !== -1;
    liste.appendChild(ui.el('button', {
      type: 'button', class: 'bouton bouton-petit ' + (active ? '' : 'bouton-secondaire'),
      title: langue.locuteurs || '',
      onclick: () => {
        state.modifier((s) => {
          const bonus = s.touche.languesBonus;
          const i = bonus.indexOf(langue.nom);
          if (i !== -1) bonus.splice(i, 1);
          else if (bonus.length < supplementaires) bonus.push(langue.nom);
        });
        ctx.rafraichir();
      },
    }, (active ? '✓ ' : '') + langue.nom));
    if (langue.note) ui.ajouter(liste, ui.aide(langue.nom, langue.note, 'Livre, p. 37'));
  }
  bloc.appendChild(liste);
  return bloc;
}
