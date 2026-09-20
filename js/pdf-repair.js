/* Réparation des feuilles ré-enregistrées par Aperçu (macOS Quartz).
   Dans ces PDF, /AcroForm/Fields liste des copies orphelines des champs, alors que
   les widgets réellement dessinés sont les annotations des pages : remplir les copies
   n'affiche rien. On reconstruit donc /AcroForm/Fields à partir des annotations des
   pages — soit l'annotation elle-même quand elle porte un nom (/T), soit son champ
   parent quand elle n'est qu'un widget (cas du champ « Niv », qui a trois widgets).
   Sans effet sur un PDF sain. Renvoie le nombre de champs rattachés (0 = rien à faire). */
function reparerChamps(pdf) {
  const { PDFName, PDFDict } = PDFLib;
  const acro = pdf.context.lookup(pdf.catalog.get(PDFName.of('AcroForm')));
  if (!acro) return 0;
  const champsActuels = acro.get(PDFName.of('Fields')).asArray();
  const refs = [];
  for (const page of pdf.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (const ref of annots.asArray()) {
      const d = pdf.context.lookup(ref);
      if (!(d instanceof PDFDict)) continue;
      let cible = null;
      if (d.get(PDFName.of('T'))) cible = ref;
      else if (d.get(PDFName.of('Parent'))) cible = d.get(PDFName.of('Parent'));
      if (cible && refs.indexOf(cible) === -1) refs.push(cible);
    }
  }
  if (!refs.length) return 0;
  const dejaBon = refs.every((r) => champsActuels.indexOf(r) !== -1);
  if (dejaBon) return 0;
  acro.set(PDFName.of('Fields'), pdf.context.obj(refs));
  return refs.length;
}
