/* Dés virtuels. Le tirage utilise crypto.getRandomValues quand il est disponible, et
   l'affichage fait rouler le dé une demi-seconde avant de montrer le résultat. */

const dice = {

  /** Un dé de `faces` faces. */
  d(faces) {
    if (window.crypto && window.crypto.getRandomValues) {
      const tirages = new Uint32Array(1);
      const limite = Math.floor(0xffffffff / faces) * faces;
      let valeur;
      do {
        window.crypto.getRandomValues(tirages);
        valeur = tirages[0];
      } while (valeur >= limite);
      return (valeur % faces) + 1;
    }
    return Math.floor(Math.random() * faces) + 1;
  },

  /** roll(2, 6) → { des: [3, 5], total: 8 } */
  roll(nombre, faces) {
    const des = [];
    for (let i = 0; i < nombre; i++) des.push(dice.d(faces));
    return { des, total: des.reduce((a, b) => a + b, 0) };
  },

  /** Entier uniforme entre min et max inclus (taille, poids, âge). */
  entre(min, max) {
    return min + dice.d(max - min + 1) - 1;
  },

  /** Un élément au hasard dans une liste. */
  dansListe(liste) {
    return liste[dice.d(liste.length) - 1];
  },

  /** Bouton de tirage animé. onResultat reçoit { des, total }. */
  bouton(libelle, nombre, faces, onResultat, options) {
    const opts = options || {};
    const affichage = ui.el('span', { class: 'de' }, opts.valeurInitiale || '?');
    const bouton = ui.el('button', {
      type: 'button', class: 'bouton bouton-petit', onclick: () => lancer(),
    }, libelle);
    const ligne = ui.el('div', { class: 'tirage' }, [bouton, affichage]);

    function lancer() {
      bouton.disabled = true;
      affichage.classList.add('roule');
      const resultat = dice.roll(nombre, faces);
      let restant = 6;
      const minuterie = setInterval(() => {
        affichage.textContent = dice.d(faces);
        if (--restant <= 0) {
          clearInterval(minuterie);
          affichage.classList.remove('roule');
          affichage.textContent = nombre > 1 ? resultat.total : resultat.des[0];
          affichage.title = nombre > 1 ? 'Dés : ' + resultat.des.join(' + ') : '';
          bouton.disabled = false;
          onResultat(resultat);
        }
      }, 70);
    }

    ligne.lancer = lancer;
    return ligne;
  },
};

if (typeof window !== 'undefined') window.dice = dice;
if (typeof module !== 'undefined' && module.exports) module.exports = dice;
