#!/usr/bin/env python3
"""Construit assets/fields-map.json (rôle logique -> nom de champ PDF) à partir du
relevé produit par tools/dump_fields.html (champs-bruts.json).
Usage : python3 tools/build_fields_map.py <chemin/champs-bruts.json>"""
import json, sys, datetime, os

brut = json.load(open(sys.argv[1]))
noms = {c["nom"] for c in brut}
manquants = []

def n(nom):
    if nom not in noms:
        manquants.append(nom)
    return nom

CARACS = ["AGI", "CON", "FOR", "PER", "CHA", "INT", "VOL"]
# page 2 : 6 blocs de voies. Colonnes "1","2","3" en haut, "4","5","P" en bas.
# Cases : undefined_19.. en haut (3 par rang), undefined_34.. en bas.
def bloc(col, base, pos):
    cases = {}
    for rang in range(1, 6):
        cases[str(rang)] = n("undefined_%d" % (base + (rang - 1) * 3 + pos))
    titres, textes = {}, {}
    for rang in range(1, 6):
        titres[str(rang)] = n("Titre Rang %d_%s" % (rang, col))
        # coquille de la feuille : le texte du rang 3 de la voie 2 s'appelle « Rang 3__2 »
        textes[str(rang)] = n("Rang 3__2" if (rang == 3 and col == "2") else "Rang %d_%s" % (rang, col))
    return {"nomVoie": n({"1": "VOIE1", "2": "VOIE2", "3": "VOIE3", "4": "VOIE4",
                          "5": "VOIE5", "P": "VOIE PRESTIGE"}[col]),
            "cases": cases, "titres": titres, "textes": textes}

carte = {
  "_lisezMoi": [
    "Carte des champs de la feuille officielle COF2 (assets/feuille.pdf), produite par",
    "tools/dump_fields.html puis tools/build_fields_map.py. Les noms sont ceux du PDF.",
    "La feuille a été ré-enregistrée par Aperçu : /AcroForm/Fields liste des copies",
    "orphelines, il faut appeler reparerChamps() (js/pdf-repair.js) après PDFDocument.load,",
    "sinon le remplissage n'apparaît pas à l'écran.",
    "Sur la page 1, le petit champ marqué MAX du bloc PTS DE VIGUEUR s'appelle « PV » et",
    "le grand champ à côté « PV MAX » (noms inversés par rapport au visuel) ; on écrit la",
    "même valeur dans les deux au niveau 1.",
    "Les cases « undefined_NN » de la page 2 sont les cases de rang des six blocs de voies ;",
    "plusieurs sont cochées à l'origine, il faut toutes les remettre à zéro."
  ],
  "genere": datetime.date.today().isoformat(),
  "format": [473.386, 609.449],
  "page1": {
    "nomPersonnage": n("NOM PERSONNAGE"),
    "joueur": n("JOUEUR"),
    "niveau": n("NIVEAU"),
    "niveauAttaques": n("Niv"),
    "famille": n("FAMILLE"),
    "profil": n("PROFIL"),
    "ideal": n("IDÉAL HÉROÎQUE"),
    "travers": n("TRAVERS"),
    "init": n("INIT"),
    "def": n("DEF"),
    "pvMax": n("PV"),
    "pvActuels": n("PV MAX"),
    "pcMax": n("PCmax"),
    "drType": n("TypeDR"),
    "drMax": n("DRmax"),
    "pmMax": n("PM MAX"),
    "pmActuels": n("PM"),
    "caracs": {c: n(c) for c in CARACS},
    "notes": {c: n("NOTES " + c) for c in CARACS},
    "attaques": {"contact": n("Contact"), "distance": n("Dist"), "magique": n("Mag")},
    "modsAttaque": {"contact": n("mFOR"), "distance": n("mAGI"), "magique": n("mVOL")},
    "armes": [
      {"nom": n("ARME 1"), "att": n("ATT1"), "dm": n("DM1"), "special": n("SPÉCIALPORTÉE")},
      {"nom": n("ARME 2"), "att": n("ATT2"), "dm": n("DM2"), "special": n("SPÉCIALPORTÉE_2")},
      {"nom": n("ARME 3"), "att": n("ATT3"), "dm": n("DM3"), "special": n("SPÉCIALPORTÉE_3")}
    ],
    "equipement": n("EQUIPEMENT"),
    "voiePeuple": {
      "nomVoie": n("PEUPLE"),
      "cases": {"1": n("Rang 1"), "2": n("Rang 2"), "3": n("Rang 3_2"), "4": n("Rang 4"), "5": n("Rang 5")},
      "titres": {str(r): n("PEUPLE RG%d" % r) for r in range(1, 6)},
      "textes": {str(r): n("VP RG%d" % r) for r in range(1, 6)}
    }
  },
  "page2": {
    "description": n("DESCRIPTION DU PERSONNAGE"),
    "voies": {
      "1": bloc("1", 19, 0), "2": bloc("2", 19, 1), "3": bloc("3", 19, 2),
      "4": bloc("4", 34, 0), "5": bloc("5", 34, 1), "P": bloc("P", 34, 2)
    }
  }
}

# toutes les cases de rang, pour la remise à zéro
toutes_cases = [c["nom"] for c in brut if c["type"] == "CheckBox"]
carte["toutesLesCases"] = sorted(set(toutes_cases))

if manquants:
    print("CHAMPS INTROUVABLES DANS LE PDF :", manquants)
    sys.exit(1)

# contrôle : toutes les cases utilisées dans la carte
utilisees = set(carte["page1"]["voiePeuple"]["cases"].values())
for b in carte["page2"]["voies"].values():
    utilisees |= set(b["cases"].values())
inutilisees = sorted(set(toutes_cases) - utilisees)
print("cases du PDF :", len(set(toutes_cases)), "| utilisées dans la carte :", len(utilisees),
      "| non attribuées :", inutilisees)

dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "fields-map.json")
json.dump(carte, open(dest, "w"), ensure_ascii=False, indent=1)
print("écrit :", dest)
