/* Écran 5 — Caractéristiques.

   Deux modes : la série officielle du livre, dont on répartit les sept valeurs, et la
   répartition libre (budget de 7 points, coût croissant). Puis le modificateur de peuple :
   quand le livre laisse le choix, le joueur choisit ; quand il l'impose, on l'applique. */

window.ETAPES = window.ETAPES || {};

window.ETAPES[5] = {
  titre: 'Sept chiffres pour un héros',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    const profil = DATA.profils[etat.profil];
    appliquerImposes(ctx);
    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.caracs));

    // ---- choix du mode
    bloc.appendChild(ui.boutonsChoix([
      { valeur: 'serie', libelle: 'Série officielle à répartir' },
      { valeur: 'points', libelle: 'Répartition libre' },
    ], etat.caracs.methode, (methode) => {
      state.modifier((s) => {
        s.caracs.methode = methode;
        s.caracs.base = { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 };
      });
      ctx.rafraichir();
    }));

    if (etat.caracs.methode === 'serie') {
      const choixSerie = ui.el('div', { class: 'tirage' });
      for (const cle of Object.keys(rules.SERIES)) {
        const serie = rules.SERIES[cle];
        choixSerie.appendChild(ui.el('button', {
          type: 'button',
          class: 'bouton bouton-petit ' + (etat.caracs.serie === cle ? '' : 'bouton-secondaire'),
          onclick: () => {
            state.modifier((s) => {
              s.caracs.serie = cle;
              s.caracs.base = { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 };
            });
            ctx.rafraichir();
          },
        }, serie.nom + ' : ' + serie.valeurs.map(ui.signe).join(', ')));
      }
      bloc.appendChild(choixSerie);
      ui.ajouter(bloc, ui.paragraphes(DATA.creation.livre.repartition));
    } else {
      bloc.appendChild(ui.encadre(DATA.creation.maison.avertissementModeLibre, 'avertissement'));
      bloc.appendChild(ui.el('p', { class: 'detail' },
        'Coût : -1 → -1 point · 0 → 0 · +1 → 1 · +2 → 2 · +3 → 4 · +4 → 6. '
        + 'Les trois séries officielles coûtent exactement 7 points.'));
    }

    bloc.appendChild(tableauCaracs(ctx, profil));

    if (etat.caracs.methode === 'points') {
      const cout = rules.coutTotal(etat.caracs.base);
      const reste = rules.BUDGET_POINTS - cout;
      bloc.appendChild(ui.el('p', { class: 'budget ' + (reste < 0 ? 'depasse' : '') },
        'Points utilisés : ' + cout + ' / ' + rules.BUDGET_POINTS
        + (reste === 0 ? ' — parfait.' : reste > 0 ? ' — il vous en reste ' + reste + '.'
          : ' — vous dépassez de ' + (-reste) + '.')));
    }

    bloc.appendChild(ui.section('Échelle des valeurs', echelle(DATA)));

    // ---- modificateur de peuple
    bloc.appendChild(ui.section('Le modificateur de votre peuple', modificateurs(ctx)));

    // ---- magie et alertes
    if (profil.caracMagie) {
      bloc.appendChild(ui.encadre(DATA.creation.livre.magie));
    }
    const d = rules.computeDerived(etat, DATA);
    if (d.avertissements.length) {
      const liste = ui.el('ul', { class: 'liste-nue' });
      for (const message of d.avertissements) liste.appendChild(ui.el('li', {}, '⚠ ' + message));
      bloc.appendChild(ui.encadre(liste, 'avertissement'));
    }
  },

  valider(etat, DATA) {
    const erreurs = [];
    if (etat.caracs.methode === 'points') {
      const cout = rules.coutTotal(etat.caracs.base);
      if (cout > rules.BUDGET_POINTS) erreurs.push('Vous dépassez le budget de 7 points.');
      if (cout < rules.BUDGET_POINTS) erreurs.push('Il vous reste des points à répartir.');
    } else {
      const valeurs = rules.SERIES[etat.caracs.serie].valeurs.slice().sort();
      const placees = rules.CARACS.map((c) => etat.caracs.base[c] || 0).sort();
      if (JSON.stringify(valeurs) !== JSON.stringify(placees)) {
        erreurs.push('Placez toutes les valeurs de la série.');
      }
    }
    const peuple = DATA.peuples[etat.peuple];
    const nbMods = (peuple.modificateurs || []).length;
    const faits = (etat.caracs.choixPeupleIndex || []).filter(Boolean).length;
    if (faits < nbMods) erreurs.push('Appliquez le modificateur de votre peuple.');
    return erreurs;
  },
};

