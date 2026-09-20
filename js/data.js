/* Chargement des données. Tous les fichiers de data/ sont récupérés en parallèle, puis
   assemblés en un objet DATA figé : les textes de règles viennent du DRS officiel et du
   livre, les compléments structurés (équipement, effets, modificateurs) de la revue
   consignée dans tools/revue/ et fusionnée par tools/fusion_revue.py. */

const SLUGS_PROFILS = ['arquebusier', 'barde', 'rodeur', 'voleur', 'barbare', 'chevalier',
  'guerrier', 'ensorceleur', 'forgesort', 'magicien', 'sorcier', 'druide', 'moine', 'pretre'];
const SLUGS_PEUPLES = ['demi-elfe', 'demi-orc', 'elfe-haut', 'elfe-sylvain', 'gnome',
  'halfelin', 'humain', 'nain'];

/* Préfixe des données : l'application est servie à la racine, la page de tests est dans
   tests/ et passe donc window.BASE_DONNEES = '../'. */
function base() {
  return (typeof window !== 'undefined' && window.BASE_DONNEES) || '';
}

async function chargerJSON(chemin) {
  const reponse = await fetch(base() + chemin, { cache: 'no-cache' });
  if (!reponse.ok) throw new Error('Impossible de charger ' + chemin + ' (' + reponse.status + ')');
  return reponse.json();
}

function parSlug(liste) {
  const index = {};
  for (const item of liste) index[item.slug] = item;
  return index;
}

function figer(objet) {
  Object.freeze(objet);
  for (const cle of Object.keys(objet)) {
    const valeur = objet[cle];
    if (valeur && typeof valeur === 'object' && !Object.isFrozen(valeur)) figer(valeur);
  }
  return objet;
}

async function loadAll() {
  const [familles, resumes, creation, aide, tables, armes, armures, voieDuMage,
    effets, complements] = await Promise.all([
    chargerJSON('data/familles.json'),
    chargerJSON('data/resumes.json'),
    chargerJSON('data/creation.json'),
    chargerJSON('data/aide.json'),
    chargerJSON('data/tables.json'),
    chargerJSON('data/armes.json'),
    chargerJSON('data/armures.json'),
    chargerJSON('data/voie-du-mage.json'),
    chargerJSON('data/effets.json'),
    chargerJSON('data/complements.json'),
  ]);

  const profilsBruts = await Promise.all(
    SLUGS_PROFILS.map((s) => chargerJSON('data/profils/' + s + '.json')));
  const peuplesBruts = await Promise.all(
    SLUGS_PEUPLES.map((s) => chargerJSON('data/peuples/' + s + '.json')));

  const profils = {};
  for (const profil of profilsBruts) {
    const resume = resumes.profils[profil.slug] || {};
    const equipement = (complements.equipement && complements.equipement[profil.slug]) || {};
    profils[profil.slug] = Object.assign({}, profil, {
      resume: resume.resume || null,
      caracsCles: resume.caracsCles || [],
      caracsClesTexte: resume.caracsClesTexte || null,
      caracMagie: resume.caracMagie || null,
      armureMax: equipement.armureMax !== undefined ? equipement.armureMax : null,
      bouclier: !!equipement.bouclier,
      citationArmure: equipement.citationArmure || null,
      equipement: equipement.equipement || [],
    });
  }

  const peuples = {};
  const parSlugPeuple = {};
  for (const peuple of peuplesBruts) parSlugPeuple[peuple.slug] = peuple;
  for (const peuple of peuplesBruts) {
    const resume = resumes.peuples[peuple.slug] || {};
    const complement = (complements.peuples && complements.peuples[peuple.slug]) || {};
    const ages = tables.ages[peuple.slug] || [];
    const mensurations = tables.tailles[peuple.slug] || {};
    // Le DRS ne liste pas de noms de demi-elfe : « un prénom elfique et un nom de famille
    // humain ». On propose donc les prénoms des deux peuples elfes.
    let noms = peuple.noms;
    if (peuple.slug === 'demi-elfe' && (!noms.masculin || !noms.masculin.length)) {
      const haut = parSlugPeuple['elfe-haut'].noms;
      const sylvain = parSlugPeuple['elfe-sylvain'].noms;
      noms = {
        intro: noms.intro,
        masculin: haut.masculin.concat(sylvain.masculin),
        feminin: haut.feminin.concat(sylvain.feminin),
        empruntes: true,
      };
    }
    peuples[peuple.slug] = Object.assign({}, peuple, {
      noms,
      resume: resume.resume || null,
      profilsTypiques: resume.profilsTypiques || [],
      modificateurs: complement.modificateurs || [],
      langues: complement.langues || [],
      reperes: Object.assign({}, peuple.reperes, {
        ageDepart: ages[0], esperanceVie: ages[1],
        tailleCm: mensurations.tailleCm, poidsKg: mensurations.poidsKg,
      }),
    });
  }

  return figer({
    familles, creation, aide, tables, voieDuMage, profils, peuples,
    armes: parSlug(armes),
    armures: parSlug(armures),
    listeArmes: armes,
    listeArmures: armures,
    effets,
    sousChoix: complements.sousChoix || {},
    slugsProfils: SLUGS_PROFILS,
    slugsPeuples: SLUGS_PEUPLES,
  });
}

if (typeof window !== 'undefined') {
  window.loadAll = loadAll;
  window.SLUGS_PROFILS = SLUGS_PROFILS;
  window.SLUGS_PEUPLES = SLUGS_PEUPLES;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadAll, SLUGS_PROFILS, SLUGS_PEUPLES, figer, parSlug };
}
