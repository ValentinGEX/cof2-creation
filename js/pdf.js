/* Remplissage de la feuille de personnage officielle (assets/feuille.pdf) avec pdf-lib,
   puis ajout d'une page annexe « Histoire de … » avec le portrait.

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
      let texteRang1 = premierParagraphe(rang1.texte);
      if (utiliseVoieDuMage && voiePeuple) {
        texteRang1 += '\n' + voiePeuple.capacites[0].titre + ' ('
          + voiePeuple.nom + ') : ' + premierParagraphe(voiePeuple.capacites[0].texte);
      }
      const sousChoixPeuple = texteSousChoix(etat, DATA);
      if (sousChoixPeuple) texteRang1 += '\n' + sousChoixPeuple;
      ecrireMultiligne(formulaire, helvetica, p1.voiePeuple.textes['1'], texteRang1, 7);
      cocher(p1.voiePeuple.cases['1'], true);
      // rang 2 de la voie du mage, s'il a été choisi
      if (utiliseVoieDuMage && etat.voies.rang2Mage && etat.voies.rang2Mage.voie === 'voie-du-mage') {
        const rang2 = DATA.voieDuMage.capacites[1];
        ecrire(p1.voiePeuple.titres['2'], titreAffiche(rang2), 9);
        ecrireMultiligne(formulaire, helvetica, p1.voiePeuple.textes['2'],
          premierParagraphe(rang2.texte), 7);
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
      ecrireMultiligne(formulaire, helvetica, bloc.textes['1'], premierParagraphe(rang1.texte), 7);
      cocher(bloc.cases['1'], true);
      // capacité de rang 2 des mages, si elle est dans cette voie
      if (etat.voies.rang2Mage && etat.voies.rang2Mage.voie === slug) {
        const rang2 = voie.capacites[1];
        ecrire(bloc.titres['2'], titreAffiche(rang2), 9);
        ecrireMultiligne(formulaire, helvetica, bloc.textes['2'], premierParagraphe(rang2.texte), 7);
        cocher(bloc.cases['2'], true);
      }
    }

    // capacité obtenue par un sous-choix (gnome « Don étrange ») : bloc suivant
    const empruntee = d.capacites.find((c) => c.origine === 'sousChoix');
    if (empruntee && colonne < colonnes.length) {
      const bloc = p2.voies[colonnes[colonne++]];
      ecrire(bloc.nomVoie, empruntee.voie.nom, 9);
      ecrire(bloc.titres['1'], titreAffiche(empruntee.capacite), 9);
      ecrireMultiligne(formulaire, helvetica, bloc.textes['1'],
        premierParagraphe(empruntee.capacite.texte), 7);
      cocher(bloc.cases['1'], true);
    }

    /* ---------------------------------------------------------------- page annexe */
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

/* ------------------------------------------------------------------ page annexe */