/* ------------------------------------------------------------------ tableau */

function tableauCaracs(ctx, profil) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const mods = rules.modificateursPeuple(etat, DATA);
  const cles = (profil.caracsCles || []).map((c) => (Array.isArray(c) ? c : [c]));

  const table = ui.el('table', { class: 'table-caracs' });
  const entete = ui.el('tr', {}, [
    ui.el('th', {}, 'Caractéristique'), ui.el('th', {}, 'Base'),
    ui.el('th', {}, 'Peuple'), ui.el('th', {}, 'Total'),
  ]);
  table.appendChild(ui.el('thead', {}, entete));
  const corps = ui.el('tbody');

  for (const carac of rules.CARACS) {
    const estCle = cles.some((groupe) => groupe.indexOf(carac) !== -1);
    const base = etat.caracs.base[carac] || 0;
    const mod = mods[carac] || 0;
    const cellules = [
      ui.el('td', {}, [
        ui.el('strong', {}, carac), estCle ? ' ★' : '', ui.aideDonnee(DATA, carac),
      ]),
      ui.el('td', {}, etat.caracs.methode === 'points'
        ? reglagePoints(ctx, carac) : choixValeur(ctx, carac)),
      ui.el('td', {}, mod ? ui.signe(mod) : '—'),
      ui.el('td', {}, ui.el('span', { class: 'valeur-carac' }, ui.signe(base + mod))),
    ];
    corps.appendChild(ui.el('tr', {}, cellules));
  }
  table.appendChild(corps);

  const legende = ui.el('p', { class: 'detail' },
    '★ caractéristiques clés du profil : ' + profil.caracsClesTexte + '.');
  return ui.el('div', {}, [table, legende]);
}

/** Mode série : une liste déroulante par caractéristique, alimentée par les valeurs libres. */
function choixValeur(ctx, carac) {
  const etat = ctx.etat;
  const valeurs = rules.SERIES[etat.caracs.serie].valeurs;
  const restantes = valeursRestantes(etat);
  const actuelle = etat.caracs.base[carac] || 0;
  const options = [];
  const vues = {};
  for (const v of valeurs) {
    const libre = (restantes[v] || 0) > 0 || v === actuelle;
    if (!libre || vues[v]) continue;
    vues[v] = true;
    options.push(ui.el('option', { value: String(v), selected: v === actuelle }, ui.signe(v)));
  }
  if (!options.some((o) => o.selected)) {
    options.unshift(ui.el('option', { value: '', selected: true }, '—'));
  }
  return ui.el('select', {
    onchange: (e) => {
      const valeur = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
      state.modifier((s) => { s.caracs.base[carac] = valeur; });
      ctx.rafraichir();
    },
  }, options);
}

/** Valeurs de la série qui ne sont pas encore placées. */
function valeursRestantes(etat) {
  const restantes = {};
  for (const v of rules.SERIES[etat.caracs.serie].valeurs) restantes[v] = (restantes[v] || 0) + 1;
  for (const carac of rules.CARACS) {
    const v = etat.caracs.base[carac];
    if (v !== undefined && restantes[v]) restantes[v] -= 1;
  }
  return restantes;
}

/** Mode libre : boutons − et + avec le coût en points. */
function reglagePoints(ctx, carac) {
  const etat = ctx.etat;
  const valeur = etat.caracs.base[carac] || 0;
  const changer = (delta) => {
    const nouvelle = valeur + delta;
    if (nouvelle < rules.MIN_POINTS || nouvelle > rules.MAX_POINTS) return;
    state.modifier((s) => { s.caracs.base[carac] = nouvelle; });
    ctx.rafraichir();
  };
  return ui.el('span', { class: 'tirage' }, [
    ui.el('button', {
      type: 'button', class: 'bouton bouton-petit bouton-secondaire',
      disabled: valeur <= rules.MIN_POINTS, onclick: () => changer(-1),
    }, '−'),
    ui.el('span', { class: 'valeur-carac' }, ui.signe(valeur)),
    ui.el('button', {
      type: 'button', class: 'bouton bouton-petit bouton-secondaire',
      disabled: valeur >= rules.MAX_POINTS, onclick: () => changer(1),
    }, '+'),
    ui.el('span', { class: 'detail' }, '(' + rules.pointBuyCost(valeur) + ' pt)'),
  ]);
}

