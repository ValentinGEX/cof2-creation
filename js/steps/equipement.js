/* Écran 7 — Équipement. Sac d'aventurier, bourse tirée aux dés (une seule fois), choix
   « X ou Y » du profil avec les dommages en clair, tableau des armes, et l'objet personnel.

   La feuille officielle n'a que trois lignes d'armes : en dessous de quatre armes, elles y
   sont reportées automatiquement ; au-delà, on demande au joueur de trancher.
   Les valeurs qui en découlent (Défense, attaques) s'affichent dans le panneau de droite :
   inutile d'en refaire le calcul ici. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[7] = {
  titre: 'Votre barda',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    const profil = DATA.profils[etat.profil];
    // l'armure, le bouclier et les armes suivent l'équipement de départ dès l'arrivée
    synchroniser(ctx);
    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.equipement));

    // ---- sac d'aventurier
    bloc.appendChild(ui.section('Sac d’aventurier',
      ui.paragraphes(DATA.creation.livre.equipement.split('Exemple :')[0])));

    // ---- bourse
    const bourse = ui.el('p', { class: 'detail' }, etat.equipement.bourse !== null
      ? 'Votre bourse contient ' + etat.equipement.bourse + ' pa.'
      : 'Un seul jet : ce sera votre fortune de départ.');
    bloc.appendChild(ui.section('Tirons votre fortune au sort', [
      dice.bouton('Lancer 2d6', 2, 6, (resultat) => {
        state.modifier((s) => { s.equipement.bourse = resultat.total; });
        bourse.textContent = 'Votre bourse contient ' + resultat.total + ' pa.';
      }, { valeurInitiale: etat.equipement.bourse, uneSeuleFois: true }),
      bourse,
    ]));

    // ---- équipement de départ du profil
    const depart = ui.el('div');
    (profil.equipement || []).forEach((entree, index) => {
      if (entree.choix) {
        depart.appendChild(ui.el('h4', {}, 'Vous préférez quoi ?'));
        const ligne = ui.el('div', { class: 'tirage' });
        entree.choix.forEach((option, i) => {
          const actif = (etat.equipement.choix[index] || 0) === i;
          ligne.appendChild(ui.el('button', {
            type: 'button', class: 'bouton bouton-petit ' + (actif ? '' : 'bouton-secondaire'),
            onclick: () => {
              state.modifier((s) => { s.equipement.choix[index] = i; });
              synchroniser(ctx);
              ctx.rafraichir();
            },
          }, libelleOption(DATA, option)));
        });
        depart.appendChild(ligne);
        // un choix peut contenir lui-même une liste d'armes possibles
        const option = entree.choix[etat.equipement.choix[index] || 0];
        option.forEach((objet, j) => {
          if (objet.liste) depart.appendChild(choixDansListe(ctx, objet, index + '.' + j));
        });
      } else if (entree.liste) {
        depart.appendChild(choixDansListe(ctx, entree, String(index)));
      }
    });

    // ce que le personnage emporte au total
    const resolu = rules.equipementResolu(etat, DATA);
    const liste = ui.el('ul', { class: 'liste-nue' });
    for (const objet of resolu) {
      liste.appendChild(ui.el('li', {}, '• ' + objet.nom + (objet.qte > 1 ? ' ×' + objet.qte : '')
        + (objet.armure ? ' (DEF +' + objet.armure.def + ')' : '')));
    }
    depart.appendChild(ui.el('h4', {}, 'Vous emportez'));
    depart.appendChild(liste);
    const comparatif = tableauComparatif(ctx, profil);
    if (comparatif) {
      depart.appendChild(ui.el('h4', {}, 'De quoi comparer'));
      depart.appendChild(comparatif);
    }
    bloc.appendChild(ui.section('Équipement de ' + profil.nom.toLowerCase(), depart));

    // ---- armes portées sur la feuille : la feuille officielle n'a que trois lignes, on ne
    // demande donc de trancher que si le personnage a plus de trois armes
    const armes = resolu.filter((o) => o.type === 'arme');
    if (armes.length > 3) {
      const choixArmes = ui.el('div', { class: 'tirage' });
      for (const objet of armes) {
        const active = etat.equipement.armes.indexOf(objet.ref) !== -1;
        const arme = DATA.armes[objet.ref];
        choixArmes.appendChild(ui.el('button', {
          type: 'button', class: 'bouton bouton-petit ' + (active ? '' : 'bouton-secondaire'),
          onclick: () => {
            state.modifier((s) => {
              const i = s.equipement.armes.indexOf(objet.ref);
              if (i !== -1) s.equipement.armes.splice(i, 1);
              else if (s.equipement.armes.length < 3) s.equipement.armes.push(objet.ref);
            });
            ctx.rafraichir();
          },
        }, (active ? '✓ ' : '') + objet.nom + (arme ? ' (DM ' + arme.dm + ')' : '')));
      }
      bloc.appendChild(ui.section('Votre personnage a trop d’armes !', [
        ui.el('p', {}, 'Choisissez celles que vous préférez : vous ne pouvez en garder que '
          + 'trois sur votre feuille.'),
        choixArmes,
        tableauArmes(ctx),
      ]));
    } else {
      bloc.appendChild(ui.section('Vos armes', tableauArmes(ctx)));
    }

    // ---- objet personnel
    bloc.appendChild(ui.section('Un objet personnel', [
      ui.encadre(DATA.creation.maison.noteObjetNegocie, 'maison'),
      ui.el('input', {
        type: 'text', value: etat.equipement.libre || '',
        placeholder: 'Un médaillon terni, une cuillère fétiche, 3 m de corde…',
        oninput: (e) => state.modifier((s) => { s.equipement.libre = e.target.value; }),
      }),
    ]));
  },

  valider(etat, DATA) {
    const erreurs = [];
    if (etat.equipement.bourse === null) erreurs.push('Lancez les dés de votre bourse (2d6 pa).');
    const armes = rules.equipementResolu(etat, DATA).filter((o) => o.type === 'arme');
    if (armes.length > 3 && !etat.equipement.armes.length) {
      erreurs.push('Choisissez les trois armes à garder sur votre feuille.');
    }
    return erreurs;
  },
};

/** Un choix d'équipement se lit d'un coup d'œil : le nom, puis ce qu'il vaut en jeu. */
function libelleOption(DATA, option) {
  return option.map((objet) => {
    if (objet.libre) return objet.libre;
    const arme = DATA.armes[objet.ref];
    const armure = DATA.armures[objet.ref];
    const nom = arme ? arme.nom : (armure ? armure.nom : objet.ref);
    const valeur = arme ? ' (DM ' + arme.dm + (arme.dmDeuxMains ? '/' + arme.dmDeuxMains : '') + ')'
      : (armure ? ' (DEF +' + armure.def + ')' : '');
    return nom + valeur + (objet.qte > 1 ? ' ×' + objet.qte : '');
  }).join(' + ');
}

