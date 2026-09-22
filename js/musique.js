/* Musique d'ambiance, allumée ou coupée depuis la vignette en bas à droite.

   Les navigateurs interdisent le son tant que le joueur n'a rien cliqué : la vignette
   démarre donc toujours éteinte. Si le joueur l'avait allumée lors d'une visite précédente,
   on rallume au premier clic qu'il fait dans la page, quel qu'il soit. */

const CLE_MUSIQUE = 'cof2.musique.v1';
const VOLUME_MUSIQUE = 0.35;

const musique = {
  audio: null,
  bouton: null,
  enMarche: false,

  init() {
    const bloc = document.getElementById('musique');
    musique.audio = document.getElementById('musique-audio');
    musique.bouton = document.getElementById('musique-bouton');
    if (!bloc || !musique.audio || !musique.bouton) return;

    musique.audio.volume = VOLUME_MUSIQUE;
    bloc.hidden = false;
    musique.bouton.addEventListener('click', () => musique.basculer());
    musique.afficher();

    // le joueur avait la musique allumée : on la reprend dès son premier geste
    if (musique.souhaitee()) musique.reprendreAuPremierGeste();
  },

  souhaitee() {
    try { return localStorage.getItem(CLE_MUSIQUE) === 'oui'; } catch (e) { return false; }
  },

  retenir(valeur) {
    try { localStorage.setItem(CLE_MUSIQUE, valeur ? 'oui' : 'non'); } catch (e) { /* tant pis */ }
  },

  basculer() {
    if (musique.enMarche) {
      musique.audio.pause();
      musique.enMarche = false;
      musique.retenir(false);
      musique.afficher();
      return;
    }
    musique.jouer(true);
  },

  /** Lance la lecture. `volontaire` distingue le clic sur la vignette d'une reprise
      automatique : en cas d'échec, seul le clic mérite un message. */
  jouer(volontaire) {
    const promesse = musique.audio.play();
    if (!promesse || !promesse.catch) {
      musique.enMarche = true;
      musique.retenir(true);
      musique.afficher();
      return;
    }
    promesse.then(() => {
      musique.enMarche = true;
      musique.retenir(true);
      musique.afficher();
    }).catch((e) => {
      musique.enMarche = false;
      musique.afficher();
      if (volontaire) {
        musique.bouton.title = 'La musique n’a pas pu démarrer : ' + e.message;
      }
    });
  },

  reprendreAuPremierGeste() {
    const demarrer = () => {
      document.removeEventListener('pointerdown', demarrer);
      document.removeEventListener('keydown', demarrer);
      if (!musique.enMarche && musique.souhaitee()) musique.jouer(false);
    };
    document.addEventListener('pointerdown', demarrer);
    document.addEventListener('keydown', demarrer);
  },

  afficher() {
    musique.bouton.classList.toggle('muet', !musique.enMarche);
    musique.bouton.setAttribute('aria-pressed', musique.enMarche ? 'true' : 'false');
    musique.bouton.title = musique.enMarche ? 'Couper la musique' : 'Mettre la musique';
  },
};

if (typeof window !== 'undefined') window.musique = musique;
