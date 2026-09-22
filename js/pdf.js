/* Remplissage de la feuille de personnage officielle (assets/feuille.pdf) avec pdf-lib,
   puis ajout de deux pages annexes : « Les capacités de … » et « Histoire de … ».

   Les cases de capacités de la feuille sont petites : sur les 140 capacités de rang 1 et 2
   du livre, la moitié n'y tient pas à une taille lisible. On y écrit donc des phrases
   entières tant qu'elles rentrent à 6 pt, suivies d'un renvoi, et le texte intégral part
   sur la page annexe des capacités — aucune règle n'est réécrite ni perdue.

   Deux particularités de cette feuille (voir tools/verification.md) :
   — elle a été ré-enregistrée par Aperçu, il faut appeler reparerChamps() sinon rien ne
     s'affiche (js/pdf-repair.js) ;
   — treize cases de la page 2 sont cochées à l'origine : on les remet toutes à zéro.

   La police est l'Helvetica standard du PDF, qui n'accepte que le jeu WinAnsi : tout
   caractère hors de ce jeu est remplacé et signalé dans la console. */

const FORMAT_PAGE = [473.386, 609.449];

const pdf = {

  /** Produit la feuille remplie. Renvoie un Uint8Array. */
  async fillSheet(etat, DATA, options) {
    const opts = options || {};
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const carte = await fetch('assets/fields-map.json', { cache: 'no-cache' }).then((r) => r.json());
    const octets = await fetch('assets/feuille.pdf', { cache: 'no-cache' }).then((r) => r.arrayBuffer());
    const doc = await PDFDocument.load(octets);
    reparerChamps(doc);

    const formulaire = doc.getForm();
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const helveticaGras = await doc.embedFont(StandardFonts.HelveticaBold);
    const d = rules.computeDerived(etat, DATA);
    const profil = DATA.profils[etat.profil];
    const peuple = DATA.peuples[etat.peuple];
    const famille = DATA.familles[profil.famille];

    const ecrire = (nom, valeur, tailleMax) => {
      if (!nom) return;
      let champ;
      try { champ = formulaire.getTextField(nom); } catch (e) { console.warn('champ absent :', nom); return; }
      const texte = nettoyerWinAnsi(valeur === null || valeur === undefined ? '' : String(valeur));
      champ.setText(texte);
      if (texte) ajusterTaille(champ, texte, helvetica, tailleMax || 10);
    };
    const cocher = (nom, coche) => {
      if (!nom) return;
      try {
        const case_ = formulaire.getCheckBox(nom);
        if (coche) case_.check(); else case_.uncheck();
      } catch (e) { console.warn('case absente :', nom); }
    };

    // toutes les cases à zéro (la feuille en a treize cochées d'origine)
    for (const nom of carte.toutesLesCases) cocher(nom, false);

    /* ---------------------------------------------------------------- page 1 */
    const p1 = carte.page1;
    ecrire(p1.nomPersonnage, etat.nom, 14);
    ecrire(p1.joueur, etat.joueur, 10);
    ecrire(p1.niveau, '1', 10);
    ecrire(p1.niveauAttaques, '1', 12);
    ecrire(p1.famille, famille.nom, 10);
    ecrire(p1.profil, profil.nom, 10);
    ecrire(p1.ideal, etat.touche.ideal, 10);
    ecrire(p1.travers, etat.touche.travers, 10);
    ecrire(p1.init, String(d.init), 12);
    ecrire(p1.def, String(d.def), 12);
    ecrire(p1.pvMax, String(d.pv), 12);
    ecrire(p1.pvActuels, String(d.pv), 12);
    ecrire(p1.pcMax, String(d.pc), 12);
    ecrire(p1.drType, d.dr.type, 12);
    ecrire(p1.drMax, String(d.dr.n), 12);
    if (d.pm !== null) {
      ecrire(p1.pmMax, String(d.pm), 12);
      ecrire(p1.pmActuels, String(d.pm), 12);
    }

    for (const carac of rules.CARACS) {
      ecrire(p1.caracs[carac], rules.signe(d.caracs[carac]), 10);
      const mod = d.modificateursPeuple[carac];
      ecrire(p1.notes[carac], mod ? rules.signe(mod) + ' ' + peuple.nom.toLowerCase() : '', 7);
    }

    ecrire(p1.attaques.contact, rules.signe(d.att.contact), 12);
    ecrire(p1.attaques.distance, rules.signe(d.att.distance), 12);
    ecrire(p1.attaques.magique, rules.signe(d.att.magique), 12);
    ecrire(p1.modsAttaque.contact, rules.signe(d.caracs.FOR), 12);
    ecrire(p1.modsAttaque.distance, rules.signe(d.caracs.AGI), 12);
    ecrire(p1.modsAttaque.magique, rules.signe(d.caracs.VOL), 12);

    d.armes.slice(0, 3).forEach((arme, i) => {
      const ligne = p1.armes[i];
      ecrire(ligne.nom, arme.nom, 10);
      ecrire(ligne.att, rules.signe(arme.att), 10);
      ecrire(ligne.dm, arme.dm, 10);
      ecrire(ligne.special, arme.special, 8);
    });

    ecrire(p1.equipement, texteEquipement(etat, DATA), 8);

    // voie de peuple (ou voie du mage à sa place)
    const voiePeuple = rules.voieDePeuple(etat, DATA);
    const utiliseVoieDuMage = etat.voies.peuple === 'voie-du-mage';
    const voiePage1 = utiliseVoieDuMage ? DATA.voieDuMage : voiePeuple;
    if (voiePage1) {
      ecrire(p1.voiePeuple.nomVoie, voiePage1.nom, 10);
      const rang1 = voiePage1.capacites[0];
      // les fiches du livre notent « Occultisme + <capacité de peuple> » : le champ est court
      const titreRang1 = utiliseVoieDuMage && voiePeuple
        ? 'Occultisme + ' + voiePeuple.capacites[0].titre
        : titreAffiche(rang1);
      ecrire(p1.voiePeuple.titres['1'], titreRang1, 9);
      let texteRang1 = rang1.texte;
      if (utiliseVoieDuMage && voiePeuple) {
        texteRang1 += '\n' + voiePeuple.capacites[0].titre + ' ('
          + voiePeuple.nom + ') : ' + voiePeuple.capacites[0].texte;
      }
      const sousChoixPeuple = texteSousChoix(etat, DATA);
      if (sousChoixPeuple) texteRang1 += '\n' + sousChoixPeuple;
      ecrireCapacite(formulaire, helvetica, p1.voiePeuple.textes['1'], texteRang1);
      cocher(p1.voiePeuple.cases['1'], true);
      // rang 2 de la voie du mage, s'il a été choisi
      if (utiliseVoieDuMage && etat.voies.rang2Mage && etat.voies.rang2Mage.voie === 'voie-du-mage') {
        const rang2 = DATA.voieDuMage.capacites[1];
        ecrire(p1.voiePeuple.titres['2'], titreAffiche(rang2), 9);
        ecrireCapacite(formulaire, helvetica, p1.voiePeuple.textes['2'], rang2.texte);
        cocher(p1.voiePeuple.cases['2'], true);
      }
    }

    /* ---------------------------------------------------------------- page 2 */
    const p2 = carte.page2;
    ecrireMultiligne(formulaire, helvetica, p2.description, texteDescription(etat, DATA, d), 8);

    const colonnes = ['1', '2', '3', '4', '5'];
    let colonne = 0;
    for (const slug of etat.voies.profil) {
      const voie = rules.voieDeProfil(DATA, profil.slug, slug);
      if (!voie) continue;
      const bloc = p2.voies[colonnes[colonne++]];
      ecrire(bloc.nomVoie, voie.nom, 9);
      const rang1 = voie.capacites[0];
      ecrire(bloc.titres['1'], titreAffiche(rang1), 9);
      ecrireCapacite(formulaire, helvetica, bloc.textes['1'], rang1.texte);
      cocher(bloc.cases['1'], true);
      // capacité de rang 2 des mages, si elle est dans cette voie
      if (etat.voies.rang2Mage && etat.voies.rang2Mage.voie === slug) {
        const rang2 = voie.capacites[1];
        ecrire(bloc.titres['2'], titreAffiche(rang2), 9);
        ecrireCapacite(formulaire, helvetica, bloc.textes['2'], rang2.texte);
        cocher(bloc.cases['2'], true);
      }
    }

    // capacité obtenue par un sous-choix (gnome « Don étrange ») : bloc suivant
    const empruntee = d.capacites.find((c) => c.origine === 'sousChoix');
    if (empruntee && colonne < colonnes.length) {
      const bloc = p2.voies[colonnes[colonne++]];
      ecrire(bloc.nomVoie, empruntee.voie.nom, 9);
      ecrire(bloc.titres['1'], titreAffiche(empruntee.capacite), 9);
      ecrireCapacite(formulaire, helvetica, bloc.textes['1'], empruntee.capacite.texte);
      cocher(bloc.cases['1'], true);
    }

    /* ---------------------------------------------------------------- pages annexes */
    pageCapacites(doc, etat, DATA, d, helvetica, helveticaGras);
    await pageAnnexe(doc, etat, DATA, d, helvetica, helveticaGras, opts.portrait);

    formulaire.updateFieldAppearances(helvetica);
    if (opts.figer) formulaire.flatten();
    return doc.save();
  },

  /** Enregistre le PDF produit sous « <Nom> - COF2.pdf ». */
  telecharger(octets, nom) {
    const blob = new Blob([octets], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = (nom || 'Personnage') + ' - COF2.pdf';
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

/* ------------------------------------------------------------------ pages annexes */

/** Petit rédacteur de pages annexes : il tient la position courante et ouvre une page de
    plus dès que le bas est atteint, pour que rien ne soit coupé en silence. */
function redacteur(doc, police, policeGrasse) {
  const { rgb } = PDFLib;
  const marge = 38;
  const largeur = FORMAT_PAGE[0] - marge * 2;
  const bas = 38;   // même marge qu'à gauche et à droite
  let page = null;
  let y = 0;

  const r = {
    marge,
    largeur,
    or: rgb(0.65, 0.49, 0.18),
    encre: rgb(0.23, 0.18, 0.11),

    get page() { return page; },
    get y() { return y; },
    set y(valeur) { y = valeur; },

    nouvellePage() {
      page = doc.addPage(FORMAT_PAGE);
      y = FORMAT_PAGE[1] - 52;
      return page;
    },

    /** Ouvre une page de plus s'il ne reste pas la hauteur demandée. */
    place(hauteur) {
      if (!page || y - hauteur < bas) r.nouvellePage();
    },

    titre(texte) {
      r.place(34);
      page.drawText(nettoyerWinAnsi(texte), {
        x: marge, y, size: 17, font: policeGrasse, color: r.encre,
      });
      y -= 10;
      page.drawLine({
        start: { x: marge, y }, end: { x: marge + largeur, y }, thickness: 1, color: r.or,
      });
      y -= 20;
    },

    /** Petit intitulé doré, du genre « Idéal » ou « Voie du bouclier — rang 1 ». */
    intertitre(texte) {
      page.drawText(nettoyerWinAnsi(texte), {
        x: marge, y, size: 9, font: policeGrasse, color: r.or,
      });
      y -= 13;
    },

    texte(contenu, options) {
      const o = options || {};
      const taille = o.taille || 10;
      const interligne = taille * 1.35;
      const fonte = o.gras ? policeGrasse : police;
      for (const paragraphe of String(contenu).split('\n')) {
        if (!paragraphe.trim()) { y -= taille * 0.6; continue; }
        for (const ligne of couper(nettoyerWinAnsi(paragraphe), fonte, taille, o.largeur || largeur)) {
          r.place(interligne);
          page.drawText(ligne, {
            x: marge, y, size: taille, font: fonte, color: o.couleur || r.encre,
          });
          y -= interligne;
        }
      }
    },

    espace(hauteur) { y -= hauteur; },
  };
  return r;
}

/** Page « Les capacités de … » : le texte intégral du livre, à une taille lisible.
    C'est elle que visent les renvois « suite en annexe » des cases de la feuille. */
function pageCapacites(doc, etat, DATA, d, police, policeGrasse) {
  if (!d.capacites.length) return;
  const r = redacteur(doc, police, policeGrasse);
  r.nouvellePage();
  r.titre('Les capacités de ' + (etat.nom || 'ce héros'));
  r.texte('Le texte complet, tel qu’il est écrit dans le livre : les cases de la feuille '
    + 'sont trop petites pour l’accueillir en entier.', { taille: 9, couleur: r.or });
  r.espace(14);

  for (const acquise of d.capacites) {
    r.place(56);      // de quoi poser l'intitulé, le titre et le début du texte ensemble
    r.intertitre(acquise.voie.nom + ' — rang ' + acquise.capacite.rang);
    r.texte(titreAffiche(acquise.capacite), { taille: 12, gras: true });
    r.espace(3);
    r.texte(acquise.capacite.texte, { taille: 9.5 });
    r.espace(14);
  }

  // rappel des mentions employées par ces capacités, et d'elles seules
  const termes = (DATA.aide && DATA.aide.termes) || {};
  const mentions = [];
  const vues = {};
  for (const acquise of d.capacites) {
    for (const tag of acquise.capacite.tags || []) {
      if (termes[tag] && !vues[tag]) { vues[tag] = true; mentions.push(termes[tag].titre); }
    }
    if (acquise.capacite.sort && termes.sort && !vues.sort) {
      vues.sort = true;
      mentions.push(termes.sort.titre);
    }
  }
  if (mentions.length) {
    r.espace(4);
    r.texte(mentions.join('  ·  '), { taille: 8, couleur: r.or });
  }
}

/** Page « Histoire de … » : les traits, le portrait et le récit. */
async function pageAnnexe(doc, etat, DATA, d, police, policeGrasse, portrait) {
  const r = redacteur(doc, police, policeGrasse);
  const page = r.nouvellePage();
  r.titre('Histoire de ' + (etat.nom || 'ce héros'));

  const profil = DATA.profils[etat.profil];
  const peuple = DATA.peuples[etat.peuple];
  r.texte([peuple.nom, profil.nom.toLowerCase(), 'niveau 1'].join(', '), { taille: 10 });
  r.espace(9);

  // portrait à droite, s'il y en a un : le texte se resserre tant qu'il court à sa hauteur
  let largeurTexte = r.largeur;
  let basDuPortrait = 0;
  if (portrait) {
    try {
      const image = await doc.embedJpg(portrait);
      const largeurImage = Math.round(r.largeur / 3);
      const hauteurImage = Math.round(largeurImage * image.height / image.width);
      const x = r.marge + r.largeur - largeurImage;
      const yImage = r.y - hauteurImage + 8;
      page.drawImage(image, { x, y: yImage, width: largeurImage, height: hauteurImage });
      page.drawRectangle({
        x, y: yImage, width: largeurImage, height: hauteurImage,
        borderColor: r.or, borderWidth: 0.8,
      });
      largeurTexte = r.largeur - largeurImage - 16;
      basDuPortrait = yImage;
    } catch (e) {
      console.warn('Portrait non intégré :', e.message);
    }
  }

  /** Largeur utile : resserrée tant qu'on écrit à côté du portrait. */
  const largeurCourante = () => (r.page === page && r.y > basDuPortrait ? largeurTexte : r.largeur);

  const traits = [
    ['Idéal', etat.touche.ideal],
    ['Travers', etat.touche.travers],
    ['Secret', etat.touche.secret],
    ['Bizarrerie', etat.touche.bizarrerie],
  ];
  for (const [libelle, valeur] of traits) {
    if (!valeur) continue;
    r.place(30);
    r.intertitre(libelle);
    r.texte(valeur, { taille: 10, largeur: largeurCourante() });
    r.espace(4);
  }

  if (etat.histoire) {
    r.espace(6);
    r.place(30);
    r.intertitre('Son histoire');
    for (const paragraphe of etat.histoire.split('\n')) {
      if (!paragraphe.trim()) { r.espace(8); continue; }
      r.texte(paragraphe, { taille: 10.5, largeur: largeurCourante() });
      r.espace(4);
    }
  }
}

/* ------------------------------------------------------------------ textes composés */

function titreAffiche(capacite) {
  const tags = (capacite.tags || []).map((t) => '(' + t + ')').join('');
  return capacite.titre + (tags ? ' ' + tags : '') + (capacite.sort ? '*' : '');
}

function texteEquipement(etat, DATA) {
  const objets = rules.equipementResolu(etat, DATA)
    .map((o) => o.nom + (o.qte > 1 ? ' ×' + o.qte : ''));
  const morceaux = objets.slice();
  morceaux.push('sac d’aventurier (couverture, torche, briquet à silex, outre, gamelle)');
  if (etat.equipement.bourse !== null) morceaux.push('bourse de ' + etat.equipement.bourse + ' pa');
  if (etat.equipement.libre) morceaux.push(etat.equipement.libre);
  return morceaux.join(', ') + '.';
}

function texteDescription(etat, DATA, d) {
  const peuple = DATA.peuples[etat.peuple];
  const profil = DATA.profils[etat.profil];
  const lignes = [];
  const genre = etat.touche.genre === 'F' ? ' (féminin)'
    : etat.touche.genre === 'M' ? ' (masculin)' : '';
  const identite = [peuple.nom + genre, profil.nom.toLowerCase()];
  const mensurations = [];
  if (etat.touche.age) mensurations.push(etat.touche.age + ' ans');
  if (etat.touche.tailleCm) mensurations.push((etat.touche.tailleCm / 100).toFixed(2).replace('.', ',') + ' m');
  if (etat.touche.poidsKg) mensurations.push(etat.touche.poidsKg + ' kg');
  lignes.push(identite.join(', ') + (mensurations.length ? ' — ' + mensurations.join(', ') : '') + '.');
  if (etat.touche.description) lignes.push(etat.touche.description);
  if (etat.touche.secret) lignes.push('Secret : ' + etat.touche.secret);
  if (etat.touche.bizarrerie) lignes.push('Bizarrerie : ' + etat.touche.bizarrerie);
  const langues = (peuple.langues || []).concat(etat.touche.languesBonus || []);
  if (langues.length) lignes.push('Langues : ' + langues.join(', ') + '.');
  for (const note of d.notes || []) lignes.push(note.titre + ' : ' + note.texte);
  return lignes.join(' ');
}

/** Précision du sous-choix de rang 1 (origine de l'humain, capacité du gnome). */
function texteSousChoix(etat, DATA) {
  const morceaux = [];
  for (const cle of Object.keys(etat.voies.sousChoix || {})) {
    const valeur = etat.voies.sousChoix[cle];
    if (!valeur) continue;
    const fiche = DATA.sousChoix[cle];
    if (typeof valeur === 'string') {
      const option = fiche && (fiche.options || []).find((o) => o.nom === valeur);
      morceaux.push('Choix : ' + valeur
        + (option && option.domaines ? ' (+3 en ' + option.domaines.join(' et en ') + ')' : ''));
    } else if (valeur.titre) {
      morceaux.push('Capacité choisie : ' + valeur.titre);
    }
  }
  return morceaux.join(' ');
}

/* ------------------------------------------------------------------ outils de mise en page */

/** Remplace les caractères que la police standard du PDF ne sait pas écrire. */
function nettoyerWinAnsi(texte) {
  const remplacements = {
    '‑': '-', '‐': '-', '−': '-', ' ': ' ', ' ': ' ',
    ' ': ' ', '⁄': '/', '●': '•', '•': '•',
  };
  let sortie = '';
  let signale = false;
  for (const caractere of String(texte)) {
    const remplacant = remplacements[caractere];
    if (remplacant !== undefined) { sortie += remplacant; continue; }
    if (caractere === '\n' || caractere === '\t') { sortie += caractere; continue; }
    const code = caractere.codePointAt(0);
    if (code < 0x80 || ENCODABLES.has(caractere)) sortie += caractere;
    else { sortie += '?'; signale = true; }
  }
  if (signale) console.warn('Caractère non encodable remplacé dans :', String(texte).slice(0, 60));
  return sortie;
}

/* Caractères hors ASCII acceptés par l'encodage WinAnsi (suffisant pour le français). */
const ENCODABLES = new Set(
  ('àâäçéèêëîïôöùûüÿœÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒ«»…’‘“”–—°×±§¶©®™€£¤¥¡¿'
   + 'áãåæíìóòõñúüýÁÃÅÆÍÌÓÒÕÑÚÝßþðÐÞµ¼½¾¹²³·•‚„†‡ˆ‰‹›').split(''));

/** Découpe un texte en lignes qui tiennent dans une largeur donnée. */
function couper(texte, police, taille, largeur) {
  const lignes = [];
  for (const paragraphe of String(texte).split('\n')) {
    const mots = paragraphe.split(/\s+/).filter(Boolean);
    let ligne = '';
    for (const mot of mots) {
      const essai = ligne ? ligne + ' ' + mot : mot;
      if (police.widthOfTextAtSize(essai, taille) <= largeur) {
        ligne = essai;
      } else {
        if (ligne) lignes.push(ligne);
        ligne = mot;
      }
    }
    lignes.push(ligne);
  }
  return lignes;
}

/** Applique une taille de police. Certains champs de cette feuille (« Niv ») n'ont pas
    d'apparence par défaut : pdf-lib refuse alors setFontSize, on lui en donne une. */
function fixerTaille(champ, taille) {
  try {
    champ.setFontSize(taille);
  } catch (e) {
    try {
      champ.acroField.setDefaultAppearance('/Helv ' + taille.toFixed(1) + ' Tf 0 g');
      champ.setFontSize(taille);
    } catch (e2) {
      console.warn('taille de police non appliquée sur', champ.getName(), ':', e2.message);
    }
  }
}

function ajusterTaille(champ, texte, police, max, min) {
  fixerTaille(champ, tailleQuiRentre(champ, texte, police, max, min));
}

const TAILLE_MINIMALE = 4;
const TAILLE_CAPACITE_MAX = 7;
const TAILLE_CAPACITE_MIN = 6;   // en dessous, la case n'est plus lisible en jeu
const RENVOI_ANNEXE = ' (suite en annexe)';   // la police de la feuille ignore les flèches

/** Plus grande taille de police (≤ max) qui fait tenir le texte dans le champ. */
function tailleQuiRentre(champ, texte, police, max, min) {
  const plancher = min || TAILLE_MINIMALE;
  const boite = boiteDuChamp(champ);
  if (!boite) return max;
  for (let taille = max; taille >= plancher; taille -= 0.5) {
    if (couper(texte, police, taille, boite.largeur).length * taille * 1.16 <= boite.hauteur) {
      return taille;
    }
  }
  return plancher;
}

/* Marge de sécurité de part et d'autre du texte. Les cadres de la page 2 se touchent
   presque (2,4 pt entre deux colonnes) : sans cette marge, un mot de fin de ligne mord
   sur la colonne voisine, comme on l'a vu sur la feuille de Ninquessa. */
const MARGE_CHAMP = 9;

function boiteDuChamp(champ) {
  const widgets = champ.acroField.getWidgets();
  if (!widgets.length) return null;
  const rect = widgets[0].getRectangle();
  return {
    largeur: Math.max(10, rect.width - MARGE_CHAMP),
    hauteur: Math.max(6, rect.height - 3),
  };
}

/** Découpe un texte en phrases, pour ne jamais couper une règle au milieu. */
function phrases(texte) {
  const sortie = [];
  let courante = '';
  for (const mot of String(texte).split(/\s+/).filter(Boolean)) {
    courante = courante ? courante + ' ' + mot : mot;
    if (/[.!?]$/.test(mot) && !/(^|\s)(cf|etc|ex|p|pp|M|Mme|env)\.$/.test(mot)) {
      sortie.push(courante);
      courante = '';
    }
  }
  if (courante) sortie.push(courante);
  return sortie;
}

/** Ce qu'on peut écrire dans la case sans descendre sous 6 pt : des phrases entières,
    et un renvoi vers la page annexe dès qu'il manque quelque chose. */
function texteQuiRentre(champ, texteComplet, police) {
  const boite = boiteDuChamp(champ);
  if (!boite) return texteComplet;
  const tient = (t) => couper(t, police, TAILLE_CAPACITE_MIN, boite.largeur).length
    * TAILLE_CAPACITE_MIN * 1.16 <= boite.hauteur;
  if (tient(texteComplet)) return texteComplet;

  let garde = '';
  for (const phrase of phrases(texteComplet)) {
    const essai = garde ? garde + ' ' + phrase : phrase;
    if (!tient(essai + RENVOI_ANNEXE)) break;
    garde = essai;
  }
  if (garde) return garde + RENVOI_ANNEXE;

  // même la première phrase est trop longue : on retire des mots jusqu'à ce que ça tienne
  const mots = String(texteComplet).split(/\s+/).filter(Boolean);
  let n = mots.length;
  while (n > 1 && !tient(mots.slice(0, n).join(' ') + ' […]' + RENVOI_ANNEXE)) n--;
  return mots.slice(0, n).join(' ') + ' […]' + RENVOI_ANNEXE;
}

/** Case de capacité de la feuille. On coupe les lignes nous-mêmes avant de les donner à
    pdf-lib : sa propre découpe se fait sur un cadre un peu plus large que le filet
    imprimé, et les derniers mots débordaient sur la colonne d'à côté. */
function ecrireCapacite(formulaire, police, nom, texteComplet) {
  const champ = champDeTexte(formulaire, nom);
  if (!champ) return;
  const propre = nettoyerWinAnsi(texteComplet || '');
  if (!propre) { champ.setText(''); return; }
  const visible = texteQuiRentre(champ, propre, police);
  const taille = tailleQuiRentre(champ, visible, police, TAILLE_CAPACITE_MAX, TAILLE_CAPACITE_MIN);
  const boite = boiteDuChamp(champ);
  champ.enableMultiline();
  champ.setText(boite ? couper(visible, police, taille, boite.largeur).join('\n') : visible);
  fixerTaille(champ, taille);
}

/** Champ multiligne ordinaire (description, équipement) : texte coupé aux mots si besoin. */
function ecrireMultiligne(formulaire, police, nom, texte, tailleMax) {
  const champ = champDeTexte(formulaire, nom);
  if (!champ) return;
  const propre = nettoyerWinAnsi(texte || '');
  champ.enableMultiline();
  if (!propre) { champ.setText(''); return; }
  const taille = tailleQuiRentre(champ, propre, police, tailleMax || 7);
  const boite = boiteDuChamp(champ);
  let lignes = boite ? couper(propre, police, taille, boite.largeur) : [propre];
  const lignesMax = boite ? Math.max(1, Math.floor(boite.hauteur / (taille * 1.16))) : lignes.length;
  if (lignes.length > lignesMax) {
    lignes = lignes.slice(0, lignesMax);
    lignes[lignes.length - 1] = lignes[lignes.length - 1].replace(/\s+\S*$/, '') + ' […]';
  }
  champ.setText(lignes.join('\n'));
  fixerTaille(champ, taille);
}

function champDeTexte(formulaire, nom) {
  if (!nom) return null;
  try {
    return formulaire.getTextField(nom);
  } catch (e) {
    console.warn('champ absent :', nom);
    return null;
  }
}

if (typeof window !== 'undefined') window.pdf = pdf;
