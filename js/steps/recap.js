/* Écran 10 — Récapitulatif : la fiche complète, le portrait (prompt à copier puis image à
   déposer) et le téléchargement de la feuille PDF. */

window.ETAPES = window.ETAPES || {};

const TAILLE_PORTRAIT = 1200;   // côté maximal du portrait, en pixels
const QUALITE_PORTRAIT = 0.85;

window.ETAPES[10] = {
  titre: 'Votre fiche est prête',

  rendre(bloc, ctx) {
    const DATA = ctx.DATA;
    const etat = ctx.etat;
    const d = rules.computeDerived(etat, DATA);
    const profil = DATA.profils[etat.profil];
    const peuple = DATA.peuples[etat.peuple];

    bloc.appendChild(ui.el('p', {}, DATA.creation.maison.ecrans.recap));
    bloc.appendChild(ui.el('h3', {}, etat.nom || 'Personnage sans nom'));
    bloc.appendChild(ui.el('p', { class: 'detail' },
      [peuple.nom, profil.nom.toLowerCase(), 'niveau 1'].join(', ')
      + ' — joué par ' + etat.joueur + '.'));

    // ---- valeurs
    const colonnes = ui.el('div', { class: 'recap-colonnes' });
    const caracs = ui.el('div');
    caracs.appendChild(ui.el('h4', {}, 'Caractéristiques'));
    const listeCaracs = ui.el('ul', { class: 'liste-nue' });
    for (const carac of rules.CARACS) {
      const mod = d.modificateursPeuple[carac];
      listeCaracs.appendChild(ui.el('li', {}, carac + ' ' + rules.signe(d.caracs[carac])
        + (mod ? ' (dont ' + rules.signe(mod) + ' de peuple)' : '')));
    }
    caracs.appendChild(listeCaracs);
    colonnes.appendChild(caracs);

    const valeurs = ui.el('div');
    valeurs.appendChild(ui.el('h4', {}, 'Valeurs'));
    valeurs.appendChild(ui.el('ul', { class: 'liste-nue' }, [
      ui.el('li', {}, 'Points de vigueur : ' + d.pv),
      ui.el('li', {}, 'Défense : ' + d.def),
      ui.el('li', {}, 'Initiative : ' + d.init),
      ui.el('li', {}, 'Points de chance : ' + d.pc),
      ui.el('li', {}, 'Dés de récupération : ' + d.dr.n + ' ' + d.dr.type),
      d.pm !== null ? ui.el('li', {}, 'Points de mana : ' + d.pm) : null,
      ui.el('li', {}, 'Attaques : contact ' + rules.signe(d.att.contact)
        + ', distance ' + rules.signe(d.att.distance)
        + ', magique ' + rules.signe(d.att.magique)),
    ]));
    colonnes.appendChild(valeurs);
    bloc.appendChild(colonnes);

    // ---- capacités
    const capacites = ui.el('div');
    for (const acquise of d.capacites) {
      const ligne = ui.el('div', { class: 'capacite' });
      ligne.appendChild(ui.el('p', { class: 'titre-capacite' },
        acquise.voie.nom + ' — rang ' + acquise.capacite.rang + ' · ' + acquise.capacite.titre
        + ((acquise.capacite.tags || []).map((t) => ' (' + t + ')').join(''))
        + (acquise.capacite.sort ? ' *' : '')));
      ligne.appendChild(ui.el('p', { class: 'texte detail' }, acquise.capacite.texte));
      capacites.appendChild(ligne);
    }
    bloc.appendChild(ui.section('Capacités', capacites));

    // ---- armes et équipement
    const armes = ui.el('ul', { class: 'liste-nue' });
    for (const arme of d.armes) {
      armes.appendChild(ui.el('li', {}, arme.nom + ' — attaque 1d20 ' + rules.signe(arme.att)
        + ', DM ' + arme.dm + (arme.special ? ' (' + arme.special + ')' : '')));
    }
    bloc.appendChild(ui.section('Armes et équipement', [
      armes, ui.el('p', { class: 'detail' }, texteEquipementRecap(etat, DATA)),
    ]));

    // ---- traits et histoire
    bloc.appendChild(ui.section('Ce qui fait votre personnage', ui.el('ul', { class: 'liste-nue' }, [
      ui.el('li', {}, 'Idéal : ' + (etat.touche.ideal || '—')),
      ui.el('li', {}, 'Travers : ' + (etat.touche.travers || '—')),
      ui.el('li', {}, 'Secret : ' + (etat.touche.secret || '—')),
      ui.el('li', {}, 'Bizarrerie : ' + (etat.touche.bizarrerie || '—')),
    ])));
    if (etat.histoire) {
      bloc.appendChild(ui.section('Votre histoire', ui.paragraphes(etat.histoire)));
    }

    if (d.avertissements.length) {
      const liste = ui.el('ul', { class: 'liste-nue' });
      for (const message of d.avertissements) liste.appendChild(ui.el('li', {}, '⚠ ' + message));
      bloc.appendChild(ui.encadre(liste, 'avertissement'));
    }
    if (d.notes.length) {
      const liste = ui.el('ul', { class: 'liste-nue' });
      for (const note of d.notes) liste.appendChild(ui.el('li', {}, note.titre + ' : ' + note.texte));
      bloc.appendChild(ui.encadre(liste));
    }

    // ---- portrait, puis téléchargement
    bloc.appendChild(sectionPortrait(ctx));
    bloc.appendChild(sectionTelechargement(ctx));
  },
};