function echelle(DATA) {
  const liste = ui.el('ul', { class: 'liste-nue' });
  for (const valeur of Object.keys(DATA.creation.echelle)) {
    liste.appendChild(ui.el('li', {}, [
      ui.el('span', { class: 'pastille' }, valeur), ' ', DATA.creation.echelle[valeur],
    ]));
  }
  return liste;
}

/* ------------------------------------------------------------------ peuple */

/** Un modificateur sans alternative (le « -1 en AGI » du nain) s'applique tout seul :
    il n'y a rien à demander au joueur, mais la validation attend qu'il soit enregistré. */
function appliquerImposes(ctx) {
  const peuple = ctx.DATA.peuples[ctx.etat.peuple];
  if (!peuple) return;
  const mods = peuple.modificateurs || [];
  const index = ctx.etat.caracs.choixPeupleIndex || [];
  const aFaire = mods.some((mod, i) => !mod.regle && (mod.choix || []).length === 1 && !index[i]);
  if (!aFaire) return;
  state.modifier((s) => {
    const choisies = s.caracs.choixPeupleIndex || (s.caracs.choixPeupleIndex = []);
    mods.forEach((mod, i) => {
      if (!mod.regle && (mod.choix || []).length === 1 && !choisies[i]) choisies[i] = mod.choix[0];
    });
    s.caracs.choixPeuple = recomposer(mods, choisies);
  });
}

function recomposer(mods, choisies) {
  const table = {};
  mods.forEach((mod, i) => {
    const carac = choisies[i];
    if (!carac) return;
    table[carac] = (table[carac] || 0) + mod.valeur;
  });
  return table;
}

function modificateurs(ctx) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const peuple = DATA.peuples[etat.peuple];
  const bloc = ui.el('div');
  const mods = peuple.modificateurs || [];

  mods.forEach((mod, index) => {
    const candidats = mod.regle === 'deuxPlusFaibles'
      ? deuxPlusFaibles(etat) : (mod.choix || []);

    // modificateur imposé : on l'annonce, sans rien demander
    if (!mod.regle && candidats.length === 1) {
      bloc.appendChild(ui.el('p', {}, ['Votre peuple vous impose ',
        ui.el('strong', {}, ui.signe(mod.valeur) + ' en ' + candidats[0]), '.']));
      return;
    }

    bloc.appendChild(ui.el('p', {}, mod.valeur > 0
      ? 'Votre peuple vous permet d’ajouter un bonus à l’une de vos caractéristiques, '
        + 'choisissez laquelle.'
      : 'Votre peuple vous impose un malus, choisissez sur quelle caractéristique '
        + 'le prendre.'));
    const choix = ui.el('div', { class: 'tirage' });
    for (const carac of candidats) {
      choix.appendChild(ui.el('button', {
        type: 'button',
        class: 'bouton bouton-petit '
          + ((etat.caracs.choixPeupleIndex || [])[index] === carac ? '' : 'bouton-secondaire'),
        onclick: () => appliquerModificateur(ctx, index, carac),
      }, carac + ' ' + ui.signe(mod.valeur)));
    }
    bloc.appendChild(choix);
  });
  return bloc;
}

/** Les deux caractéristiques les plus faibles (cas de l'humain), égalités comprises. */
function deuxPlusFaibles(etat) {
  const valeurs = rules.CARACS.map((c) => ({ carac: c, valeur: etat.caracs.base[c] || 0 }));
  const triees = valeurs.slice().sort((a, b) => a.valeur - b.valeur);
  const seuil = triees[1].valeur;
  return valeurs.filter((v) => v.valeur <= seuil).map((v) => v.carac);
}

function appliquerModificateur(ctx, index, carac) {
  state.modifier((s) => {
    const choisies = s.caracs.choixPeupleIndex || (s.caracs.choixPeupleIndex = []);
    choisies[index] = carac;
    s.caracs.choixPeuple = recomposer(ctx.DATA.peuples[s.peuple].modificateurs || [], choisies);
  });
  ctx.rafraichir();
}
