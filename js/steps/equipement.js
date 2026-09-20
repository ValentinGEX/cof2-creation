/* Écran 6 — Équipement. Sac d'aventurier, bourse aux dés, choix « X ou Y » du profil,
   armes reportées sur la feuille (trois lignes) et objet négocié avec le MJ.
   La Défense, les valeurs d'attaque et les dommages s'affichent avec le détail du calcul. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[6] = {
  titre: 'Ton barda',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    const profil = DATA.profils[etat.profil];
    // l'armure, le bouclier et les armes suivent l'équipement de départ dès l'arrivée
    synchroniser(ctx);
    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.equipement));

    // ---- sac d'aventurier et bourse
    bloc.appendChild(ui.el('h3', {}, 'Sac d’aventurier'));
    ui.ajouter(bloc, ui.paragraphes(DATA.creation.livre.equipement.split('Exemple :')[0]));
    const bourse = ui.el('p', { class: 'detail' }, etat.equipement.bourse !== null
      ? 'Ta bourse contient ' + etat.equipement.bourse + ' pa.'
      : 'Lance les dés pour connaître le contenu de ta bourse.');
    bloc.appendChild(dice.bouton('Lancer 2d6 (bourse)', 2, 6, (resultat) => {
      state.modifier((s) => { s.equipement.bourse = resultat.total; });
      bourse.textContent = 'Ta bourse contient ' + resultat.total + ' pa.';
    }, { valeurInitiale: etat.equipement.bourse }));
    bloc.appendChild(bourse);

    // ---- équipement de départ du profil
    bloc.appendChild(ui.el('hr', { class: 'separateur' }));
    bloc.appendChild(ui.el('h3', {}, 'Équipement de ' + profil.nom.toLowerCase()));
    bloc.appendChild(ui.el('p', { class: 'detail' }, profil.equipementTexte));

    (profil.equipement || []).forEach((entree, index) => {
      if (entree.choix) {
        bloc.appendChild(ui.el('p', {}, entree.libelle || 'Au choix :'));
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
        bloc.appendChild(ligne);
        // un choix peut contenir lui-même une liste d'armes possibles
        const option = entree.choix[etat.equipement.choix[index] || 0];
        option.forEach((objet, j) => {
          if (objet.liste) bloc.appendChild(choixDansListe(ctx, objet, index + '.' + j));
        });
      } else if (entree.liste) {
        bloc.appendChild(choixDansListe(ctx, entree, String(index)));
      }
    });

    // ---- ce que tu emportes
    const resolu = rules.equipementResolu(etat, DATA);
    const liste = ui.el('ul', { class: 'liste-nue' });
    for (const objet of resolu) {
      liste.appendChild(ui.el('li', {}, '• ' + objet.nom + (objet.qte > 1 ? ' ×' + objet.qte : '')
        + (objet.type === 'armure' ? ' (DEF +' + objet.armure.def + ')' : '')
        + (objet.type === 'bouclier' ? ' (DEF +' + objet.armure.def + ')' : '')));
    }
    bloc.appendChild(ui.el('h4', {}, 'Tu emportes'));
    bloc.appendChild(liste);

    // ---- armes à reporter sur la feuille
    bloc.appendChild(ui.el('h4', {}, ['Armes reportées sur la feuille (trois au maximum)',
      ui.aideDonnee(DATA, 'DM')]));
    const armes = resolu.filter((o) => o.type === 'arme');
    const choixArmes = ui.el('div', { class: 'tirage' });
    for (const objet of armes) {
      const active = etat.equipement.armes.indexOf(objet.ref) !== -1;
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
      }, (active ? '✓ ' : '') + objet.nom));
    }
    bloc.appendChild(choixArmes);

    // ---- objet négocié
    bloc.appendChild(ui.el('h4', {}, 'Un objet négocié avec le MJ'));
    bloc.appendChild(ui.encadre(DATA.creation.maison.noteObjetNegocie, 'maison'));
    bloc.appendChild(ui.el('input', {
      type: 'text', value: etat.equipement.libre || '',
      placeholder: 'Un médaillon terni, une cuillère fétiche, 3 m de corde…',
      oninput: (e) => state.modifier((s) => { s.equipement.libre = e.target.value; }),
    }));

    // ---- calculs en direct
    bloc.appendChild(ui.el('hr', { class: 'separateur' }));
    bloc.appendChild(detailCalculs(ctx));
  },

  valider(etat, DATA) {
    const erreurs = [];
    if (etat.equipement.bourse === null) erreurs.push('Lance les dés de ta bourse (2d6 pa).');
    const armes = rules.equipementResolu(etat, DATA).filter((o) => o.type === 'arme');
    if (armes.length && !etat.equipement.armes.length) {
      erreurs.push('Choisis au moins une arme à reporter sur la feuille.');
    }
    return erreurs;
  },
};

function libelleOption(DATA, option) {
  return option.map((objet) => {
    if (objet.libre) return objet.libre;
    const ref = objet.ref;
    const arme = DATA.armes[ref];
    const armure = DATA.armures[ref];
    const nom = arme ? arme.nom : (armure ? armure.nom : ref);
    return nom + (objet.qte > 1 ? ' ×' + objet.qte : '');
  }).join(' + ');
}

function choixDansListe(ctx, objet, cle) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const bloc = ui.el('div');
  bloc.appendChild(ui.el('p', { class: 'detail' }, objet.libelle || 'Au choix :'));
  const actuel = etat.equipement.sousChoix[cle] || objet.ref;
  const select = ui.el('select', {
    onchange: (e) => {
      state.modifier((s) => { s.equipement.sousChoix[cle] = e.target.value; });
      synchroniser(ctx);
      ctx.rafraichir();
    },
  }, objet.liste.map((ref) => {
    const arme = DATA.armes[ref] || DATA.armures[ref];
    const texte = arme ? arme.nom + (arme.dm ? ' (DM ' + arme.dm + ')' : '') : ref;
    return ui.el('option', { value: ref, selected: ref === actuel }, texte);
  }));
  bloc.appendChild(select);
  return bloc;
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

function detailCalculs(ctx) {
  const DATA = ctx.DATA;
  const d = rules.computeDerived(ctx.etat, DATA);
  const bloc = ui.el('div');
  bloc.appendChild(ui.el('h3', {}, 'Ce que ça donne'));

  const morceaux = ['10 (base)', ui.signe(d.defDetail.agi) + ' (AGI'
    + (d.defDetail.agiPlafonnee ? ', plafonnée par l’armure' : '') + ')'];
  if (d.defDetail.armure) morceaux.push('+' + d.defDetail.armure.def + ' (' + d.defDetail.armure.nom + ')');
  if (d.defDetail.bouclier) morceaux.push('+' + d.defDetail.bouclier.def + ' (' + d.defDetail.bouclier.nom + ')');
  for (const e of d.defDetail.effets) morceaux.push(ui.signe(e.valeur) + ' (' + e.libelle + ')');
  bloc.appendChild(ui.el('p', {}, [
    ui.el('strong', {}, 'Défense ' + d.def), ui.aideDonnee(DATA, 'DEF'),
    ' = ' + morceaux.join(' '),
  ]));

  bloc.appendChild(ui.el('p', {}, [
    ui.el('strong', {}, 'Attaques'), ui.aideDonnee(DATA, 'ATT'),
    ' — contact ' + ui.signe(d.att.contact) + ' (1 + FOR), distance '
    + ui.signe(d.att.distance) + ' (1 + AGI), magique ' + ui.signe(d.att.magique) + ' (1 + VOL)',
  ]));

  if (d.armes.length) {
    const table = ui.el('table', { class: 'table-caracs' });
    table.appendChild(ui.el('thead', {}, ui.el('tr', {}, [
      ui.el('th', {}, 'Arme'), ui.el('th', {}, 'Attaque'), ui.el('th', {}, 'DM'),
      ui.el('th', {}, 'Spécial / portée'),
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
    bloc.appendChild(table);
  }
  return bloc;
}