/** Toutes les armes que le profil peut recevoir, pour comparer avant de choisir. */
function tableauComparatif(ctx, profil) {
  const DATA = ctx.DATA;
  const refs = [];
  const ajouter = (objets) => {
    for (const objet of objets) {
      if (objet.choix) { objet.choix.forEach(ajouter); continue; }
      for (const ref of [objet.ref].concat(objet.liste || [])) {
        if (ref && DATA.armes[ref] && refs.indexOf(ref) === -1) refs.push(ref);
      }
    }
  };
  ajouter(profil.equipement || []);
  if (refs.length < 2) return null;

  const table = ui.el('table', { class: 'table-caracs' });
  table.appendChild(ui.el('thead', {}, ui.el('tr', {}, [
    ui.el('th', {}, 'Arme'), ui.el('th', {}, 'DM'), ui.el('th', {}, 'Portée'),
    ui.el('th', {}, 'Particularités'),
  ])));
  const corps = ui.el('tbody');
  for (const ref of refs) {
    const arme = DATA.armes[ref];
    corps.appendChild(ui.el('tr', {}, [
      ui.el('td', {}, arme.nom),
      ui.el('td', {}, arme.dm + (arme.dmDeuxMains ? ' / ' + arme.dmDeuxMains : '')),
      ui.el('td', {}, arme.portee || '—'),
      ui.el('td', {}, ui.el('span', { class: 'detail' }, arme.notes || '—')),
    ]));
  }
  table.appendChild(corps);
  return table;
}

function choixDansListe(ctx, objet, cle) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const bloc = ui.el('div');
  bloc.appendChild(ui.el('h4', {}, 'Vous préférez quoi ?'));
  const actuel = etat.equipement.sousChoix[cle] || objet.ref;
  bloc.appendChild(ui.el('select', {
    onchange: (e) => {
      state.modifier((s) => { s.equipement.sousChoix[cle] = e.target.value; });
      synchroniser(ctx);
      ctx.rafraichir();
    },
  }, objet.liste.map((ref) => {
    const arme = DATA.armes[ref] || DATA.armures[ref];
    const texte = arme ? arme.nom + (arme.dm ? ' (DM ' + arme.dm + ')' : '') : ref;
    return ui.el('option', { value: ref, selected: ref === actuel }, texte);
  })));
  return bloc;
}

/** Le tableau des trois lignes d'armes de la feuille, tel qu'il sera imprimé. */
function tableauArmes(ctx) {
  const d = rules.computeDerived(ctx.etat, ctx.DATA);
  if (!d.armes.length) {
    return ui.el('p', { class: 'detail' }, 'Aucune arme retenue pour l’instant.');
  }
  const table = ui.el('table', { class: 'table-caracs' });
  table.appendChild(ui.el('thead', {}, ui.el('tr', {}, [
    ui.el('th', {}, 'Arme'), ui.el('th', {}, ['Attaque', ui.aideMaison(ctx.DATA, 'ATT_CONTACT')]),
    ui.el('th', {}, ['DM', ui.aideDonnee(ctx.DATA, 'DM')]), ui.el('th', {}, 'Spécial / portée'),
  ])));
  const corps = ui.el('tbody');
  for (const arme of d.armes) {
    corps.appendChild(ui.el('tr', {}, [
      ui.el('td', {}, arme.nom),
      ui.el('td', {}, '1d20 ' + ui.signe(arme.att)),
      ui.el('td', {}, arme.dm),
      ui.el('td', {}, ui.el('span', { class: 'detail' }, arme.special || '—')),
    ]));
  }
  table.appendChild(corps);
  return table;
}

/** Armure, bouclier et armes de la feuille suivent les choix d'équipement. */
function synchroniser(ctx) {
  state.modifier((s) => {
    const resolu = rules.equipementResolu(s, ctx.DATA);
    const armure = resolu.find((o) => o.type === 'armure');
    const bouclier = resolu.find((o) => o.type === 'bouclier');
    s.equipement.armure = armure ? armure.ref : null;
    s.equipement.bouclier = bouclier ? bouclier.ref : null;
    // on garde l'ordre de l'équipement de départ : l'arme principale en premier
    const refs = resolu.filter((o) => o.type === 'arme').map((o) => o.ref);
    const gardees = refs.filter((r) => s.equipement.armes.indexOf(r) !== -1);
    for (const ref of refs) {
      if (gardees.length >= 3) break;
      if (gardees.indexOf(ref) === -1) gardees.push(ref);
    }
    s.equipement.armes = gardees.slice(0, 3);
  });
}