function texteEquipementRecap(etat, DATA) {
  const objets = rules.equipementResolu(etat, DATA)
    .map((o) => o.nom + (o.qte > 1 ? ' ×' + o.qte : ''));
  objets.push('sac d’aventurier');
  if (etat.equipement.bourse !== null) objets.push(etat.equipement.bourse + ' pa');
  if (etat.equipement.libre) objets.push(etat.equipement.libre);
  return objets.join(', ') + '.';
}

/* ------------------------------------------------------------------ portrait */

function sectionPortrait(ctx) {
  const DATA = ctx.DATA;
  const etat = ctx.etat;
  const contenu = ui.el('div', { class: 'prompt-zone' });

  // 1. la zone de dépôt, bien visible, avant le pavé du prompt
  const zone = ui.el('div', { class: 'zone-televersement' });
  const apercu = ui.el('div');
  const message = ui.el('p', { class: 'succes' });

  const afficherApercu = () => {
    ui.vider(apercu);
    const image = state.portrait();
    if (!image) return;
    apercu.appendChild(ui.el('img', { class: 'portrait-apercu', src: image, alt: 'Portrait' }));
    apercu.appendChild(ui.el('div', {}, ui.el('button', {
      type: 'button', class: 'bouton-lien',
      onclick: () => { state.effacerPortrait(); afficherApercu(); },
    }, 'Retirer ce portrait')));
  };

  const champ = ui.el('input', {
    type: 'file', accept: 'image/*', id: 'champ-portrait', class: 'champ-fichier',
    onchange: async (e) => {
      const fichier = e.target.files && e.target.files[0];
      if (!fichier) return;
      try {
        const dataUrl = await redimensionner(fichier);
        if (!state.enregistrerPortrait(dataUrl)) {
          message.textContent = 'Image trop lourde pour être conservée : réessayez avec une '
            + 'image plus petite.';
        } else {
          message.textContent = 'Portrait enregistré : il ira sur la page annexe.';
        }
        afficherApercu();
      } catch (err) {
        message.textContent = 'Image illisible : ' + err.message;
      }
    },
  });

  zone.appendChild(ui.el('p', {}, 'Une fois votre image générée, déposez-la ici : elle ira '
    + 'sur la page annexe de votre feuille.'));
  zone.appendChild(champ);
  zone.appendChild(ui.el('label', { class: 'bouton bouton-fichier', for: 'champ-portrait' },
    'Choisir mon image…'));
  zone.appendChild(apercu);
  zone.appendChild(message);
  contenu.appendChild(zone);

  // 2. le prompt à copier
  const prompt = etat.promptPerso || buildImagePrompt(etat, DATA);
  const texte = ui.el('textarea', {
    oninput: (e) => state.modifier((s) => { s.promptPerso = e.target.value; }),
  }, prompt);
  contenu.appendChild(ui.encadre(DATA.creation.maison.notePrompt, 'maison'));
  contenu.appendChild(texte);
  contenu.appendChild(ui.el('div', { class: 'tirage' }, [
    ui.el('button', {
      type: 'button', class: 'bouton bouton-petit',
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(texte.value);
          message.textContent = 'Texte copié : collez-le dans ChatGPT.';
        } catch (e) {
          texte.select();
          message.textContent = 'Copiez-le à la main (Ctrl+C) : le presse-papiers est bloqué.';
        }
      },
    }, 'Copier le texte'),
  ]));

  afficherApercu();
  return ui.section('Le portrait de votre héros', contenu);
}

