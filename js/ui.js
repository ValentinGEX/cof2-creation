/* Petits outils d'affichage communs à tous les écrans : création d'éléments, cartes,
   infobulles « ? », blocs repliables, images avec visuel de secours. Aucun framework. */

const ui = {

  /** el('p', { class: 'x' }, 'texte' | [enfants]) */
  el(balise, attributs, enfants) {
    const noeud = document.createElement(balise);
    for (const cle of Object.keys(attributs || {})) {
      const valeur = attributs[cle];
      if (valeur === null || valeur === undefined || valeur === false) continue;
      if (cle === 'class') noeud.className = valeur;
      else if (cle === 'html') noeud.innerHTML = valeur;
      else if (cle.startsWith('on') && typeof valeur === 'function') {
        noeud.addEventListener(cle.slice(2), valeur);
      } else if (valeur === true) noeud.setAttribute(cle, '');
      else noeud.setAttribute(cle, valeur);
    }
    ui.ajouter(noeud, enfants);
    return noeud;
  },

  ajouter(parent, enfants) {
    if (enfants === null || enfants === undefined) return parent;
    const liste = Array.isArray(enfants) ? enfants : [enfants];
    for (const enfant of liste) {
      if (enfant === null || enfant === undefined || enfant === false) continue;
      parent.appendChild(typeof enfant === 'string' || typeof enfant === 'number'
        ? document.createTextNode(String(enfant)) : enfant);
    }
    return parent;
  },

  vider(noeud) {
    while (noeud.firstChild) noeud.removeChild(noeud.firstChild);
    return noeud;
  },

  /** Un texte du livre, découpé en paragraphes (les puces « • » deviennent une liste). */
  paragraphes(texte, classe) {
    const bloc = ui.el('div', { class: classe || '' });
    const lignes = String(texte || '').split('\n').filter((l) => l.trim());
    let liste = null;
    for (const ligne of lignes) {
      if (ligne.trim().startsWith('•')) {
        if (!liste) { liste = ui.el('ul'); bloc.appendChild(liste); }
        liste.appendChild(ui.el('li', {}, ligne.replace(/^\s*•\s*/, '')));
      } else {
        liste = null;
        bloc.appendChild(ui.el('p', {}, ligne));
      }
    }
    return bloc;
  },

  titre(texte, niveau) {
    return ui.el('h' + (niveau || 2), {}, texte);
  },

  /* ---------------------------------------------------------------- infobulles */

  /** Bouton « ? » : affiche un texte court au survol et au clavier. */
  aide(titre, texte, source) {
    if (!texte) return null;
    const bouton = ui.el('button', {
      type: 'button', class: 'aide', 'aria-label': 'Aide : ' + titre, tabindex: '0',
    }, '?');
    const montrer = () => ui.montrerInfobulle(bouton, titre, texte, source);
    bouton.addEventListener('mouseenter', montrer);
    bouton.addEventListener('focus', montrer);
    bouton.addEventListener('mouseleave', ui.cacherInfobulle);
    bouton.addEventListener('blur', ui.cacherInfobulle);
    bouton.addEventListener('click', (e) => { e.preventDefault(); montrer(); });
    return bouton;
  },

  /** Raccourci : infobulle d'une caractéristique ou d'un terme de data/aide.json. */
  aideDonnee(DATA, cle) {
    const carac = DATA.aide.caracs[cle];
    if (carac) {
      return ui.aide(carac.titre, carac.texte + '\n\nActions type : ' + carac.actionsType,
        'Livre, p. ' + carac.page);
    }
    const terme = DATA.aide.termes[cle];
    if (terme) return ui.aide(terme.titre, terme.texte, 'Livre, p. ' + terme.page);
    return null;
  },

  montrerInfobulle(ancre, titre, texte, source) {
    const bulle = document.getElementById('infobulle');
    ui.vider(bulle);
    bulle.appendChild(ui.el('h4', {}, titre));
    ui.ajouter(bulle, ui.paragraphes(texte));
    if (source) bulle.appendChild(ui.el('span', { class: 'source' }, source));
    bulle.hidden = false;
    const r = ancre.getBoundingClientRect();
    const largeur = Math.min(bulle.offsetWidth, window.innerWidth - 24);
    let gauche = r.left + window.scrollX;
    if (gauche + largeur > window.scrollX + window.innerWidth - 12) {
      gauche = window.scrollX + window.innerWidth - largeur - 12;
    }
    bulle.style.left = Math.max(12, gauche) + 'px';
    bulle.style.top = (r.bottom + window.scrollY + 6) + 'px';
  },

  cacherInfobulle() {
    const bulle = document.getElementById('infobulle');
    bulle.hidden = true;
  },

  /* ---------------------------------------------------------------- blocs */

  /** « Lire l'extrait du livre » : long texte replié par défaut. */
  repliable(titre, contenu, ouvert) {
    const bloc = ui.el('details', { class: 'bloc-repliable', open: !!ouvert });
    bloc.appendChild(ui.el('summary', {}, titre));
    const corps = ui.el('div');
    ui.ajouter(corps, typeof contenu === 'string' ? ui.paragraphes(contenu) : contenu);
    bloc.appendChild(corps);
    return bloc;
  },

  encadre(contenu, classe) {
    const bloc = ui.el('div', { class: 'encadre ' + (classe || '') });
    ui.ajouter(bloc, typeof contenu === 'string' ? ui.paragraphes(contenu) : contenu);
    return bloc;
  },

  /* ---------------------------------------------------------------- cartes */

  /** Carte cliquable (profil, peuple, voie…). */
  carte(options) {
    const bouton = ui.el('button', {
      type: 'button', class: 'carte', 'aria-pressed': options.selectionnee ? 'true' : 'false',
      onclick: options.onClick,
    });
    bouton.appendChild(ui.el('h3', {}, options.titre));
    if (options.resume) bouton.appendChild(ui.el('p', { class: 'resume' }, options.resume));
    if (options.detail) bouton.appendChild(ui.el('p', { class: 'caracs-cles' }, options.detail));
    if (options.image) bouton.appendChild(ui.image(options.image, options.titre));
    return bouton;
  },

  /** Image de carte ; si le fichier manque, on affiche un visuel de secours. */
  image(chemin, alt) {
    const secours = ui.el('div', { class: 'carte-image carte-image-absente' },
      ['✦ ' + alt + ' ✦']);
    const img = ui.el('img', { class: 'carte-image', src: chemin, alt, loading: 'lazy' });
    img.addEventListener('error', () => { if (img.parentNode) img.parentNode.replaceChild(secours, img); });
    return img;
  },

  /* ---------------------------------------------------------------- divers */

  separateur() {
    return ui.el('div', { class: 'separateur-orne' }, '❦');
  },

  signe(n) {
    return (n > 0 ? '+' : '') + n;
  },

  /** Choix par boutons (radio visuels). */
  boutonsChoix(options, valeurCourante, onChoix) {
    const ligne = ui.el('div', { class: 'tirage' });
    for (const option of options) {
      ligne.appendChild(ui.el('button', {
        type: 'button',
        class: 'bouton bouton-petit ' + (option.valeur === valeurCourante ? '' : 'bouton-secondaire'),
        onclick: () => onChoix(option.valeur),
      }, option.libelle));
    }
    return ligne;
  },
};

if (typeof window !== 'undefined') window.ui = ui;
