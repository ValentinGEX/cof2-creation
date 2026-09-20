/* Construction du prompt d'image du personnage, à coller dans ChatGPT.
   Le bloc de style est le même que celui de PROMPTS-IMAGES.md, pour que le portrait du
   joueur s'accorde aux visuels des cartes. Le joueur peut tout modifier avant de copier. */

const BLOC_STYLE = 'Illustration de jeu de rôle fantasy, à la manière des ouvrages de '
  + 'Chroniques Oubliées : peinture numérique détaillée, personnage entier de la tête aux '
  + 'pieds, debout, format portrait 2:3, palette chaude (ocre, brun, or), fond sobre et '
  + 'légèrement texturé façon parchemin, pas de texte, pas de cadre.';

function buildImagePrompt(etat, DATA) {
  const profil = DATA.profils[etat.profil];
  const peuple = DATA.peuples[etat.peuple];
  const d = rules.computeDerived(etat, DATA);
  const morceaux = [];

  // tournure neutre pour éviter les accords hasardeux d'un peuple à l'autre
  const silhouette = etat.touche.genre === 'F' ? 'Une femme' :
    etat.touche.genre === 'M' ? 'Un homme' : 'Un personnage';
  const accord = etat.touche.genre === 'F' ? 'e' : '';
  morceaux.push(silhouette + ' du peuple ' + peuple.nom.toLowerCase() + ', '
    + profil.nom.toLowerCase() + ' de niveau 1'
    + (etat.nom ? ', nommé' + accord + ' ' + etat.nom : '') + '.');

  if (peuple.reperes && peuple.reperes.traits) {
    morceaux.push('Traits de son peuple : ' + peuple.reperes.traits);
  }
  const mensurations = [];
  if (etat.touche.age) mensurations.push(etat.touche.age + ' ans');
  if (etat.touche.tailleCm) mensurations.push((etat.touche.tailleCm / 100).toFixed(2).replace('.', ',') + ' m');
  if (etat.touche.poidsKg) mensurations.push(etat.touche.poidsKg + ' kg');
  if (mensurations.length) morceaux.push(mensurations.join(', ') + '.');

  if (etat.touche.description) morceaux.push('Apparence : ' + etat.touche.description);

  const equipement = rules.equipementResolu(etat, DATA);
  const armes = equipement.filter((o) => o.type === 'arme')
    .map((o) => o.nom.toLowerCase() + (o.qte > 1 ? ' (×' + o.qte + ')' : ''));
  const protections = equipement.filter((o) => o.type === 'armure' || o.type === 'bouclier')
    .map((o) => o.nom.toLowerCase());
  if (armes.length) morceaux.push('Armes visibles : ' + armes.join(', ') + '.');
  if (protections.length) morceaux.push('Protection : ' + protections.join(', ') + '.');
  if (etat.equipement.libre) morceaux.push('Détail à montrer : ' + etat.equipement.libre + '.');

  const caractere = [];
  if (etat.touche.ideal) caractere.push('son idéal est ' + etat.touche.ideal.toLowerCase());
  if (etat.touche.travers) caractere.push('son travers : ' + etat.touche.travers.toLowerCase());
  if (caractere.length) morceaux.push('Attitude : ' + caractere.join(', ') + '.');
  if (etat.touche.bizarrerie) {
    morceaux.push('Détail à faire deviner si c’est visible : ' + etat.touche.bizarrerie);
  }

  const sorts = d.sorts.map((s) => s.titre.toLowerCase());
  if (sorts.length) morceaux.push('Pratique la magie : ' + sorts.join(', ') + '.');

  return BLOC_STYLE + '\n\n' + morceaux.join('\n');
}

if (typeof window !== 'undefined') {
  window.buildImagePrompt = buildImagePrompt;
  window.BLOC_STYLE = BLOC_STYLE;
}