async function pageAnnexe(doc, etat, DATA, d, police, policeGrasse, portrait) {
  const page = doc.addPage(FORMAT_PAGE);
  const { rgb } = PDFLib;
  const marge = 38;
  const largeur = FORMAT_PAGE[0] - marge * 2;
  let y = FORMAT_PAGE[1] - 52;
  const or = rgb(0.65, 0.49, 0.18);
  const encre = rgb(0.23, 0.18, 0.11);

  page.drawText(nettoyerWinAnsi('Histoire de ' + (etat.nom || 'ce héros')), {
    x: marge, y, size: 17, font: policeGrasse, color: encre,
  });
  y -= 10;
  page.drawLine({
    start: { x: marge, y }, end: { x: marge + largeur, y }, thickness: 1, color: or,
  });
  y -= 20;

  const profil = DATA.profils[etat.profil];
  const peuple = DATA.peuples[etat.peuple];
  page.drawText(nettoyerWinAnsi([peuple.nom, profil.nom.toLowerCase(), 'niveau 1'].join(', ')), {
    x: marge, y, size: 10, font: police, color: encre,
  });
  y -= 22;

  // portrait à droite, s'il y en a un
  let largeurTexte = largeur;
  if (portrait) {
    try {
      const image = await doc.embedJpg(portrait);
      const largeurImage = Math.round(largeur / 3);
      const hauteurImage = Math.round(largeurImage * image.height / image.width);
      page.drawImage(image, {
        x: marge + largeur - largeurImage, y: y - hauteurImage + 8,
        width: largeurImage, height: hauteurImage,
      });
      page.drawRectangle({
        x: marge + largeur - largeurImage, y: y - hauteurImage + 8,
        width: largeurImage, height: hauteurImage,
        borderColor: or, borderWidth: 0.8,
      });
      largeurTexte = largeur - largeurImage - 16;
    } catch (e) {
      console.warn('Portrait non intégré :', e.message);
    }
  }

  const traits = [
    ['Idéal', etat.touche.ideal],
    ['Travers', etat.touche.travers],
    ['Secret', etat.touche.secret],
    ['Bizarrerie', etat.touche.bizarrerie],
  ];
  for (const [libelle, valeur] of traits) {
    if (!valeur) continue;
    page.drawText(nettoyerWinAnsi(libelle), { x: marge, y, size: 9, font: policeGrasse, color: or });
    y -= 12;
    for (const ligne of couper(nettoyerWinAnsi(valeur), police, 10, largeurTexte)) {
      page.drawText(ligne, { x: marge, y, size: 10, font: police, color: encre });
      y -= 13;
    }
    y -= 4;
  }

  y -= 6;
  if (etat.histoire) {
    page.drawText('Son histoire', { x: marge, y, size: 9, font: policeGrasse, color: or });
    y -= 14;
    for (const paragraphe of etat.histoire.split('\n')) {
      if (!paragraphe.trim()) { y -= 8; continue; }
      const largeurCourante = y > (portrait ? FORMAT_PAGE[1] - 300 : 0) ? largeurTexte : largeur;
      for (const ligne of couper(nettoyerWinAnsi(paragraphe), police, 10.5, largeurCourante)) {
        if (y < 50) return;
        page.drawText(ligne, { x: marge, y, size: 10.5, font: police, color: encre });
        y -= 14;
      }
      y -= 4;
    }
  }
}

/* ------------------------------------------------------------------ textes composés */

/** Les cases de la feuille sont petites : on y met le premier paragraphe de la capacité,
    celui qui porte la règle ; les exemples et les variantes restent dans l'application. */
function premierParagraphe(texte) {
  return String(texte || '').split('\n')[0];
}

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

/** Fixe la taille de police du champ. Certains champs de cette feuille (« Niv ») n'ont pas
    d'apparence par défaut : pdf-lib refuse alors setFontSize, on lui en donne une. */
function ajusterTaille(champ, texte, police, max) {
  const taille = tailleQuiRentre(champ, texte, police, max);
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

const TAILLE_MINIMALE = 4;

/** Plus grande taille de police (≤ max) qui fait tenir le texte dans le champ. */
function tailleQuiRentre(champ, texte, police, max) {
  const boite = boiteDuChamp(champ);
  if (!boite) return max;
  for (let taille = max; taille >= TAILLE_MINIMALE; taille -= 0.5) {
    const lignes = couper(texte, police, taille, boite.largeur);
    if (lignes.length * taille * 1.16 <= boite.hauteur) return taille;
  }
  return TAILLE_MINIMALE;
}

function boiteDuChamp(champ) {
  const widgets = champ.acroField.getWidgets();
  if (!widgets.length) return null;
  const rect = widgets[0].getRectangle();
  return { largeur: Math.max(10, rect.width - 4), hauteur: Math.max(6, rect.height - 2) };
}

/** Coupe un texte trop long pour le champ, même à la taille minimale (les capacités
    entières restent lisibles dans l'application et dans le livre). */
function tronquerPourChamp(champ, texte, police) {
  const boite = boiteDuChamp(champ);
  if (!boite) return texte;
  const lignesMax = Math.floor(boite.hauteur / (TAILLE_MINIMALE * 1.16));
  const lignes = couper(texte, police, TAILLE_MINIMALE, boite.largeur);
  if (lignes.length <= lignesMax) return texte;
  const gardees = lignes.slice(0, Math.max(1, lignesMax));
  const dernier = gardees.pop().replace(/\s+\S*$/, '');
  gardees.push(dernier + ' […]');
  return gardees.join(' ');
}

/** Champ multiligne : on active le retour à la ligne puis on ajuste la taille. */
function ecrireMultiligne(formulaire, police, nom, texte, tailleMax) {
  if (!nom) return;
  let champ;
  try { champ = formulaire.getTextField(nom); } catch (e) { console.warn('champ absent :', nom); return; }
  const propre = tronquerPourChamp(champ, nettoyerWinAnsi(texte || ''), police);
  champ.enableMultiline();
  champ.setText(propre);
  if (propre) ajusterTaille(champ, propre, police, tailleMax || 7);
}

if (typeof window !== 'undefined') window.pdf = pdf;