/** Redimensionne l'image dans le navigateur avant de la garder (JPEG, 1200 px maximum). */
function redimensionner(fichier) {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error('lecture impossible'));
    lecteur.onload = () => {
      const image = new Image();
      image.onerror = () => rejeter(new Error('format non reconnu'));
      image.onload = () => {
        const echelle = Math.min(1, TAILLE_PORTRAIT / Math.max(image.width, image.height));
        const toile = document.createElement('canvas');
        toile.width = Math.round(image.width * echelle);
        toile.height = Math.round(image.height * echelle);
        const contexte = toile.getContext('2d');
        contexte.fillStyle = '#ffffff';
        contexte.fillRect(0, 0, toile.width, toile.height);
        contexte.drawImage(image, 0, 0, toile.width, toile.height);
        resoudre(toile.toDataURL('image/jpeg', QUALITE_PORTRAIT));
      };
      image.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

function octetsDeDataUrl(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return octets;
}

/* ------------------------------------------------------------------ téléchargement */

function sectionTelechargement(ctx) {
  const etat = ctx.etat;
  const contenu = ui.el('div');
  contenu.appendChild(ui.el('p', { class: 'detail' },
    'Vous obtenez la feuille officielle remplie, avec une page annexe pour votre histoire '
    + 'et votre portrait. Envoyez-la à votre MJ.'));

  const message = ui.el('p', { class: 'succes' });
  const bouton = ui.el('button', {
    type: 'button', class: 'bouton',
    onclick: async () => {
      bouton.disabled = true;
      message.textContent = 'Préparation de la feuille…';
      message.className = 'succes';
      try {
        const portrait = state.portrait();
        const octets = await pdf.fillSheet(etat, ctx.DATA, {
          portrait: portrait ? octetsDeDataUrl(portrait) : null,
        });
        pdf.telecharger(octets, etat.nom || 'Personnage');
        message.textContent = 'Feuille téléchargée. Bon jeu !';
      } catch (e) {
        console.error(e);
        message.textContent = 'La feuille n’a pas pu être produite : ' + e.message;
        message.className = 'erreurs';
      }
      bouton.disabled = false;
    },
  }, 'Télécharger la feuille PDF');

  contenu.appendChild(ui.el('div', { class: 'tirage' }, [bouton, message]));
  contenu.appendChild(ui.el('p', {}, ui.el('button', {
    type: 'button', class: 'bouton-lien',
    onclick: () => {
      if (!window.confirm('Effacer ce personnage et recommencer de zéro ?')) return;
      state.reinitialiser();
      ctx.allerA(0);
    },
  }, 'Recommencer un nouveau personnage')));
  return ui.section('Télécharger votre feuille', contenu);
}
